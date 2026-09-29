import type { SupabaseClient } from "@supabase/supabase-js";
import { numeroNotaCredito, numeroRecibo, pendienteDe, ETIQUETA_TIPO, estaAbierta } from "@/lib/cuotas";
import { PAYMENT_METHOD_LABELS } from "@/lib/labels";

/**
 * Estado de cuenta de una unidad: cada documento que la afecta, en orden, con
 * el saldo corrido. Es la misma historia que cuenta el libro diario, vista
 * desde el apartamento.
 *
 *  - CARGO: cada recibo emitido (también los anulados: el recibo existe) y el
 *    saldo anterior.
 *  - ABONO: cada pago aprobado, cada aplicación de saldo a favor y cada nota de
 *    crédito.
 *
 * El saldo a favor NO resta deuda hasta que se aplica: se informa aparte.
 */

export interface Movimiento {
  fecha: string; // YYYY-MM-DD
  orden: number;
  tipo: "recibo" | "apertura" | "pago" | "saldo_favor" | "nota_credito";
  documento: string;
  concepto: string;
  cargo: number;
  abono: number;
  saldo: number;
  invoiceId?: string;
  /** Solo en recibos: estado actual. */
  estado?: string;
  vence?: string;
  pendiente?: number;
}

export interface CuotaAbierta {
  id: string;
  numero: string;
  concepto: string;
  tipo: string;
  vence: string;
  monto: number;
  abonado: number;
  pendiente: number;
  enRevision: boolean;
  tieneDineroReal: boolean;
}

export interface EstadoDeCuenta {
  unidad: { id: string; etiqueta: string; alicuota: number | null; organizationId: string };
  propietarios: { nombre: string; correo: string | null; telefono: string | null }[];
  movimientos: Movimiento[];
  deuda: number;
  saldoAFavor: number;
  abiertas: CuotaAbierta[];
}

const r2 = (n: number) => Math.round(n * 100) / 100;
const dia = (iso: string, tz: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: tz });

export async function estadoDeCuenta(db: SupabaseClient, unitId: string, tz = "America/Caracas"): Promise<EstadoDeCuenta | null> {
  const { data: unidad } = await db
    .from("units")
    .select("id, unit_number, block, aliquot, organization_id")
    .eq("id", unitId)
    .maybeSingle();
  if (!unidad) return null;

  const [{ data: cuotas }, { data: notas }, { data: creditos }, { data: miembros }] = await Promise.all([
    db
      .from("invoices")
      .select("id, receipt_number, description, kind, amount, paid_amount, status, due_date, created_at")
      .eq("unit_id", unitId)
      .order("created_at"),
    db.from("credit_notes").select("number, invoice_id, amount, reason, created_at").eq("unit_id", unitId),
    db.from("unit_credits").select("amount, kind, note, created_at").eq("unit_id", unitId),
    db
      .from("unit_members")
      .select("role, profiles(full_name, email, phone)")
      .eq("unit_id", unitId)
      .eq("active", true)
      .eq("role", "owner"),
  ]);

  const ids = (cuotas ?? []).map((c) => c.id as string);
  const { data: pagos } = ids.length
    ? await db
        .from("transactions")
        .select("invoice_id, amount, status, payment_method, reference, paid_at, reviewed_at")
        .in("invoice_id", ids)
        .in("status", ["approved", "pending"])
    : { data: [] };

  const porId = new Map((cuotas ?? []).map((c) => [c.id as string, c]));
  const movs: Omit<Movimiento, "saldo">[] = [];

  for (const c of cuotas ?? []) {
    const apertura = c.kind === "opening";
    movs.push({
      // Un recibo cargado después de su vencimiento (histórico) se fecha al
      // vencimiento: si no, sus pagos aparecerían antes que el cargo.
      fecha: apertura ? (c.due_date as string) : [dia(c.created_at as string, tz), c.due_date as string].sort()[0],
      orden: 0,
      tipo: apertura ? "apertura" : "recibo",
      documento: numeroRecibo(c.receipt_number as number | null),
      concepto: `${c.description as string}${c.kind === "extraordinary" || c.kind === "interest" ? ` · ${ETIQUETA_TIPO[c.kind as string]}` : ""}`,
      cargo: Number(c.amount),
      abono: 0,
      invoiceId: c.id as string,
      estado: c.status as string,
      vence: c.due_date as string,
      pendiente: estaAbierta(c.status as string) ? pendienteDe(c) : 0,
    });
  }

  for (const p of (pagos ?? []).filter((p) => p.status === "approved")) {
    const c = porId.get(p.invoice_id as string);
    const credito = p.payment_method === "credit";
    movs.push({
      fecha: dia((credito ? (p.reviewed_at ?? p.paid_at) : p.paid_at) as string, tz),
      orden: 1,
      tipo: credito ? "saldo_favor" : "pago",
      documento: credito ? "Saldo a favor" : p.reference ? `Ref. ${p.reference as string}` : "Pago",
      concepto: credito
        ? `Aplicado a ${numeroRecibo(c?.receipt_number as number | null)}`
        : `${PAYMENT_METHOD_LABELS[p.payment_method as string] ?? "Pago"} · ${numeroRecibo(c?.receipt_number as number | null)}`,
      cargo: 0,
      abono: Number(p.amount),
      invoiceId: p.invoice_id as string,
    });
  }

  for (const n of notas ?? []) {
    const c = porId.get(n.invoice_id as string);
    movs.push({
      fecha: dia(n.created_at as string, tz),
      orden: 2,
      tipo: "nota_credito",
      documento: numeroNotaCredito(n.number as number),
      concepto: `Anula ${numeroRecibo(c?.receipt_number as number | null)}: ${n.reason as string}`,
      cargo: 0,
      abono: Number(n.amount),
      invoiceId: n.invoice_id as string,
    });
  }

  movs.sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : a.orden - b.orden));
  let saldo = 0;
  const movimientos: Movimiento[] = movs.map((m) => {
    saldo = r2(saldo + m.cargo - m.abono);
    return { ...m, saldo };
  });

  const enRevision = new Set((pagos ?? []).filter((p) => p.status === "pending").map((p) => p.invoice_id as string));
  const conDinero = new Set(
    (pagos ?? []).filter((p) => p.status === "approved" && p.payment_method !== "credit").map((p) => p.invoice_id as string),
  );
  const abiertas: CuotaAbierta[] = (cuotas ?? [])
    .filter((c) => estaAbierta(c.status as string) && pendienteDe(c) > 0)
    .sort((a, b) => ((a.due_date as string) < (b.due_date as string) ? -1 : 1))
    .map((c) => ({
      id: c.id as string,
      numero: numeroRecibo(c.receipt_number as number | null),
      concepto: c.description as string,
      tipo: c.kind as string,
      vence: c.due_date as string,
      monto: Number(c.amount),
      abonado: Number(c.paid_amount ?? 0),
      pendiente: pendienteDe(c),
      enRevision: enRevision.has(c.id as string),
      tieneDineroReal: conDinero.has(c.id as string),
    }));

  type Perfil = { full_name: string | null; email: string | null; phone: string | null };
  return {
    unidad: {
      id: unidad.id as string,
      etiqueta: `${unidad.block ? `${unidad.block as string} · ` : ""}${unidad.unit_number as string}`,
      alicuota: unidad.aliquot == null ? null : Number(unidad.aliquot),
      organizationId: unidad.organization_id as string,
    },
    propietarios: (miembros ?? []).map((m) => {
      const p = (Array.isArray(m.profiles) ? m.profiles[0] : m.profiles) as Perfil | null;
      const correo = p?.email && !/\.(test|example|invalid)$/i.test(p.email) ? p.email : null;
      return { nombre: p?.full_name ?? "", correo, telefono: p?.phone ?? null };
    }),
    movimientos,
    deuda: r2(abiertas.reduce((s, c) => s + c.pendiente, 0)),
    saldoAFavor: r2((creditos ?? []).reduce((s, c) => s + Number(c.amount), 0)),
    abiertas,
  };
}
