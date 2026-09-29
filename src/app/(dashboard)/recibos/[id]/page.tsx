import { notFound, redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/queries";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminRole } from "@/lib/permissions";
import { fechaLarga, membreteDe, puedeVerUnidad } from "@/lib/documentos";
import { ETIQUETA_TIPO, numeroNotaCredito, numeroRecibo, pendienteDe } from "@/lib/cuotas";
import { bs, tasa, usd } from "@/lib/format";
import { PAYMENT_METHOD_LABELS } from "@/lib/labels";
import { todayInTimeZone } from "@/lib/utils";
import { Dato, Documento } from "@/components/documentos/documento";

/**
 * Recibo de condominio. Con su número correlativo y, por la migration 052,
 * inmutable: lo que dice este papel es lo que se emitió.
 */
export default async function ReciboPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) redirect("/login");

  const db = createAdminClient();
  const { data: r } = await db
    .from("invoices")
    .select("id, organization_id, unit_id, receipt_number, description, kind, amount, paid_amount, currency, exchange_rate, amount_bs, due_date, status, created_at, units(unit_number, block, aliquot)")
    .eq("id", id)
    .maybeSingle();
  if (!r || !(await puedeVerUnidad(profile, r.unit_id as string))) notFound();

  const [membrete, { data: pagos }, { data: nota }, { data: duenos }] = await Promise.all([
    membreteDe(r.organization_id as string),
    db
      .from("transactions")
      .select("amount, payment_method, reference, paid_at, reviewed_at, exchange_rate, amount_bs")
      .eq("invoice_id", id)
      .eq("status", "approved")
      .order("paid_at"),
    db.from("credit_notes").select("number, reason, created_at").eq("invoice_id", id).maybeSingle(),
    db.from("unit_members").select("profiles(full_name)").eq("unit_id", r.unit_id as string).eq("role", "owner").eq("active", true),
  ]);
  const u = (Array.isArray(r.units) ? r.units[0] : r.units) as { unit_number: string; block: string | null; aliquot: number | null } | null;
  const propietarios = (duenos ?? [])
    .map((d) => ((Array.isArray(d.profiles) ? d.profiles[0] : d.profiles) as { full_name: string | null } | null)?.full_name)
    .filter(Boolean)
    .join(", ");

  const hoy = todayInTimeZone(membrete.timezone);
  const pendiente = r.status === "cancelled" ? 0 : pendienteDe(r);
  const vencido = pendiente > 0 && (r.due_date as string) < hoy;
  const sello =
    r.status === "cancelled"
      ? { texto: "Anulado", tono: "anulado" as const }
      : r.status === "paid"
        ? { texto: "Pagado", tono: "bien" as const }
        : vencido
          ? { texto: "Vencido", tono: "alerta" as const }
          : null;
  const apertura = r.kind === "opening";
  const volver = isAdminRole(profile)
    ? { href: `/admin/cuentas/${r.unit_id as string}`, texto: "Cuenta de la unidad" }
    : { href: "/pagos", texto: "Pagos" };

  return (
    <Documento
      membrete={membrete}
      tipo={apertura ? "Saldo anterior" : "Recibo de condominio"}
      numero={apertura ? undefined : numeroRecibo(r.receipt_number as number)}
      fecha={`Emitido el ${fechaLarga(r.created_at as string, membrete.timezone)}`}
      volver={volver}
      sello={sello}
      pie={
        apertura
          ? "Deuda registrada al empezar con Atryum, según la planilla de cuentas por cobrar de la administración."
          : "Conforme al artículo 14 de la Ley de Propiedad Horizontal, la liquidación de gastos de condominio tiene fuerza ejecutiva. Este recibo no admite enmiendas: si hubo un error, se anula con una nota de crédito."
      }
    >
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
        <Dato etiqueta="UNIDAD">{u ? `${u.block ? `${u.block} · ` : ""}${u.unit_number}` : "—"}</Dato>
        <Dato etiqueta="PROPIETARIO">{propietarios || "—"}</Dato>
        {u?.aliquot != null && <Dato etiqueta="ALÍCUOTA">{Number(u.aliquot).toLocaleString("es-VE", { maximumFractionDigits: 6 })} %</Dato>}
        <Dato etiqueta="TIPO">{ETIQUETA_TIPO[r.kind as string] ?? "Cuota"}</Dato>
        <Dato etiqueta="VENCE">{fechaLarga(r.due_date as string)}</Dato>
        <Dato etiqueta="MONEDA">{r.currency as string}</Dato>
      </dl>

      <table className="mt-7 w-full text-[14px]">
        <thead>
          <tr className="border-b border-marine-deep/30 text-left text-[11px] uppercase tracking-[0.06em] text-mute">
            <th className="py-2 font-medium">Concepto</th>
            <th className="py-2 text-right font-medium">Monto</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-border">
            <td className="py-3">{r.description as string}</td>
            <td className="py-3 text-right tabular-nums">{usd(Number(r.amount))}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td className="pt-3 text-right font-meta text-mute">TOTAL DEL RECIBO</td>
            <td className="pt-3 text-right font-display text-[20px] tabular-nums">{usd(Number(r.amount))}</td>
          </tr>
          {r.exchange_rate != null && r.amount_bs != null && (
            <tr>
              <td className="pt-1 text-right text-[12px] text-mute">Equivalente a la tasa BCV de emisión ({tasa(Number(r.exchange_rate))})</td>
              <td className="pt-1 text-right text-[13px] tabular-nums text-mute">{bs(Number(r.amount_bs))}</td>
            </tr>
          )}
        </tfoot>
      </table>

      {(pagos ?? []).length > 0 && (
        <section className="mt-8">
          <p className="font-meta text-mute">PAGOS APLICADOS</p>
          <table className="mt-2 w-full text-[13px]">
            <tbody>
              {(pagos ?? []).map((p, i) => (
                <tr key={i} className="border-b border-border">
                  <td className="py-2">{fechaLarga(p.paid_at as string, membrete.timezone)}</td>
                  <td className="py-2">
                    {PAYMENT_METHOD_LABELS[p.payment_method as string] ?? "Pago"}
                    {p.reference && p.payment_method !== "credit" ? ` · Ref. ${p.reference as string}` : ""}
                  </td>
                  <td className="py-2 text-right tabular-nums">{usd(Number(p.amount))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-frost px-4 py-3">
          <p className="font-meta text-mute">ABONADO</p>
          <p className="mt-1 font-display text-[18px] tabular-nums">{usd(Number(r.paid_amount ?? 0))}</p>
        </div>
        <div className={`rounded-xl px-4 py-3 ${pendiente > 0 ? "bg-ember/10" : "bg-emerald-50"}`}>
          <p className="font-meta text-mute">SALDO PENDIENTE</p>
          <p className={`mt-1 font-display text-[18px] tabular-nums ${pendiente > 0 ? "text-ember-ink" : "text-emerald-700"}`}>{usd(pendiente)}</p>
        </div>
      </div>

      {nota && (
        <p className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-800">
          Anulado con la nota de crédito <strong>{numeroNotaCredito(nota.number as number)}</strong> el{" "}
          {fechaLarga(nota.created_at as string, membrete.timezone)}. Motivo: {nota.reason as string}
        </p>
      )}
      {pendiente > 0 && (
        <p className="mt-6 text-[13px] text-mute">Para pagar o reportar tu pago: portal.atryum.net → Pagos.</p>
      )}
    </Documento>
  );
}
