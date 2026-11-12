import type { SupabaseClient } from "@supabase/supabase-js";
import { estaAbierta, pendienteDe } from "@/lib/cuotas";

/**
 * La cobranza del mes en curso, para el panel de la administración.
 *
 * Cada recibo pertenece al mes en que vence. Con eso se separan dos deudas:
 *
 *   deuda del mes     lo que falta por cobrar de los recibos que vencen este mes.
 *   deuda anterior    lo que falta de recibos de meses pasados: la morosidad.
 *
 * Y dos porcentajes:
 *
 *   cobranza del mes  de lo facturado este mes, cuánto ya se cobró.
 *   morosidad         de todas las unidades, cuántas deben algún mes pasado.
 *                     Se mide por unidades y no por montos (Rafael, 2026-11-12):
 *                     es la cifra que una Junta espera, «cuántos vecinos no
 *                     están al día». El monto va aparte, en la deuda anterior.
 *
 * «Recaudado» es dinero que entró este mes, se haya aplicado a un recibo de
 * este mes o a uno viejo. Por eso no es lo mismo que «cobrado de las cuotas
 * del mes»: un vecino que hoy paga tres meses atrasados sube lo recaudado y
 * baja la morosidad, pero no mueve la cobranza del mes.
 */
export interface CobranzaDelMes {
  /** «noviembre de 2026». */
  mes: string;
  /** Dinero que entró en el mes, sin contar saldo a favor aplicado. */
  recaudado: number;
  recaudadoACuotasDelMes: number;
  recaudadoADeudaAnterior: number;
  pagos: number;
  /** Lo facturado con vencimiento en el mes. */
  facturadoDelMes: number;
  cobradoDelMes: number;
  /** 0 a 100, o null si este mes no hay nada facturado. */
  pctCobranza: number | null;
  deudaDelMes: number;
  unidadesConDeudaDelMes: number;
  deudaAnterior: number;
  unidadesMorosas: number;
  /** Unidades sin ningún mes anterior pendiente. Pueden deber el mes en curso, que no ha vencido. */
  unidadesAlDia: number;
  totalPorCobrar: number;
  /** Unidades morosas ÷ unidades, de 0 a 100. null si el condominio no tiene unidades. */
  pctMorosidad: number | null;
  totalUnidades: number;
  /**
   * El mes en curso entró como saldo anterior: lo «facturado» es lo que estaba
   * pendiente el día de corte, no la cuota completa del mes.
   */
  mesDeApertura: boolean;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Con el cliente de servicio: suma recibos de todas las unidades. Quien llama ya comprobó que es administración. */
export async function cobranzaDelMes(db: SupabaseClient, orgId: string, hoy: string, tz: string): Promise<CobranzaDelMes> {
  const [anio, mesN] = hoy.split("-").map(Number);
  const desde = `${hoy.slice(0, 7)}-01`;
  const hasta = new Date(Date.UTC(anio, mesN, 1)).toISOString().slice(0, 10); // primer día del mes siguiente
  const diaLocal = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: tz });

  const recibos: { id: string; unit_id: string; amount: number; paid_amount: number | null; status: string; due_date: string; kind: string }[] = [];
  for (let i = 0; ; i += 1000) {
    const { data, error } = await db
      .from("invoices")
      .select("id, unit_id, amount, paid_amount, status, due_date, kind")
      .eq("organization_id", orgId)
      .neq("status", "cancelled")
      .order("id")
      .range(i, i + 999);
    if (error) throw new Error(error.message);
    recibos.push(...((data ?? []) as typeof recibos));
    if (!data || data.length < 1000) break;
  }
  const [{ data: pagosCrudos, error: errorPagos }, { count: totalUnidades }] = await Promise.all([
    db
      .from("transactions")
      .select("amount, paid_at, invoices!inner(organization_id, due_date)")
      .eq("invoices.organization_id", orgId)
      .eq("status", "approved")
      // El saldo a favor aplicado no es dinero nuevo: se contó al recibirlo.
      .neq("payment_method", "credit")
      .gte("paid_at", `${new Date(Date.UTC(anio, mesN - 1, 0)).toISOString().slice(0, 10)}T00:00:00Z`),
    db.from("units").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
  ]);
  if (errorPagos) throw new Error(errorPagos.message);

  let recaudado = 0;
  let aMes = 0;
  let aAnterior = 0;
  let pagos = 0;
  for (const p of pagosCrudos ?? []) {
    const dia = diaLocal(p.paid_at as string);
    if (dia < desde || dia >= hasta) continue;
    const inv = (Array.isArray(p.invoices) ? p.invoices[0] : p.invoices) as { due_date?: string } | null;
    const monto = Number(p.amount);
    recaudado += monto;
    pagos++;
    if ((inv?.due_date ?? "") < desde) aAnterior += monto;
    else aMes += monto;
  }

  const delMes = recibos.filter((r) => r.due_date >= desde && r.due_date < hasta);
  const facturadoDelMes = r2(delMes.reduce((s, r) => s + Number(r.amount), 0));
  const abiertas = recibos.filter((r) => estaAbierta(r.status));
  const pendienteMes = abiertas.filter((r) => r.due_date >= desde && r.due_date < hasta);
  const pendienteAnterior = abiertas.filter((r) => r.due_date < desde);
  const deudaDelMes = r2(pendienteMes.reduce((s, r) => s + pendienteDe(r), 0));
  const deudaAnterior = r2(pendienteAnterior.reduce((s, r) => s + pendienteDe(r), 0));
  const totalPorCobrar = r2(abiertas.reduce((s, r) => s + pendienteDe(r), 0));
  const cobradoDelMes = r2(facturadoDelMes - deudaDelMes);
  const morosas = new Set(pendienteAnterior.filter((r) => pendienteDe(r) > 0).map((r) => r.unit_id)).size;
  const unidades = totalUnidades ?? 0;

  return {
    mes: new Date(Date.UTC(anio, mesN - 1, 15)).toLocaleDateString("es-VE", { month: "long", year: "numeric", timeZone: "UTC" }),
    recaudado: r2(recaudado),
    recaudadoACuotasDelMes: r2(aMes),
    recaudadoADeudaAnterior: r2(aAnterior),
    pagos,
    facturadoDelMes,
    cobradoDelMes,
    pctCobranza: facturadoDelMes > 0 ? Math.round((cobradoDelMes / facturadoDelMes) * 1000) / 10 : null,
    deudaDelMes,
    unidadesConDeudaDelMes: new Set(pendienteMes.filter((r) => pendienteDe(r) > 0).map((r) => r.unit_id)).size,
    deudaAnterior,
    unidadesMorosas: morosas,
    unidadesAlDia: Math.max(unidades - morosas, 0),
    totalPorCobrar,
    pctMorosidad: unidades > 0 ? Math.round((morosas / unidades) * 1000) / 10 : null,
    totalUnidades: unidades,
    mesDeApertura: delMes.some((r) => r.kind === "opening"),
  };
}
