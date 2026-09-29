/**
 * Reglas de una cuota (recibo) desde la migration 052.
 *
 * Una cuota puede estar abonada en parte: `paid_amount` lo mantiene la base
 * con los pagos aprobados. Lo que se DEBE es el monto menos lo abonado; usar
 * `amount` a secas cobraría dos veces lo que el vecino ya pagó.
 */

/** Estados en los que la cuota todavía tiene algo por pagar. */
export const ESTADOS_ABIERTOS = ["pending", "overdue", "partial"] as const;

export function estaAbierta(status: string): boolean {
  return (ESTADOS_ABIERTOS as readonly string[]).includes(status);
}

/** Lo que falta por pagar de la cuota, nunca negativo. */
export function pendienteDe(c: { amount: number | string; paid_amount?: number | string | null }): number {
  const r = Math.round((Number(c.amount) - Number(c.paid_amount ?? 0)) * 100) / 100;
  return r > 0 ? r : 0;
}

/** «N° 00000123». Los saldos de apertura no llevan número. */
export function numeroRecibo(n: number | string | null | undefined): string {
  if (n === null || n === undefined || n === "") return "Saldo anterior";
  return `N° ${String(n).padStart(8, "0")}`;
}

export function numeroNotaCredito(n: number | string): string {
  return `NC-${String(n).padStart(6, "0")}`;
}

export const ETIQUETA_TIPO: Record<string, string> = {
  monthly: "Cuota ordinaria",
  extraordinary: "Cuota extraordinaria",
  opening: "Saldo anterior",
  interest: "Intereses de mora",
};

/**
 * La cuota vista como «lo que hay que pagar»: `amount` pasa a ser el saldo
 * pendiente (y `amount_bs` su equivalente) y el monto emitido queda en
 * `monto_original`. Para listas de cobro (FAB, inicio, diálogo de pago); los
 * documentos (recibo, estado de cuenta) usan la cuota tal cual.
 */
export function comoPendiente<
  T extends { amount: number | string; paid_amount?: number | string | null; amount_bs?: number | string | null; exchange_rate?: number | string | null },
>(c: T): T & { monto_original: number; abonado: number } {
  const original = Number(c.amount);
  const abonado = Math.round(Number(c.paid_amount ?? 0) * 100) / 100;
  const pendiente = pendienteDe(c);
  const tasa = Number(c.exchange_rate ?? 0);
  return {
    ...c,
    amount: pendiente,
    amount_bs: c.amount_bs == null ? c.amount_bs : tasa > 0 ? Math.round(pendiente * tasa * 100) / 100 : c.amount_bs,
    monto_original: original,
    abonado,
  };
}
