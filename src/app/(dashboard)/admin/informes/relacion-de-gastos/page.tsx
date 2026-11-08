import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/queries";
import { isAdminRole } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { fechaLarga, membreteDe } from "@/lib/documentos";
import { todayInTimeZone } from "@/lib/utils";
import { bs, usd } from "@/lib/format";
import { Documento } from "@/components/documentos/documento";
import { IconoCategoria } from "@/components/ui/icono";
import { Pestanas, PESTANAS_CUENTAS, SelectorMoneda } from "@/components/contabilidad/ui";
import { SelectorPeriodo } from "@/components/contabilidad/selector-periodo";

const r2 = (n: number) => Math.round(n * 100) / 100;
const larga = (d: string) => d.split("-").reverse().join("/");
const corta = (d: string) =>
  new Date(`${d}T12:00:00Z`).toLocaleDateString("es-VE", { day: "2-digit", month: "2-digit", timeZone: "UTC" });

/**
 * Relación de gastos del período: lo que se presenta en asamblea. Gastos por
 * categoría con su soporte, y al lado lo facturado y lo cobrado, para que la
 * junta vea en una hoja de dónde salió y a dónde fue el dinero.
 */
export default async function RelacionDeGastosPage({ searchParams }: { searchParams: Promise<{ desde?: string; hasta?: string; moneda?: string }> }) {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return null;
  if (!isAdminRole(profile)) redirect("/dashboard");
  const orgId = profile.organization_id;
  const membrete = await membreteDe(orgId);
  const hoy = todayInTimeZone(membrete.timezone);

  const sp = await searchParams;
  const [y, m] = hoy.split("-").map(Number);
  const iniMes = new Date(Date.UTC(y, m - 1, 1)).toISOString().slice(0, 10);
  const valida = (s?: string) => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null);
  const desde = valida(sp.desde) ?? iniMes;
  const hasta = valida(sp.hasta) ?? hoy;
  const hastaFin = new Date(Date.parse(`${hasta}T12:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
  const enBs = sp.moneda !== "usd";
  const fmt = enBs ? bs : usd;
  const enlaceMoneda = (b: boolean) => `?desde=${desde}&hasta=${hasta}${b ? "" : "&moneda=usd"}`;

  const db = createAdminClient();
  const [{ data: gastos }, { data: cats }, { data: tasas }, { data: cuotas }, { data: pagos }, { data: notas }, { data: ingresos }] = await Promise.all([
    db
      .from("expense_records")
      .select("id, description, amount, currency, expense_date, receipt_url, category_id, paid_from_reserve, reserve_acta, tipo_contable, retencion_islr, vendors(name), cost_centers(name)")
      .eq("organization_id", orgId)
      .is("voided_at", null)
      // Pagar una provisión o enterar retenciones salda una deuda: no es gasto del período.
      .in("tipo_contable", ["gasto", "provision"])
      .gte("expense_date", desde)
      .lte("expense_date", hasta)
      .order("expense_date"),
    db.from("expense_categories").select("id, label, icon, position").eq("organization_id", orgId),
    db.from("exchange_rates").select("rate, effective_date").eq("organization_id", orgId).lte("effective_date", hasta).order("effective_date"),
    db
      .from("invoices")
      .select("amount, amount_bs, exchange_rate, kind, created_at, due_date")
      .eq("organization_id", orgId)
      .neq("kind", "opening")
      .lt("created_at", hastaFin)
      .gte("due_date", desde),
    db
      .from("transactions")
      .select("amount, amount_bs, exchange_rate, payment_method, invoices!inner(organization_id, exchange_rate)")
      .eq("status", "approved")
      .neq("payment_method", "credit")
      .eq("invoices.organization_id", orgId)
      .gte("paid_at", desde)
      .lt("paid_at", hastaFin),
    db.from("credit_notes").select("amount, amount_bs, exchange_rate").eq("organization_id", orgId).gte("created_at", desde).lt("created_at", hastaFin),
    db
      .from("other_incomes")
      .select("id, income_date, description, source, amount, currency")
      .eq("organization_id", orgId)
      .is("voided_at", null)
      .gte("income_date", desde)
      .lte("income_date", hasta)
      .order("income_date"),
  ]);

  const tasaEn = (fecha: string) => {
    let t = 0;
    for (const r of tasas ?? []) if ((r.effective_date as string) <= fecha) t = Number(r.rate);
    return t;
  };
  const enUsd = (g: { amount: unknown; currency: unknown; expense_date: unknown }) => {
    if (g.currency === "USD") return Number(g.amount);
    const t = tasaEn(g.expense_date as string);
    return t > 0 ? r2(Number(g.amount) / t) : 0;
  };

  const enBolivares = (g: { amount: unknown; currency: unknown; expense_date: unknown }) =>
    g.currency === "USD" ? r2(Number(g.amount) * tasaEn(g.expense_date as string)) : Number(g.amount);
  /** Monto de un gasto en la moneda de la hoja. */
  const montoDe = (g: { amount: unknown; currency: unknown; expense_date: unknown }) => (enBs ? enBolivares(g) : enUsd(g));
  /** Monto de un documento en la moneda de la hoja, con sus bolívares guardados (mismo criterio que el libro). */
  const docEn = (d: { amount: unknown; amount_bs?: unknown; exchange_rate?: unknown }, tasaRespaldo: number) =>
    enBs
      ? d.amount_bs != null
        ? Number(d.amount_bs)
        : r2(Number(d.amount) * (Number(d.exchange_rate) || tasaRespaldo))
      : Number(d.amount);

  const porCat = new Map<string, { label: string; icon: string | null; pos: number; items: typeof gastos; total: number }>();
  for (const c of cats ?? []) porCat.set(c.id as string, { label: c.label as string, icon: c.icon as string | null, pos: Number(c.position ?? 99), items: [], total: 0 });
  for (const g of gastos ?? []) {
    const c = porCat.get(g.category_id as string) ?? { label: "Sin categoría", icon: null, pos: 999, items: [], total: 0 };
    c.items!.push(g);
    c.total = r2(c.total + montoDe(g));
    porCat.set((g.category_id as string) ?? "x", c);
  }
  const grupos = [...porCat.values()].filter((c) => c.items!.length).sort((a, b) => a.pos - b.pos);
  const gastado = r2(grupos.reduce((s, c) => s + c.total, 0));
  // Fecha contable del recibo: la de emisión, salvo que se haya cargado después
  // de su vencimiento (mismo criterio que el libro diario).
  const fechaContable = (c: { created_at: unknown; due_date: unknown }) => {
    const emitido = new Date(c.created_at as string).toLocaleDateString("en-CA", { timeZone: membrete.timezone });
    return emitido < (c.due_date as string) ? emitido : (c.due_date as string);
  };
  const facturado = r2(
    (cuotas ?? []).filter((c) => { const f = fechaContable(c); return f >= desde && f <= hasta; }).reduce((s, c) => s + docEn(c, tasaEn(fechaContable(c))), 0) -
      (notas ?? []).reduce((s, n) => s + docEn(n, 0), 0),
  );
  const cobrado = r2(
    (pagos ?? []).reduce((s, p) => {
      const factura = (Array.isArray(p.invoices) ? p.invoices[0] : p.invoices) as { exchange_rate?: unknown } | null;
      return s + docEn(p, Number(factura?.exchange_rate) || 0);
    }, 0),
  );
  const sinSoporte = (gastos ?? []).filter((g) => !g.receipt_url).length;
  const montoIngreso = (i: { amount: unknown; currency: unknown; income_date: unknown }) =>
    montoDe({ amount: i.amount, currency: i.currency, expense_date: i.income_date });
  const otros = r2((ingresos ?? []).reduce((s, i) => s + montoIngreso(i), 0));
  const conFondo = r2((gastos ?? []).filter((g) => g.paid_from_reserve).reduce((s, g) => s + montoDe(g), 0));
  const nombreCentro = (g: { cost_centers?: unknown }) => {
    const c = (Array.isArray(g.cost_centers) ? g.cost_centers[0] : g.cost_centers) as { name: string } | null | undefined;
    return c?.name ?? null;
  };
  const porCentro = new Map<string, number>();
  for (const g of gastos ?? []) {
    const nombre = nombreCentro(g) ?? "Sin centro de costo";
    porCentro.set(nombre, r2((porCentro.get(nombre) ?? 0) + montoDe(g)));
  }
  const centros = [...porCentro.entries()].sort((a, b) => b[1] - a[1]);
  const hayCentros = centros.some(([n]) => n !== "Sin centro de costo");

  return (
    <div className="space-y-6">
      <div className="print:hidden space-y-6">
        <Pestanas items={PESTANAS_CUENTAS} actual="/admin/informes/relacion-de-gastos" />
        <div className="flex flex-wrap items-end justify-between gap-3">
          <SelectorPeriodo desde={desde} hasta={hasta} hoy={hoy} />
          <SelectorMoneda enBs={enBs} enlaceBs={enlaceMoneda(true)} enlaceUsd={enlaceMoneda(false)} />
        </div>
      </div>
      <Documento
        membrete={membrete}
        tipo="Relación de gastos"
        numero={`${larga(desde)} al ${larga(hasta)}`}
        fecha={`Emitida el ${fechaLarga(hoy)}`}
        ancho="max-w-4xl"
        pie={
          <>
            {enBs
              ? "Montos en bolívares; lo que se pactó en dólares se convierte a la tasa BCV de cada documento."
              : "Montos en dólares, como referencia; lo que se pagó en bolívares se convierte a la tasa BCV del día del gasto."}{" "}
            Facturado: recibos emitidos en el
            período, menos notas de crédito. Cobrado: pagos aprobados en el período (sin saldo a favor aplicado).
            {conFondo > 0 && ` Gastado incluye ${fmt(conFondo)} pagados con el fondo de reserva.`}
            {sinSoporte > 0 && ` ${sinSoporte} gasto${sinSoporte !== 1 ? "s" : ""} sin factura adjunta.`}
          </>
        }
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[
            ["FACTURADO", facturado],
            ["COBRADO", cobrado],
            ["OTROS INGRESOS", otros],
            ["GASTADO", gastado],
            ["INGRESOS − GASTOS", r2(cobrado + otros - gastado)],
          ].map(([t, v]) => (
            <div key={t as string} className="rounded-xl bg-frost px-3 py-2.5">
              <p className="font-meta text-mute">{t}</p>
              <p className={`mt-1 font-display text-[17px] tabular-nums ${(v as number) < 0 ? "text-destructive" : ""}`}>{fmt(v as number)}</p>
            </div>
          ))}
        </div>

        {hayCentros && (
          <table className="mt-7 w-full max-w-md text-[12.5px]">
            <thead>
              <tr className="border-b border-marine-deep/30 text-left text-[10.5px] uppercase tracking-[0.06em] text-mute">
                <th className="py-2 pr-2 font-medium">Centro de costo</th>
                <th className="py-2 pl-2 text-right font-medium">Monto</th>
              </tr>
            </thead>
            <tbody>
              {centros.map(([nombre, monto]) => (
                <tr key={nombre} className="border-b border-border">
                  <td className="py-1.5 pr-2">{nombre}</td>
                  <td className="py-1.5 pl-2 text-right tabular-nums">{fmt(monto)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {grupos.length === 0 ? (
          <p className="mt-8 text-center text-[14px] text-mute">No hay gastos registrados en este período.</p>
        ) : (
          <table className="mt-7 w-full text-[12.5px]">
            <thead>
              <tr className="border-b border-marine-deep/30 text-left text-[10.5px] uppercase tracking-[0.06em] text-mute">
                <th className="py-2 pr-2 font-medium">Fecha</th>
                <th className="py-2 pr-2 font-medium">Concepto</th>
                <th className="py-2 pr-2 font-medium">Centro</th>
                <th className="py-2 pr-2 font-medium">Proveedor</th>
                <th className="py-2 pr-2 text-center font-medium">Soporte</th>
                <th className="py-2 pl-2 text-right font-medium">Monto</th>
              </tr>
            </thead>
            {grupos.map((c) => (
              <tbody key={c.label} className="break-inside-avoid">
                <tr>
                  <td colSpan={5} className="pt-4 pb-1.5 font-semibold">
                    <span className="inline-flex items-center gap-2">
                      <IconoCategoria icono={c.icon} className="h-4 w-4 text-cyan-ink" />
                      {c.label}
                    </span>
                  </td>
                  <td className="pt-4 pb-1.5 text-right font-semibold tabular-nums">{fmt(c.total)}</td>
                </tr>
                {c.items!.map((g) => {
                  const v = (Array.isArray(g.vendors) ? g.vendors[0] : g.vendors) as { name: string } | null;
                  return (
                    <tr key={g.id as string} className="border-b border-border">
                      <td className="py-1.5 pr-2 whitespace-nowrap">{corta(g.expense_date as string)}</td>
                      <td className="py-1.5 pr-2">
                        {g.description as string}
                        {!!g.paid_from_reserve && (
                          <span className="block text-[10.5px] text-mute">
                            Con el fondo de reserva{g.reserve_acta ? ` · ${g.reserve_acta as string}` : ""}
                          </span>
                        )}
                        {g.tipo_contable === "provision" && (
                          <span className="block text-[10.5px] text-mute">Provisión: todavía no sale del banco</span>
                        )}
                        {Number(g.retencion_islr) > 0 && (
                          <span className="block text-[10.5px] text-mute">
                            Retención de ISLR: {g.currency === "USD" ? usd(Number(g.retencion_islr)) : bs(Number(g.retencion_islr))}
                          </span>
                        )}
                      </td>
                      <td className="py-1.5 pr-2 text-mute">{nombreCentro(g) ?? "—"}</td>
                      <td className="py-1.5 pr-2 text-mute">{v?.name ?? "—"}</td>
                      <td className="py-1.5 pr-2 text-center">{g.receipt_url ? "Sí" : <span className="text-ember-ink">No</span>}</td>
                      <td className="py-1.5 pl-2 text-right tabular-nums">
                        {fmt(montoDe(g))}
                        <span className="block text-[10.5px] text-mute">{enBs ? usd(enUsd(g)) : bs(enBolivares(g))}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            ))}
            <tfoot>
              <tr>
                <td colSpan={5} className="pt-4 text-right font-meta text-mute">
                  TOTAL DE GASTOS
                </td>
                <td className="pt-4 text-right font-display text-[18px] tabular-nums">{fmt(gastado)}</td>
              </tr>
            </tfoot>
          </table>
        )}

        {(ingresos ?? []).length > 0 && (
          <table className="mt-7 w-full text-[12.5px]">
            <thead>
              <tr className="border-b border-marine-deep/30 text-left text-[10.5px] uppercase tracking-[0.06em] text-mute">
                <th className="py-2 pr-2 font-medium">Fecha</th>
                <th className="py-2 pr-2 font-medium">Otro ingreso</th>
                <th className="py-2 pr-2 font-medium">De quién</th>
                <th className="py-2 pl-2 text-right font-medium">Monto</th>
              </tr>
            </thead>
            <tbody>
              {(ingresos ?? []).map((i) => (
                <tr key={i.id as string} className="border-b border-border">
                  <td className="py-1.5 pr-2 whitespace-nowrap">{corta(i.income_date as string)}</td>
                  <td className="py-1.5 pr-2">{i.description as string}</td>
                  <td className="py-1.5 pr-2 text-mute">{(i.source as string) ?? "—"}</td>
                  <td className="py-1.5 pl-2 text-right tabular-nums">{fmt(montoIngreso(i))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="mt-14 grid grid-cols-2 gap-10 text-center text-[12px] text-mute print:mt-20">
          <div className="border-t border-marine-deep/40 pt-2">Administración</div>
          <div className="border-t border-marine-deep/40 pt-2">Junta de condominio</div>
        </div>
      </Documento>
    </div>
  );
}
