import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Los gastos pueden estar en bolívares. Todo lo que SUMA gastos lo hace en
 * dólares, convirtiendo cada gasto en Bs a la tasa BCV del día del gasto (el
 * mismo criterio que el libro diario). Sumar el monto crudo mezclaba
 * bolívares con dólares y el panel llegó a mostrar gastos por millones.
 */
export type SerieTasas = { fecha: string; tasa: number }[];

export async function serieDeTasas(db: SupabaseClient, orgId: string): Promise<SerieTasas> {
  const { data } = await db
    .from("exchange_rates")
    .select("effective_date, rate")
    .eq("organization_id", orgId)
    .order("effective_date");
  return (data ?? []).map((r) => ({ fecha: r.effective_date as string, tasa: Number(r.rate) }));
}

/** Tasa vigente en una fecha: la última publicada hasta ese día (o la primera, si es anterior a todas). */
export function tasaEn(serie: SerieTasas, fecha: string): number {
  let t = serie[0]?.tasa ?? 0;
  for (const r of serie) {
    if (r.fecha <= fecha) t = r.tasa;
    else break;
  }
  return t;
}

export function gastoEnUsd(g: { amount: number | string; currency?: string | null; expense_date: string }, serie: SerieTasas): number {
  const monto = Number(g.amount);
  if (!g.currency || g.currency === "USD") return monto;
  const t = tasaEn(serie, g.expense_date);
  return t > 0 ? Math.round((monto / t) * 100) / 100 : 0;
}

export function ingresoEnUsd(i: { amount: number | string; currency?: string | null; income_date: string }, serie: SerieTasas): number {
  return gastoEnUsd({ amount: i.amount, currency: i.currency, expense_date: i.income_date }, serie);
}

export function gastoEnBs(g: { amount: number | string; currency?: string | null; expense_date: string }, serie: SerieTasas): number {
  const monto = Number(g.amount);
  if (g.currency && g.currency !== "USD") return monto;
  return Math.round(monto * tasaEn(serie, g.expense_date) * 100) / 100;
}

/** ¿Hay una tasa BCV publicada hasta esa fecha? Sin ella, el libro no puede valorar el gasto. */
export const hayTasaPara = (serie: SerieTasas, fecha: string) => serie.some((r) => r.fecha <= fecha);

/** Cómo entra un registro al libro (migration 066). */
export type TipoContable = "gasto" | "provision" | "pago_provision" | "entero_retencion";

/**
 * ¿Es gasto del período? Pagar una provisión o enterar retenciones salda una
 * deuda: ese gasto ya se contó cuando se reconoció.
 */
export const esGastoDelPeriodo = (g: { tipo_contable?: string | null }) =>
  !g.tipo_contable || g.tipo_contable === "gasto" || g.tipo_contable === "provision";

/** Dólares que salen del banco con este registro. Una provisión no mueve dinero y lo retenido sale al enterarlo. */
export function salidaEnUsd(
  g: { amount: number | string; currency?: string | null; expense_date: string; tipo_contable?: string | null; retencion_islr?: number | string | null },
  serie: SerieTasas,
): number {
  if (g.tipo_contable === "provision") return 0;
  const total = gastoEnUsd(g, serie);
  const retenido = Number(g.retencion_islr ?? 0);
  return retenido > 0 ? Math.round((total - gastoEnUsd({ ...g, amount: retenido }, serie)) * 100) / 100 : total;
}

/** Lo que falta por pagar, en bolívares. El cliente debe ser el de servicio: el libro no se expone por PostgREST. */
export async function saldosPorPagar(db: SupabaseClient, orgId: string): Promise<{ provisiones: number; retenciones: number }> {
  const { data, error } = await db
    .from("libro_diario")
    .select("cuenta, debe_bs, haber_bs")
    .eq("organization_id", orgId)
    .in("cuenta", ["2.3.01", "2.3.02"]);
  if (error) throw new Error(error.message);
  const saldo = (cuenta: string) =>
    Math.round((data ?? []).filter((l) => l.cuenta === cuenta).reduce((s, l) => s + Number(l.haber_bs) - Number(l.debe_bs), 0) * 100) / 100;
  return { provisiones: saldo("2.3.01"), retenciones: saldo("2.3.02") };
}

/** «Del 1 de junio de 2026 al 29 de septiembre de 2026»: el período que cubre un acumulado. */
export function textoPeriodo(fechas: (string | null | undefined)[], hoy: string): string {
  const validas = fechas.filter((f): f is string => !!f).map((f) => f.slice(0, 10)).sort();
  const larga = (d: string) =>
    new Date(`${d}T12:00:00Z`).toLocaleDateString("es-VE", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  if (validas.length === 0) return `Sin movimientos al ${larga(hoy)}`;
  return `Del ${larga(validas[0])} al ${larga(hoy)}`;
}
