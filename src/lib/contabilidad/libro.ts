import { createAdminClient } from "@/lib/supabase/admin";

export interface LineaLibro {
  fecha: string;
  doc_tipo: string;
  doc_id: string;
  documento: string;
  descripcion: string;
  unit_id: string | null;
  linea: number;
  cuenta: string;
  cuenta_nombre: string;
  debe_usd: number;
  haber_usd: number;
  debe_bs: number;
  haber_bs: number;
}

export interface Asiento {
  n: number;
  fecha: string;
  documento: string;
  descripcion: string;
  doc_tipo: string;
  doc_id: string;
  lineas: LineaLibro[];
}

const COLUMNAS =
  "fecha, doc_tipo, doc_id, documento, descripcion, unit_id, linea, cuenta, cuenta_nombre, debe_usd, haber_usd, debe_bs, haber_bs";

/** Líneas del libro (vista libro_diario, migration 054) en un rango de fechas. Pagina de a 1000. */
export async function lineasDelLibro(orgId: string, desde: string | null, hasta: string): Promise<LineaLibro[]> {
  const db = createAdminClient();
  const out: LineaLibro[] = [];
  for (let desdeFila = 0; ; desdeFila += 1000) {
    let q = db.from("libro_diario").select(COLUMNAS).eq("organization_id", orgId).lte("fecha", hasta);
    if (desde) q = q.gte("fecha", desde);
    const { data, error } = await q
      .order("fecha")
      .order("doc_tipo")
      .order("doc_id")
      .order("linea")
      .range(desdeFila, desdeFila + 999);
    if (error) throw new Error(error.message);
    for (const r of data ?? [])
      out.push({
        ...(r as unknown as LineaLibro),
        debe_usd: Number(r.debe_usd),
        haber_usd: Number(r.haber_usd),
        debe_bs: Number(r.debe_bs),
        haber_bs: Number(r.haber_bs),
      });
    if (!data || data.length < 1000) break;
  }
  return out;
}

/** Agrupa las líneas en asientos numerados en orden cronológico. */
export function asientos(lineas: LineaLibro[]): Asiento[] {
  const orden = ["apertura", "recibo", "anticipo", "aplicacion", "pago", "nota_credito", "gasto"];
  const mapa = new Map<string, Asiento>();
  for (const l of lineas) {
    const k = `${l.doc_tipo}:${l.doc_id}`;
    const a = mapa.get(k) ?? { n: 0, fecha: l.fecha, documento: l.documento, descripcion: l.descripcion, doc_tipo: l.doc_tipo, doc_id: l.doc_id, lineas: [] };
    a.lineas.push(l);
    mapa.set(k, a);
  }
  const lista = [...mapa.values()].sort(
    (a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : orden.indexOf(a.doc_tipo) - orden.indexOf(b.doc_tipo) || (a.documento < b.documento ? -1 : 1)),
  );
  lista.forEach((a, i) => {
    a.n = i + 1;
    a.lineas.sort((x, y) => x.linea - y.linea);
  });
  return lista;
}

export interface SaldoCuenta {
  cuenta: string;
  nombre: string;
  inicialUsd: number;
  debeUsd: number;
  haberUsd: number;
  finalUsd: number;
  inicialBs: number;
  debeBs: number;
  haberBs: number;
  finalBs: number;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Balance de comprobación: saldo inicial (antes de `desde`), movimientos del período y saldo final. */
export async function balanceDeComprobacion(orgId: string, desde: string, hasta: string): Promise<SaldoCuenta[]> {
  const todas = await lineasDelLibro(orgId, null, hasta);
  const m = new Map<string, SaldoCuenta>();
  for (const l of todas) {
    const c =
      m.get(l.cuenta) ??
      { cuenta: l.cuenta, nombre: l.cuenta_nombre, inicialUsd: 0, debeUsd: 0, haberUsd: 0, finalUsd: 0, inicialBs: 0, debeBs: 0, haberBs: 0, finalBs: 0 };
    if (l.fecha < desde) {
      c.inicialUsd = r2(c.inicialUsd + l.debe_usd - l.haber_usd);
      c.inicialBs = r2(c.inicialBs + l.debe_bs - l.haber_bs);
    } else {
      c.debeUsd = r2(c.debeUsd + l.debe_usd);
      c.haberUsd = r2(c.haberUsd + l.haber_usd);
      c.debeBs = r2(c.debeBs + l.debe_bs);
      c.haberBs = r2(c.haberBs + l.haber_bs);
    }
    m.set(l.cuenta, c);
  }
  for (const c of m.values()) {
    c.finalUsd = r2(c.inicialUsd + c.debeUsd - c.haberUsd);
    c.finalBs = r2(c.inicialBs + c.debeBs - c.haberBs);
  }
  return [...m.values()].sort((a, b) => a.cuenta.localeCompare(b.cuenta, "es", { numeric: true }));
}

export const GRUPOS_CUENTA: Record<string, string> = {
  "1": "Activo",
  "2": "Pasivo",
  "3": "Patrimonio",
  "4": "Ingresos",
  "5": "Gastos",
  "7": "Resultados cambiarios",
};
