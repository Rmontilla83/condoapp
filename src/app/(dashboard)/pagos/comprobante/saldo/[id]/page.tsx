import { notFound, redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/queries";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminRole } from "@/lib/permissions";
import { fechaLarga, membreteDe, puedeVerUnidad } from "@/lib/documentos";
import { bs, tasa, usd } from "@/lib/format";
import { montoEnLetras } from "@/lib/letras";
import { PAYMENT_METHOD_LABELS } from "@/lib/labels";
import { todayInTimeZone } from "@/lib/utils";
import { estadoDeCuenta } from "@/lib/contabilidad/estado-cuenta";
import { Dato, Documento } from "@/components/documentos/documento";

/**
 * Comprobante de un pago adelantado: el dinero entró, pero no había un recibo
 * pendiente al que aplicarlo y quedó como saldo a favor de la unidad. Se
 * descuenta solo del próximo recibo que se emita.
 */
export default async function ComprobanteDeSaldoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) redirect("/login");

  const db = createAdminClient();
  const { data: c } = await db
    .from("unit_credits")
    .select("id, organization_id, unit_id, amount, currency, kind, note, created_at, payment_method, reference, paid_at, exchange_rate, amount_bs, payment_group_id")
    .eq("id", id)
    .maybeSingle();
  if (!c || c.kind !== "deposit" || !(Number(c.amount) > 0)) notFound();
  if (!(await puedeVerUnidad(profile, c.unit_id as string))) notFound();

  // Si parte del mismo pago se aplicó a recibos, el comprobante es uno solo: el del pago.
  if (c.payment_group_id) {
    const { data: fila } = await db.from("transactions").select("id").eq("payment_group_id", c.payment_group_id as string).eq("status", "approved").limit(1).maybeSingle();
    if (fila) redirect(`/pagos/comprobante/${fila.id as string}`);
  }

  const [membrete, cuenta, { data: unidad }] = await Promise.all([
    membreteDe(c.organization_id as string),
    estadoDeCuenta(db, c.unit_id as string),
    db.from("units").select("unit_number, block").eq("id", c.unit_id as string).maybeSingle(),
  ]);
  const hoy = todayInTimeZone(membrete.timezone);
  const total = Number(c.amount);
  const fechaPago = (c.paid_at as string | null) ?? (c.created_at as string);
  // Los saldos anteriores a la migration 077 solo guardaron la referencia dentro de la nota.
  const referencia = (c.reference as string | null) ?? ((c.note as string | null) ?? "").match(/\(ref\. ([^)]+)\)/)?.[1] ?? null;
  const metodo = c.payment_method ? (PAYMENT_METHOD_LABELS[c.payment_method as string] ?? "Pago") : "Pago";
  const propietarios = (cuenta?.propietarios ?? []).map((p) => p.nombre).filter(Boolean).join(", ");
  const etiquetaUnidad = unidad ? `${unidad.block ? `${unidad.block as string} · ` : ""}${unidad.unit_number as string}` : "—";
  const volver = isAdminRole(profile)
    ? { href: `/admin/cuentas/${c.unit_id as string}`, texto: "Cuenta de la unidad" }
    : { href: "/pagos", texto: "Pagos" };

  return (
    <Documento
      membrete={membrete}
      tipo="Comprobante de pago"
      numero={(c.id as string).slice(0, 8).toUpperCase()}
      fecha={`${c.paid_at ? "Pago del" : "Registrado el"} ${fechaLarga(fechaPago, membrete.timezone)}`}
      volver={volver}
      pie="Este comprobante deja constancia de un pago recibido por la administración antes de que se emitiera el recibo. Queda como saldo a favor de la unidad y se descuenta del próximo recibo."
    >
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
        <Dato etiqueta="UNIDAD">{etiquetaUnidad}</Dato>
        <Dato etiqueta="PROPIETARIO">{propietarios || "—"}</Dato>
        <Dato etiqueta="REGISTRADO EL">{fechaLarga(c.created_at as string, membrete.timezone)}</Dato>
      </dl>

      <p className="mt-7 text-[15px] leading-relaxed">
        Hemos recibido{propietarios ? <> de <strong>{propietarios}</strong></> : null}, por la unidad <strong>{etiquetaUnidad}</strong>, la cantidad de{" "}
        <strong>
          {montoEnLetras(total)} ({usd(total)})
        </strong>
        , por concepto de: pago adelantado, que queda como saldo a favor de la unidad.
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
            <td className="py-3">{metodo}</td>
            <td className="py-3">{fechaLarga(fechaPago, membrete.timezone)}</td>
            <td className="py-3 font-mono text-[13px]">{referencia || "—"}</td>
            <td className="py-3 text-right tabular-nums">{usd(total)}</td>
            <td className="py-3 text-right tabular-nums">{c.amount_bs != null ? bs(Number(c.amount_bs)) : "—"}</td>
          </tr>
        </tbody>
      </table>
      {c.amount_bs != null && c.exchange_rate != null && (
        <p className="mt-2 text-[13px] text-mute">
          Son {bs(Number(c.amount_bs))} a la tasa BCV de {tasa(Number(c.exchange_rate))} Bs por dólar, la del día del pago.
        </p>
      )}

      <section className="mt-8">
        <p className="font-meta text-mute">A QUÉ SE APLICA ESTE PAGO</p>
        <table className="mt-2 w-full text-[13px]">
          <tbody>
            <tr className="border-b border-border">
              <td className="py-2">Saldo a favor: se descuenta del próximo recibo de la unidad</td>
              <td className="py-2 text-right tabular-nums">{usd(total)}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td className="pt-3 text-right font-meta text-mute">TOTAL PAGADO</td>
              <td className="pt-3 text-right font-display text-[18px] tabular-nums">{usd(total)}</td>
            </tr>
          </tfoot>
        </table>
      </section>

      {cuenta && (
        <p className="mt-6 rounded-xl bg-frost px-4 py-3 text-[14px]">
          Al {fechaLarga(hoy)}, la unidad {etiquetaUnidad} tiene una deuda pendiente de <strong>{usd(cuenta.deuda)}</strong> y un saldo a favor de{" "}
          <strong>{usd(Math.max(cuenta.saldoAFavor, 0))}</strong>.
        </p>
      )}

      <div className="mt-14 w-64 border-t border-marine-deep/50 pt-2 text-center text-[12px] text-mute">Firma y sello de la administración</div>
    </Documento>
  );
}
