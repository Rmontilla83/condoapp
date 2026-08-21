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


/**
 * Describe un vencimiento en el idioma del propietario.
 *
 * El dashboard mostraba solo un número grande: alguien con la cuota de enero
 * vencida hace 40 días veía exactamente lo mismo que alguien al día con una sola
 * cuota por vencer. La pregunta con la que abre la app —"¿le debo algo y para
 * cuándo?"— quedaba a medio responder.
 */
export function describeDueDate(
  dueDate: string,
  today: string,
): { label: string; tone: "vencida" | "hoy" | "pronto" | "normal" } {
  const dias = Math.round(
    (Date.parse(`${dueDate}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000,
  )

  if (dias < 0) {
    const n = Math.abs(dias)
    return {
      label: n === 1 ? "VENCIDA HACE 1 DÍA" : `VENCIDA HACE ${n} DÍAS`,
      tone: "vencida",
    }
  }
  if (dias === 0) return { label: "VENCE HOY", tone: "hoy" }
  if (dias === 1) return { label: "Vence mañana", tone: "pronto" }
  if (dias <= 7) return { label: `Vence en ${dias} días`, tone: "pronto" }

  const fecha = new Date(`${dueDate}T00:00:00Z`).toLocaleDateString("es", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  })
  return { label: `Vence el ${fecha}`, tone: "normal" }
}

/**
 * Minutos de desfase de una zona horaria en un instante dado.
 *
 * Se calcula formateando el instante en esa zona y volviéndolo a leer como si
 * fuera UTC: la diferencia entre ambos es el desfase. Es la única forma de
 * obtenerlo sin una librería, y respeta el horario de verano de países que lo
 * usan (Chile, México), no solo el UTC-4 fijo de Venezuela.
 */
function tzOffsetMinutes(instant: Date, timeZone: string): number {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
    .formatToParts(instant)
    .reduce<Record<string, string>>((acc, p) => {
      acc[p.type] = p.value
      return acc
    }, {})

  const comoUTC = Date.UTC(
    Number(partes.year),
    Number(partes.month) - 1,
    Number(partes.day),
    Number(partes.hour) % 24,
    Number(partes.minute),
    Number(partes.second),
  )
  return (comoUTC - instant.getTime()) / 60_000
}

/**
 * Convierte una fecha y hora locales del condominio en un instante absoluto.
 *
 * Las reservas se guardaban como `2026-08-22T14:00:00`, sin desfase. Postgres
 * lee eso en UTC, así que "de 2 a 4 de la tarde" quedaba grabado como 14:00 UTC
 * = 10:00 de la mañana en Venezuela. Cuatro horas de corrimiento en cada reserva,
 * y `min_advance_hours` rechazaba reservas legítimas porque las creía en el
 * pasado.
 *
 * @param fecha `YYYY-MM-DD` tal como la eligió el residente
 * @param hora  `HH:MM` en la hora del condominio
 */
export function zonedToISO(
  fecha: string,
  hora: string,
  timeZone: string = DEFAULT_TIME_ZONE,
): string {
  const comoSiFueraUTC = Date.parse(`${fecha}T${hora}:00Z`)
  if (Number.isNaN(comoSiFueraUTC)) {
    throw new Error(`Fecha u hora inválida: ${fecha} ${hora}`)
  }
  const desfase = tzOffsetMinutes(new Date(comoSiFueraUTC), timeZone)
  let instante = comoSiFueraUTC - desfase * 60_000
  // Segunda pasada: si la fecha cae justo en un cambio de horario, el desfase
  // que aplicamos no era el que rige en el instante resultante.
  const desfaseReal = tzOffsetMinutes(new Date(instante), timeZone)
  if (desfaseReal !== desfase) {
    instante = comoSiFueraUTC - desfaseReal * 60_000
  }
  return new Date(instante).toISOString()
}

/** Hora del día (`2:00 p. m.`) en la zona del condominio. */
export function formatTimeInZone(
  iso: string,
  timeZone: string = DEFAULT_TIME_ZONE,
): string {
  return new Intl.DateTimeFormat("es", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso))
}

/** Día (`sáb, 22 ago`) en la zona del condominio. */
export function formatDateInZone(
  iso: string,
  timeZone: string = DEFAULT_TIME_ZONE,
): string {
  return new Intl.DateTimeFormat("es", {
    timeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(iso))
}
