import type { SupabaseClient } from "@supabase/supabase-js";
import { distributeExact } from "@/lib/cobranza/compute-invoices";
import { ESTADOS_ABIERTOS, pendienteDe } from "@/lib/cuotas";
import { compararUnidades } from "@/lib/units/orden";

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Días entre dos fechas YYYY-MM-DD (b − a). */
export function diasEntre(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86_400_000);
}

function sumarMeses(fecha: string, meses: number): string {
  const d = new Date(`${fecha}T12:00:00Z`);
  const dia = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + meses);
  const ultimo = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(dia, ultimo));
  return d.toISOString().slice(0, 10);
}

// ─── Convenios de pago ───────────────────────────────────────────────────────

export interface Convenio {
  id: string;
  unit_id: string;
  total: number;
  installments: number;
  first_due: string;
  notes: string | null;
  status: "active" | "completed" | "cancelled";
  created_at: string;
}

export interface CuotaConvenio {
  n: number;
  vence: string;
  monto: number;
  /** Lo que el calendario pedía acumulado hasta esta cuota. */
  acumulado: number;
}

export function calendarioConvenio(c: Pick<Convenio, "total" | "installments" | "first_due">): CuotaConvenio[] {
  const partes = distributeExact(
    Number(c.total),
    Array.from({ length: c.installments }, (_, i) => ({ id: String(i), w: 1 })),
  );
  let acumulado = 0;
  return Array.from({ length: c.installments }, (_, i) => {
    const monto = partes.get(String(i)) ?? 0;
    acumulado = r2(acumulado + monto);
    return { n: i + 1, vence: sumarMeses(c.first_due, i), monto, acumulado };
  });
}

export interface EstadoConvenio {
  convenio: Convenio;
  calendario: CuotaConvenio[];
  pagado: number;
  exigido: number;
  alDia: boolean;
  atraso: number;
  proxima: CuotaConvenio | null;
  completado: boolean;
}

export function evaluarConvenio(c: Convenio, pagado: number, hoy: string): EstadoConvenio {
  const calendario = calendarioConvenio(c);
  const vencidas = calendario.filter((q) => q.vence <= hoy);
  const exigido = vencidas.length ? vencidas[vencidas.length - 1].acumulado : 0;
  const atraso = r2(Math.max(0, exigido - pagado));
  return {
    convenio: c,
    calendario,
    pagado: r2(pagado),
    exigido,
    alDia: atraso <= 0.009,
    atraso,
    proxima: calendario.find((q) => q.acumulado > pagado + 0.009) ?? null,
    completado: pagado + 0.009 >= Number(c.total),
  };
}

/**
 * Convenios activos del condominio con su estado. Lo pagado cuenta todo pago
 * aprobado a recibos de la unidad desde que se firmó el convenio (incluido el
 * saldo a favor aplicado): el convenio es un calendario sobre la misma deuda.
 */
export async function conveniosActivos(db: SupabaseClient, orgId: string, hoy: string): Promise<Map<string, EstadoConvenio>> {
  const { data: planes } = await db
    .from("payment_plans")
    .select("id, unit_id, total, installments, first_due, notes, status, created_at")
    .eq("organization_id", orgId)
    .eq("status", "active");
  const out = new Map<string, EstadoConvenio>();
  if (!planes?.length) return out;

  const unidades = planes.map((p) => p.unit_id as string);
  const { data: pagos } = await db
    .from("transactions")
    .select("amount, paid_at, reviewed_at, invoices!inner(unit_id)")
    .eq("status", "approved")
    .in("invoices.unit_id", unidades);

  for (const p of planes) {
    const desde = p.created_at as string;
    const pagado = (pagos ?? [])
      .filter((t) => {
        const inv = (Array.isArray(t.invoices) ? t.invoices[0] : t.invoices) as { unit_id: string };
        const cuando = (t.reviewed_at ?? t.paid_at) as string;
        return inv?.unit_id === p.unit_id && cuando >= desde;
      })
      .reduce((s, t) => s + Number(t.amount), 0);
    out.set(p.unit_id as string, evaluarConvenio({ ...(p as unknown as Convenio), total: Number(p.total) }, pagado, hoy));
  }
  return out;
}

// ─── Antigüedad de saldos ────────────────────────────────────────────────────

export const TRAMOS = [
  { clave: "corriente", etiqueta: "Por vencer" },
  { clave: "d30", etiqueta: "1–30 días" },
  { clave: "d60", etiqueta: "31–60 días" },
  { clave: "d90", etiqueta: "61–90 días" },
  { clave: "d90mas", etiqueta: "Más de 90" },
] as const;
export type Tramo = (typeof TRAMOS)[number]["clave"];

export interface FilaAntiguedad {
  unitId: string;
  etiqueta: string;
  torre: string;
  propietario: string;
  telefono: string | null;
  tramos: Record<Tramo, number>;
  total: number;
  vencido: number;
  diasMayor: number;
  saldoAFavor: number;
  convenio: EstadoConvenio | null;
}

export function tramoDe(diasVencida: number): Tramo {
  if (diasVencida <= 0) return "corriente";
  if (diasVencida <= 30) return "d30";
  if (diasVencida <= 60) return "d60";
  if (diasVencida <= 90) return "d90";
  return "d90mas";
}

export async function antiguedadDeSaldos(db: SupabaseClient, orgId: string, hoy: string): Promise<FilaAntiguedad[]> {
  const [{ data: unidades }, { data: cuotas }, { data: creditos }, { data: duenos }, convenios] = await Promise.all([
    db.from("units").select("id, unit_number, block").eq("organization_id", orgId),
    db
      .from("invoices")
      .select("unit_id, amount, paid_amount, due_date")
      .eq("organization_id", orgId)
      .in("status", [...ESTADOS_ABIERTOS]),
    db.from("unit_credits").select("unit_id, amount").eq("organization_id", orgId),
    db
      .from("unit_members")
      .select("unit_id, profiles(full_name, phone), units!inner(organization_id)")
      .eq("role", "owner")
      .eq("active", true)
      .eq("units.organization_id", orgId),
    conveniosActivos(db, orgId, hoy),
  ]);

  const vacio = (): Record<Tramo, number> => ({ corriente: 0, d30: 0, d60: 0, d90: 0, d90mas: 0 });
  const filas = new Map<string, FilaAntiguedad>();
  for (const u of unidades ?? []) {
    filas.set(u.id as string, {
      unitId: u.id as string,
      etiqueta: `${u.block ? `${u.block as string} · ` : ""}${u.unit_number as string}`,
      torre: (u.block as string) ?? "",
      propietario: "",
      telefono: null,
      tramos: vacio(),
      total: 0,
      vencido: 0,
      diasMayor: 0,
      saldoAFavor: 0,
      convenio: convenios.get(u.id as string) ?? null,
    });
  }
  for (const c of cuotas ?? []) {
    const f = filas.get(c.unit_id as string);
    if (!f) continue;
    const falta = pendienteDe(c);
    if (falta <= 0) continue;
    const dias = diasEntre(c.due_date as string, hoy);
    f.tramos[tramoDe(dias)] = r2(f.tramos[tramoDe(dias)] + falta);
    f.total = r2(f.total + falta);
    if (dias > 0) f.vencido = r2(f.vencido + falta);
    f.diasMayor = Math.max(f.diasMayor, dias);
  }
  for (const c of creditos ?? []) {
    const f = filas.get(c.unit_id as string);
    if (f) f.saldoAFavor = r2(f.saldoAFavor + Number(c.amount));
  }
  for (const d of duenos ?? []) {
    const f = filas.get(d.unit_id as string);
    const p = (Array.isArray(d.profiles) ? d.profiles[0] : d.profiles) as { full_name: string | null; phone: string | null } | null;
    if (f && p && !f.propietario) {
      f.propietario = p.full_name ?? "";
      f.telefono = p.phone;
    }
  }
  const orden = (a: FilaAntiguedad, b: FilaAntiguedad) =>
    compararUnidades(
      { unit_number: a.etiqueta.split(" · ").pop() ?? "", block: a.torre || null },
      { unit_number: b.etiqueta.split(" · ").pop() ?? "", block: b.torre || null },
    );
  return [...filas.values()].sort(orden);
}

// ─── Intereses de mora ───────────────────────────────────────────────────────

export interface InteresUnidad {
  unitId: string;
  etiqueta: string;
  base: number;
  detalle: { concepto: string; pendiente: number; dias: number; interes: number }[];
  interes: number;
  excluida?: string;
}

/**
 * Interés simple sobre lo VENCIDO de cada recibo, por los días que estuvo
 * vencido dentro del período: pendiente × días × tasa anual / 365.
 * No se cobra interés sobre intereses (los recibos de interés no generan).
 */
export async function calcularIntereses(
  db: SupabaseClient,
  orgId: string,
  params: { desde: string; hasta: string; tasaAnual: number; excluirConvenioAlDia: boolean; hoy: string },
): Promise<InteresUnidad[]> {
  const [{ data: cuotas }, { data: unidades }, convenios] = await Promise.all([
    db
      .from("invoices")
      .select("unit_id, amount, paid_amount, due_date, description, kind")
      .eq("organization_id", orgId)
      .in("status", [...ESTADOS_ABIERTOS])
      .neq("kind", "interest")
      .lt("due_date", params.hasta),
    db.from("units").select("id, unit_number, block").eq("organization_id", orgId),
    conveniosActivos(db, orgId, params.hoy),
  ]);
  const etiqueta = new Map(
    (unidades ?? []).map((u) => [u.id as string, `${u.block ? `${u.block as string} · ` : ""}${u.unit_number as string}`]),
  );
  const porUnidad = new Map<string, InteresUnidad>();
  for (const c of cuotas ?? []) {
    const pendiente = pendienteDe(c);
    if (pendiente <= 0) continue;
    // Días vencida dentro de [desde, hasta]: desde el día siguiente al vencimiento.
    const inicio = (c.due_date as string) >= params.desde ? (c.due_date as string) : params.desde;
    const dias = Math.max(0, diasEntre(inicio, params.hasta) + ((c.due_date as string) >= params.desde ? 0 : 1));
    if (dias <= 0) continue;
    const interes = r2((pendiente * dias * params.tasaAnual) / 100 / 365);
    const u = c.unit_id as string;
    const fila = porUnidad.get(u) ?? { unitId: u, etiqueta: etiqueta.get(u) ?? "", base: 0, detalle: [], interes: 0 };
    fila.base = r2(fila.base + pendiente);
    fila.detalle.push({ concepto: c.description as string, pendiente, dias, interes });
    fila.interes = r2(fila.interes + interes);
    porUnidad.set(u, fila);
  }
  for (const f of porUnidad.values()) {
    const conv = convenios.get(f.unitId);
    if (params.excluirConvenioAlDia && conv?.alDia) f.excluida = "Convenio de pago al día";
    else if (f.interes < 0.01) f.excluida = "Menos de un centavo";
  }
  return [...porUnidad.values()].sort((a, b) => b.interes - a.interes);
}
