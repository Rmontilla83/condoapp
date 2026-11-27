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
import { nombreDelMes, type CategoriaDeGasto } from "@/lib/cobranza/relacion-gastos";

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
    .select("id, organization_id, unit_id, receipt_number, description, kind, amount, reserve_amount, contingency_amount, paid_amount, currency, exchange_rate, amount_bs, due_date, status, created_at, relacion_id, units(unit_number, block, aliquot)")
    .eq("id", id)
    .maybeSingle();
  if (!r || !(await puedeVerUnidad(profile, r.unit_id as string))) notFound();

  const [membrete, { data: pagos }, { data: nota }, { data: duenos }] = await Promise.all([
    membreteDe(r.organization_id as string),
    db
      .from("transactions")
      .select("id, amount, payment_method, reference, paid_at, reviewed_at, exchange_rate, amount_bs")
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

  // La relación de gastos que se cobró en este recibo, guardada al emitirlo.
  const { data: relacion } = r.relacion_id
    ? await db.from("relaciones_de_cobro").select("expense_month, total_gastos, reserve_pct, contingency_pct, detalle").eq("id", r.relacion_id as string).maybeSingle()
    : { data: null };
  const r2 = (n: number) => Math.round(n * 100) / 100;
  const base = r2(Number(r.amount) - Number(r.reserve_amount ?? 0) - Number(r.contingency_amount ?? 0));
  const totalGastos = Number(relacion?.total_gastos ?? 0);
  // La parte de esta unidad en los gastos del mes: lo que se le cobró entre lo que se gastó.
  const parte = totalGastos > 0 ? base / totalGastos : 0;
  const categorias = (relacion?.detalle ?? []) as CategoriaDeGasto[];
  const pct = (n: number) => `${Number(n).toLocaleString("es-VE", { maximumFractionDigits: 3 })} %`;

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
            <td className="py-3">
              {r.description as string}
              {Number(r.reserve_amount ?? 0) > 0 && (
                <span className="block text-[12px] text-mute">Incluye {usd(Number(r.reserve_amount))} para el fondo de reserva</span>
              )}
              {Number(r.contingency_amount ?? 0) > 0 && (
                <span className="block text-[12px] text-mute">Incluye {usd(Number(r.contingency_amount))} para el fondo de contingencia</span>
              )}
            </td>
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

      {relacion && categorias.length > 0 && (
        <section className="mt-8">
          <p className="font-meta text-mute">RELACIÓN DE GASTOS DE {nombreDelMes((relacion.expense_month as string).slice(0, 7)).toUpperCase()}</p>
          <p className="mt-1 text-[12px] text-mute">
            Cada gasto del mes y la parte que le corresponde a esta unidad ({(parte * 100).toLocaleString("es-VE", { maximumFractionDigits: 4 })} % del total).
          </p>
          <table className="mt-3 w-full text-[12.5px]">
            <thead>
              <tr className="border-b border-marine-deep/30 text-left text-[11px] uppercase tracking-[0.06em] text-mute">
                <th className="py-2 font-medium">Descripción del gasto</th>
                <th className="py-2 text-right font-medium">Monto</th>
                <th className="py-2 pl-4 text-right font-medium">Su cuota</th>
              </tr>
            </thead>
            {categorias.map((c, i) => (
              <tbody key={i}>
                {/* La categoría puede partirse entre hojas; su título no se queda solo al pie. */}
                <tr className="break-after-avoid border-b border-border bg-frost/60 font-semibold">
                  <td className="px-2 py-1.5">{c.nombre}</td>
                  <td className="py-1.5 text-right tabular-nums">{usd(c.total)}</td>
                  <td className="py-1.5 pl-4 pr-2 text-right tabular-nums">{usd(r2(c.total * parte))}</td>
                </tr>
                {c.lineas.map((l, j) => (
                  <tr key={j} className="border-b border-border/60">
                    <td className="py-1 pl-5 pr-2">
                      {l.proveedor ? `${l.proveedor}: ` : ""}
                      {l.descripcion}
                    </td>
                    <td className="py-1 text-right tabular-nums">{usd(l.monto)}</td>
                    <td className="py-1 pl-4 pr-2 text-right tabular-nums">{usd(r2(l.monto * parte))}</td>
                  </tr>
                ))}
              </tbody>
            ))}
            <tfoot>
              <tr className="border-t border-marine-deep/30">
                <td className="py-1.5 font-medium">Total de gastos del mes</td>
                <td className="py-1.5 text-right tabular-nums">{usd(totalGastos)}</td>
                <td className="py-1.5 pl-4 pr-2 text-right tabular-nums">{usd(base)}</td>
              </tr>
              {Number(r.reserve_amount ?? 0) > 0 && (
                <tr>
                  <td className="py-1">Fondo de reserva ({pct(Number(relacion.reserve_pct))})</td>
                  <td className="py-1 text-right tabular-nums">{usd(r2((totalGastos * Number(relacion.reserve_pct)) / 100))}</td>
                  <td className="py-1 pl-4 pr-2 text-right tabular-nums">{usd(Number(r.reserve_amount))}</td>
                </tr>
              )}
              {Number(r.contingency_amount ?? 0) > 0 && (
                <tr>
                  <td className="py-1">Fondo de contingencia ({pct(Number(relacion.contingency_pct))})</td>
                  <td className="py-1 text-right tabular-nums">{usd(r2((totalGastos * Number(relacion.contingency_pct)) / 100))}</td>
                  <td className="py-1 pl-4 pr-2 text-right tabular-nums">{usd(Number(r.contingency_amount))}</td>
                </tr>
              )}
              <tr className="border-t border-marine-deep/30 font-semibold">
                <td className="py-1.5">Total de gastos comunes</td>
                <td className="py-1.5 text-right tabular-nums">
                  {usd(r2(totalGastos * (1 + (Number(r.reserve_amount ?? 0) > 0 ? Number(relacion.reserve_pct) : 0) / 100 + (Number(r.contingency_amount ?? 0) > 0 ? Number(relacion.contingency_pct) : 0) / 100)))}
                </td>
                <td className="py-1.5 pl-4 pr-2 text-right tabular-nums">{usd(Number(r.amount))}</td>
              </tr>
            </tfoot>
          </table>
        </section>
      )}

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
                  <td className="py-2 text-right tabular-nums">
                    {usd(Number(p.amount))}
                    {p.amount_bs != null && p.payment_method !== "credit" && (
                      <span className="block text-[11px] text-mute">
                        {bs(Number(p.amount_bs))}
                        {p.exchange_rate != null ? ` a ${tasa(Number(p.exchange_rate))}` : ""}
                      </span>
                    )}
                  </td>
                  <td className="py-2 pl-3 text-right print:hidden">
                    {p.payment_method !== "credit" && (
                      <a href={`/pagos/comprobante/${p.id as string}`} className="text-[12px] font-medium text-cyan-ink hover:underline">
                        Comprobante
                      </a>
                    )}
                  </td>
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
