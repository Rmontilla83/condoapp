/**
 * El vecino paga empezando por lo más antiguo: no puede reportar el pago de un
 * recibo reciente mientras tenga uno anterior sin pagar en la misma unidad.
 *
 * Nació de un caso real: un apartamento con deuda desde enero de 2025 reportó
 * el pago de octubre y noviembre de 2026, y quedó «al día» en los meses nuevos
 * con veinte meses viejos pendientes. La administración ya aplica así los pagos
 * que registra ella misma; esto hace lo mismo con los que reporta el vecino.
 *
 * Dos recibos con el mismo vencimiento (la cuota y la marina del mes) no se
 * bloquean entre sí: solo cuenta lo que vence ANTES.
 */
export interface ReciboEnOrden {
  id: string;
  unit_id: string;
  due_date: string;
}

/** De los recibos abiertos, los que vencen antes que alguno de los elegidos y no están entre ellos. */
export function anterioresSinElegir<T extends ReciboEnOrden>(elegidos: ReciboEnOrden[], abiertos: T[]): T[] {
  const ids = new Set(elegidos.map((e) => e.id));
  const tope = new Map<string, string>();
  for (const e of elegidos) {
    const t = tope.get(e.unit_id);
    if (!t || e.due_date > t) tope.set(e.unit_id, e.due_date);
  }
  return abiertos
    .filter((a) => !ids.has(a.id) && tope.has(a.unit_id) && a.due_date < (tope.get(a.unit_id) as string))
    .sort((a, b) => (a.due_date < b.due_date ? -1 : a.due_date > b.due_date ? 1 : 0));
}
