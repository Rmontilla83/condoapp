/**
 * Motivos de rechazo de un comprobante.
 *
 * OJO — por qué vive acá y no en `pagos/actions.ts`:
 * un módulo con `"use server"` solo puede exportar funciones async. Cualquier
 * otro export se compila como *referencia a server action*, así que en el
 * navegador este array llegaba como una función y `REJECTION_REASONS.map(...)`
 * tiraba `TypeError` al abrir el panel de rechazo. El build no lo detecta y el
 * SSR lo tapa: el bug solo aparecía al primer clic.
 *
 * Regla para el repo: constantes y tipos compartidos entre servidor y cliente
 * van en un módulo neutro como este. (`export type` sí es seguro en un archivo
 * "use server" porque desaparece al compilar.)
 *
 * Que el admin elija de una lista en vez de escribir hace que el residente
 * reciba siempre un texto accionable, y que rechazar cueste un toque.
 */
export const REJECTION_REASONS = [
  "No se ve el monto en la captura",
  "La referencia no coincide con el pago",
  "El dinero no llegó a la cuenta",
  "El monto no corresponde a la cuota",
  "El comprobante está repetido",
] as const;

/** Un motivo más corto que esto no le dice nada al residente. */
export const MIN_REASON_LENGTH = 4;

/** Cota defensiva: el motivo se renderiza dentro de una tarjeta en /pagos. */
export const MAX_REASON_LENGTH = 200;

/** Normaliza el motivo antes de guardarlo: colapsa espacios y recorta. */
export function normalizeRejectionReason(reason: string | null | undefined): string {
  return (reason ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_REASON_LENGTH);
}
