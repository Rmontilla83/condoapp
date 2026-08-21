/**
 * Etiquetas en español para los valores que la base guarda en inglés.
 *
 * El propietario reportaba una fuga eligiendo "Plomería" y al día siguiente su
 * reporte decía `PLUMBING`; su apartamento aparecía como `APARTMENT`. Cada una
 * es un detalle mínimo, pero juntas le dicen "esto no está hecho para mí".
 *
 * Centralizadas acá a propósito: estaban duplicadas por pantalla y se iban
 * separando entre sí.
 */

export const UNIT_TYPE_LABELS: Record<string, string> = {
  apartment: "Apto",
  house: "Casa",
  penthouse: "PH",
  local: "Local",
  office: "Oficina",
  parking: "Estacionamiento",
  storage: "Depósito",
};

export const MAINTENANCE_CATEGORY_LABELS: Record<string, string> = {
  plumbing: "Plomería",
  electrical: "Electricidad",
  structural: "Estructura",
  elevator: "Ascensor",
  security: "Seguridad",
  cleaning: "Limpieza",
  access: "Acceso",
  hvac: "Aire acondicionado",
  common_area: "Área común",
  other: "Otro",
};

export const MAINTENANCE_STATUS_LABELS: Record<string, string> = {
  new: "Nuevo",
  in_review: "En revisión",
  in_progress: "En curso",
  resolved: "Resuelto",
  cancelled: "Cancelado",
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  transfer: "Transferencia",
  mobile_payment: "Pago móvil",
  zelle: "Zelle",
  paypal: "PayPal",
  binance: "Binance",
  cash: "Efectivo",
  other: "Otro",
};

/** Devuelve la etiqueta en español, o el valor crudo si no está mapeado. */
export function label(map: Record<string, string>, value: string | null | undefined): string {
  if (!value) return "";
  return map[value] ?? value;
}
