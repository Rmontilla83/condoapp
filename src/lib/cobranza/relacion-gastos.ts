import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Los gastos de un mes, tal como se cobran en el recibo: agrupados por
 * categoría y en la moneda del recibo (dólares). Es lo que el condominio llama
 * «aviso de cobro»: cada gasto del mes y, al lado, la parte que le toca al
 * apartamento.
 *
 * Se guarda una copia al emitir (tabla `relaciones_de_cobro`, migration 076):
 * el recibo es inmutable y su detalle también tiene que serlo, aunque después
 * se anule o se cargue un gasto de ese mes.
 */

export interface LineaDeGasto {
  fecha: string;
  descripcion: string;
  proveedor: string | null;
  monto: number;
}

export interface CategoriaDeGasto {
  nombre: string;
  total: number;
  lineas: LineaDeGasto[];
}

export interface RelacionDeGastos {
  /** YYYY-MM */
  mes: string;
  total: number;
  categorias: CategoriaDeGasto[];
}

const r2 = (n: number) => Math.round(n * 100) / 100;

export const esMes = (s: string) => /^\d{4}-(0[1-9]|1[0-2])$/.test(s);

/** «2026-11» → «noviembre de 2026». */
export function nombreDelMes(mes: string): string {
  return new Date(`${mes}-15T12:00:00Z`).toLocaleDateString("es-VE", { month: "long", year: "numeric", timeZone: "UTC" });
}

export function limitesDelMes(mes: string): { desde: string; hasta: string } {
  const [y, m] = mes.split("-").map(Number);
  const fin = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { desde: `${mes}-01`, hasta: `${mes}-${String(fin).padStart(2, "0")}` };
}

export async function gastosDelMes(db: SupabaseClient, orgId: string, mes: string): Promise<RelacionDeGastos> {
  const { desde, hasta } = limitesDelMes(mes);
  const [{ data: gastos }, { data: cats }, { data: tasas }] = await Promise.all([
    db
      .from("expense_records")
      .select("description, amount, currency, expense_date, category_id, vendors(name)")
      .eq("organization_id", orgId)
      .is("voided_at", null)
      // Pagar una provisión o enterar retenciones salda una deuda: no es gasto del mes.
      .in("tipo_contable", ["gasto", "provision"])
      // Lo que se pagó con un fondo no se le cobra otra vez al propietario.
      .eq("paid_from_reserve", false)
      .gte("expense_date", desde)
      .lte("expense_date", hasta)
      .order("expense_date")
      .order("created_at"),
    db.from("expense_categories").select("id, label, position").eq("organization_id", orgId),
    db.from("exchange_rates").select("rate, effective_date").eq("organization_id", orgId).lte("effective_date", hasta).order("effective_date"),
  ]);

  const tasaEn = (fecha: string) => {
    let t = 0;
    for (const r of tasas ?? []) if ((r.effective_date as string) <= fecha) t = Number(r.rate);
    return t;
  };
  const enUsd = (g: { amount: unknown; currency: unknown; expense_date: unknown }) => {
    if (g.currency === "USD") return r2(Number(g.amount));
    const t = tasaEn(g.expense_date as string);
    return t > 0 ? r2(Number(g.amount) / t) : 0;
  };

  const porCat = new Map<string, CategoriaDeGasto & { pos: number }>();
  for (const c of cats ?? []) porCat.set(c.id as string, { nombre: c.label as string, pos: Number(c.position ?? 99), total: 0, lineas: [] });
  for (const g of gastos ?? []) {
    const clave = (g.category_id as string | null) ?? "sin";
    const c = porCat.get(clave) ?? { nombre: "Sin categoría", pos: 999, total: 0, lineas: [] };
    const proveedor = ((Array.isArray(g.vendors) ? g.vendors[0] : g.vendors) as { name?: string } | null)?.name ?? null;
    const monto = enUsd(g);
    c.lineas.push({ fecha: g.expense_date as string, descripcion: g.description as string, proveedor, monto });
    c.total = r2(c.total + monto);
    porCat.set(clave, c);
  }
  const categorias = [...porCat.values()]
    .filter((c) => c.lineas.length)
    .sort((a, b) => a.pos - b.pos)
    .map(({ nombre, total, lineas }) => ({ nombre, total, lineas }));
  return { mes, total: r2(categorias.reduce((s, c) => s + c.total, 0)), categorias };
}
