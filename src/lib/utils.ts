import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Zona horaria por defecto del producto (la mayoría de condominios en VE). */
export const DEFAULT_TIME_ZONE = "America/Caracas"

/**
 * Fecha de hoy como `YYYY-MM-DD` en la zona horaria del condominio.
 *
 * Comparar vencimientos contra la hora del servidor (UTC) marca las cuotas como
 * vencidas varias horas antes de tiempo en LatAm (UTC-4 a UTC-6). `en-CA` es el
 * locale que formatea ISO sin tener que recomponer las partes a mano.
 */
export function todayInTimeZone(timeZone: string = DEFAULT_TIME_ZONE): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date())
}

/**
 * Una cuota está vencida si pasó su fecha y sigue sin pagarse.
 *
 * NO se deriva de `status`: el valor 'overdue' existe en el CHECK de la tabla
 * pero ningún camino del código lo escribe nunca (ni server action, ni
 * migration, ni cron), así que confiar en él dejaba el badge "Vencido" como
 * código muerto y, del otro lado, marcaba morosos a todo el condominio el mismo
 * día en que se generaban las cuotas.
 */
export function isInvoiceOverdue(
  invoice: { status: string; due_date: string },
  today: string,
): boolean {
  if (invoice.status === "paid" || invoice.status === "cancelled") return false
  return invoice.due_date < today
}
