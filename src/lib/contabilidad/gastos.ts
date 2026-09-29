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

/** «Del 1 de junio de 2026 al 29 de septiembre de 2026»: el período que cubre un acumulado. */
export function textoPeriodo(fechas: (string | null | undefined)[], hoy: string): string {
  const validas = fechas.filter((f): f is string => !!f).map((f) => f.slice(0, 10)).sort();
  const larga = (d: string) =>
    new Date(`${d}T12:00:00Z`).toLocaleDateString("es-VE", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  if (validas.length === 0) return `Sin movimientos al ${larga(hoy)}`;
  return `Del ${larga(validas[0])} al ${larga(hoy)}`;
}
