import { notFound, redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/queries";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminRole } from "@/lib/permissions";
import { fechaLarga, membreteDe, puedeVerUnidad } from "@/lib/documentos";
import { numeroRecibo, pendienteDe } from "@/lib/cuotas";
import { bs, tasa, usd } from "@/lib/format";
import { montoEnLetras } from "@/lib/letras";
import { PAYMENT_METHOD_LABELS } from "@/lib/labels";
import { todayInTimeZone } from "@/lib/utils";
import { estadoDeCuenta } from "@/lib/contabilidad/estado-cuenta";
import { Dato, Documento } from "@/components/documentos/documento";

type Fila = {
  id: string;
  amount: number;
  amount_bs: number | null;
  exchange_rate: number | null;
  payment_method: string;
  reference: string | null;
  paid_at: string;
  created_at: string;
  status: string;
  rejection_reason: string | null;
  payment_group_id: string | null;
  invoices: { id: string; unit_id: string; organization_id: string; description: string; receipt_number: number | null; amount: number; paid_amount: number | null; status: string } | null;
};

const CAMPOS =
  "id, amount, amount_bs, exchange_rate, payment_method, reference, paid_at, created_at, status, rejection_reason, payment_group_id, invoices!inner(id, unit_id, organization_id, description, receipt_number, amount, paid_amount, status)";

/**
 * Comprobante de pago: lo que el condominio recibió en UN pago, con sus
 * bolívares y su tasa, los recibos que cubrió y lo que la unidad queda
 * debiendo. A diferencia de la constancia, sale también cuando el pago es un
 * abono que no completa el recibo.
 */
export default async function ComprobantePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) redirect("/login");

  const db = createAdminClient();
  const { data: base } = await db.from("transactions").select(CAMPOS).eq("id", id).maybeSingle<Fila>();
  const recibo = base?.invoices ?? null;
  if (!base || !recibo || base.payment_method === "credit") notFound();
  const anulado = base.status === "rejected" && (base.rejection_reason ?? "").startsWith("Abono anulado");
  if (base.status !== "approved" && !anulado) notFound();
  if (!(await puedeVerUnidad(profile, recibo.unit_id))) notFound();

  // Las demás filas del mismo pago: un pago puede cubrir varios recibos.
  let consulta = db.from("transactions").select(CAMPOS).eq("invoices.unit_id", recibo.unit_id).eq("status", base.status).neq("payment_method", "credit");
  consulta = base.payment_group_id
    ? consulta.eq("payment_group_id", base.payment_group_id)
    : consulta.eq("paid_at", base.paid_at).eq("created_at", base.created_at).eq("payment_method", base.payment_method);
  const { data: grupo } = await consulta.returns<Fila[]>();
  const filas = (grupo ?? []).filter((f) => f.invoices && (base.payment_group_id || f.reference === base.reference));
  if (!filas.some((f) => f.id === base.id)) filas.push(base);
  filas.sort((a, b) => (a.invoices!.receipt_number ?? 0) - (b.invoices!.receipt_number ?? 0) || a.invoices!.description.localeCompare(b.invoices!.description));

  const [membrete, cuenta, { data: unidad }] = await Promise.all([
    membreteDe(recibo.organization_id),
    estadoDeCuenta(db, recibo.unit_id),
    db.from("units").select("unit_number, block").eq("id", recibo.unit_id).maybeSingle(),
  ]);
  const hoy = todayInTimeZone(membrete.timezone);
  const total = Math.round(filas.reduce((s, f) => s + Number(f.amount), 0) * 100) / 100;
  const conBs = filas.every((f) => f.amount_bs != null);
  const totalBs = conBs ? Math.round(filas.reduce((s, f) => s + Number(f.amount_bs), 0) * 100) / 100 : null;
  const tasaPago = base.exchange_rate != null ? Number(base.exchange_rate) : null;
  const propietarios = (cuenta?.propietarios ?? []).map((p) => p.nombre).filter(Boolean).join(", ");
  const etiquetaUnidad = unidad ? `${unidad.block ? `${unidad.block as string} · ` : ""}${unidad.unit_number as string}` : "—";
  const conceptos = filas.map((f) => f.invoices!.description).join("; ");
  const volver = isAdminRole(profile)
    ? { href: `/admin/cuentas/${recibo.unit_id}`, texto: "Cuenta de la unidad" }
    : { href: "/pagos", texto: "Pagos" };

  return (
    <Documento
      membrete={membrete}
      tipo="Comprobante de pago"
      numero={base.id.slice(0, 8).toUpperCase()}
      fecha={`Pago del ${fechaLarga(base.paid_at, membrete.timezone)}`}
      volver={volver}
      sello={anulado ? { texto: "Anulado", tono: "anulado" } : null}
      pie="Este comprobante deja constancia de un pago recibido y aplicado por la administración. Los bolívares se calculan con la tasa oficial del BCV del día del pago."
    >
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
        <Dato etiqueta="UNIDAD">{etiquetaUnidad}</Dato>
        <Dato etiqueta="PROPIETARIO">{propietarios || "—"}</Dato>
        <Dato etiqueta="REGISTRADO EL">{fechaLarga(base.created_at, membrete.timezone)}</Dato>
      </dl>

      <p className="mt-7 text-[15px] leading-relaxed">
        Hemos recibido{propietarios ? <> de <strong>{propietarios}</strong></> : null}, por la unidad <strong>{etiquetaUnidad}</strong>, la cantidad de{" "}
        <strong>
          {montoEnLetras(total)} ({usd(total)})
        </strong>
        , por concepto de: {conceptos}.
      </p>

      <table className="mt-7 w-full text-[14px]">
        <thead>
          <tr className="border-b border-marine-deep/30 text-left text-[11px] uppercase tracking-[0.06em] text-mute">
            <th className="py-2 font-medium">Forma de pago</th>
            <th className="py-2 font-medium">Fecha</th>
            <th className="py-2 font-medium">Referencia</th>
            <th className="py-2 text-right font-medium">Monto</th>
            <th className="py-2 text-right font-medium">Bolívares</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-border">
            <td className="py-3">{PAYMENT_METHOD_LABELS[base.payment_method] ?? "Pago"}</td>
            <td className="py-3">{fechaLarga(base.paid_at, membrete.timezone)}</td>
            <td className="py-3 font-mono text-[13px]">{base.reference || "—"}</td>
            <td className="py-3 text-right tabular-nums">{usd(total)}</td>
            <td className="py-3 text-right tabular-nums">{totalBs != null ? bs(totalBs) : "—"}</td>
          </tr>
        </tbody>
      </table>
      {totalBs != null && tasaPago != null && (
        <p className="mt-2 text-[13px] text-mute">
          Son {bs(totalBs)} a la tasa BCV de {tasa(tasaPago)} Bs por dólar, la del día del pago.
        </p>
      )}

      <section className="mt-8">
        <p className="font-meta text-mute">RECIBOS QUE CUBRE ESTE PAGO</p>
        <table className="mt-2 w-full text-[13px]">
          <thead>
            <tr className="border-b border-marine-deep/30 text-left text-[11px] uppercase tracking-[0.06em] text-mute">
              <th className="py-2 font-medium">Recibo</th>
              <th className="py-2 font-medium">Concepto</th>
              <th className="py-2 text-right font-medium">Aplicado</th>
              <th className="py-2 text-right font-medium">Queda pendiente</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.id} className="border-b border-border">
                <td className="py-2 whitespace-nowrap font-mono text-[12px]">{numeroRecibo(f.invoices!.receipt_number)}</td>
                <td className="py-2">{f.invoices!.description}</td>
                <td className="py-2 text-right tabular-nums">{usd(Number(f.amount))}</td>
                <td className="py-2 text-right tabular-nums">{f.invoices!.status === "cancelled" ? "—" : usd(pendienteDe(f.invoices!))}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2} className="pt-3 text-right font-meta text-mute">TOTAL PAGADO</td>
              <td className="pt-3 text-right font-display text-[18px] tabular-nums">{usd(total)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </section>

      {anulado ? (
        <p className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-800">{base.rejection_reason}</p>
      ) : (
        cuenta && (
          <p className="mt-6 rounded-xl bg-frost px-4 py-3 text-[14px]">
            La deuda pendiente de la unidad {etiquetaUnidad} al {fechaLarga(hoy)} es de <strong>{usd(cuenta.deuda)}</strong>.
          </p>
        )
      )}

      <div className="mt-14 w-64 border-t border-marine-deep/50 pt-2 text-center text-[12px] text-mute">Firma y sello de la administración</div>
    </Documento>
  );
}
