import type { SupabaseClient } from "@supabase/supabase-js";
import { estaAbierta, pendienteDe } from "@/lib/cuotas";
import { gastoEnUsd, serieDeTasas } from "./gastos";

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Los dos fondos del condominio (migration 070). Funcionan igual; cambia la cuenta del libro. */
export type Fondo = "reserva" | "contingencia";
export const FONDOS: Fondo[] = ["reserva", "contingencia"];
export const NOMBRE_FONDO: Record<Fondo, string> = { reserva: "fondo de reserva", contingencia: "fondo de contingencia" };
export const CUENTA_FONDO: Record<Fondo, string> = { reserva: "2.2.01", contingencia: "2.2.02" };
const COLUMNA: Record<Fondo, "reserve_amount" | "contingency_amount"> = { reserva: "reserve_amount", contingencia: "contingency_amount" };

/**
 * Fondo de reserva (migration 058). El saldo no se guarda: se deriva de los
 * documentos, igual que el libro. Así no puede desalinearse de lo que se emitió,
 * se cobró o se gastó.
 *
 *   saldo = saldo inicial + aportes adicionales ± ajustes
 *         + lo COBRADO de la parte de cada cuota destinada al fondo
 *         - los gastos pagados con el fondo
 *
 * Lo facturado y todavía sin cobrar no es dinero disponible: se muestra aparte.
 * En el libro, la cuenta 2.2.01 es saldo + por cobrar, porque ahí la parte del
 * fondo se acredita al emitir el recibo.
 */
export interface MovimientoFondo {
  clave: string;
  /** Solo los movimientos manuales se pueden anular. */
  movimientoId: string | null;
  tipo: "inicial" | "aporte" | "ajuste" | "cuota" | "gasto";
  fecha: string;
  concepto: string;
  referencia: string | null;
  /** Lo que movió el saldo: positivo entra, negativo sale. */
  monto: number;
  /** Solo en cuotas: lo que falta por cobrar de esa emisión. */
  porCobrar?: number;
}

export interface ResumenFondo {
  saldo: number;
  inicial: number;
  aportes: number;
  ajustes: number;
  cobrado: number;
  porCobrar: number;
  usado: number;
  movimientos: MovimientoFondo[];
}

/** Con el cliente de servicio: un vecino no puede leer las cuotas de los demás, y aquí solo salen agregados. */
export async function resumenFondo(db: SupabaseClient, orgId: string, fondo: Fondo = "reserva"): Promise<ResumenFondo> {
  const columna = COLUMNA[fondo];
  const cuotas: {
    description: string;
    due_date: string;
    amount: number;
    paid_amount: number | null;
    status: string;
    reserve_amount: number;
    contingency_amount: number;
  }[] = [];
  for (let desde = 0; ; desde += 1000) {
    const { data, error } = await db
      .from("invoices")
      .select("description, due_date, amount, paid_amount, status, reserve_amount, contingency_amount")
      .eq("organization_id", orgId)
      .gt(columna, 0)
      .order("due_date")
      .order("id")
      .range(desde, desde + 999);
    if (error) throw new Error(error.message);
    cuotas.push(...((data ?? []) as typeof cuotas));
    if (!data || data.length < 1000) break;
  }

  const [{ data: manuales, error: errorManuales }, { data: gastos, error: errorGastos }, tasas] = await Promise.all([
    db
      .from("reserve_fund_movements")
      .select("id, kind, movement_date, amount, concept, reference")
      .eq("organization_id", orgId)
      .eq("fund", fondo)
      .is("voided_at", null),
    db
      .from("expense_records")
      .select("id, description, amount, currency, expense_date, reserve_acta")
      .eq("organization_id", orgId)
      .eq("paid_from_reserve", true)
      .eq("fund", fondo)
      .is("voided_at", null),
    serieDeTasas(db, orgId),
  ]);
  if (errorManuales) throw new Error(errorManuales.message);
  if (errorGastos) throw new Error(errorGastos.message);

  const movimientos: MovimientoFondo[] = [];
  let inicial = 0;
  let aportes = 0;
  let ajustes = 0;
  for (const m of manuales ?? []) {
    const monto = Number(m.amount);
    if (m.kind === "opening") inicial = r2(inicial + monto);
    else if (m.kind === "contribution") aportes = r2(aportes + monto);
    else ajustes = r2(ajustes + monto);
    movimientos.push({
      clave: `m-${m.id}`,
      movimientoId: m.id as string,
      tipo: m.kind === "opening" ? "inicial" : m.kind === "contribution" ? "aporte" : "ajuste",
      fecha: m.movement_date as string,
      concepto: m.concept as string,
      referencia: (m.reference as string) ?? null,
      monto,
    });
  }

  // Las cuotas se agrupan por emisión: al fondo le importa «Cuota de enero», no cada apartamento.
  const porEmision = new Map<string, MovimientoFondo>();
  let cobrado = 0;
  let porCobrar = 0;
  for (const c of cuotas) {
    const monto = Number(c.amount);
    const parte = Number(c[columna] ?? 0);
    const proporcion = monto > 0 ? parte / monto : 0;
    const anulada = c.status === "cancelled";
    const pagado = monto - pendienteDe(c);
    const cobradoAqui = r2((c.status === "paid" ? monto : pagado) * proporcion);
    const faltaAqui = !anulada && estaAbierta(c.status) ? r2(parte - cobradoAqui) : 0;
    cobrado = r2(cobrado + cobradoAqui);
    porCobrar = r2(porCobrar + faltaAqui);
    const clave = `c-${c.due_date}-${c.description}`;
    const fila = porEmision.get(clave) ?? {
      clave,
      movimientoId: null,
      tipo: "cuota" as const,
      fecha: c.due_date,
      concepto: c.description,
      referencia: null,
      monto: 0,
      porCobrar: 0,
    };
    fila.monto = r2(fila.monto + cobradoAqui);
    fila.porCobrar = r2((fila.porCobrar ?? 0) + faltaAqui);
    porEmision.set(clave, fila);
  }
  movimientos.push(...porEmision.values());

  let usado = 0;
  for (const g of gastos ?? []) {
    const monto = gastoEnUsd(
      { amount: Number(g.amount), currency: g.currency as string, expense_date: g.expense_date as string },
      tasas,
    );
    usado = r2(usado + monto);
    movimientos.push({
      clave: `g-${g.id}`,
      movimientoId: null,
      tipo: "gasto",
      fecha: g.expense_date as string,
      concepto: g.description as string,
      referencia: (g.reserve_acta as string) ?? null,
      monto: -monto,
    });
  }

  movimientos.sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0));

  return {
    saldo: r2(inicial + aportes + ajustes + cobrado - usado),
    inicial,
    aportes,
    ajustes,
    cobrado,
    porCobrar,
    usado,
    movimientos,
  };
}
