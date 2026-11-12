/**
 * Cómo se muestra el detalle de un evento del historial: qué claves se
 * ocultan, cómo se llaman las demás y cómo se dicen los valores internos.
 * Lo usan el Historial general y la ficha de cada unidad.
 */

/** Claves del detalle que son identificadores internos: no le dicen nada a quien lee. */
export const OCULTAS = new Set(["id", "transaccion", "recibo", "presupuesto", "convenio", "profile_id", "reportado_por", "changes", "decimals", "documento", "version", "tarea", "code_id", "invite_id", "member_id"]);

export const ETIQUETA: Record<string, string> = {
  reason: "Motivo",
  motivo: "Motivo",
  acta: "Acta",
  monto: "Monto",
  moneda: "Moneda",
  descripcion: "Descripción",
  concepto: "Concepto",
  nota: "Nota",
  nombre: "Nombre",
  campo: "Dato",
  fondo: "Fondo",
  porcentaje: "Porcentaje",
  tipo: "Tipo",
  modo: "Modo",
  recibos: "Recibos",
  total: "Total",
  vence: "Vence",
  anuladas: "Anuladas",
  due_date: "Vence",
  description: "Descripción",
  sum_before: "Suma antes",
  sum_after: "Suma después",
  tasa_anual: "Tasa anual (%)",
  estado: "Estado",
  titulo: "Título",
  funcion: "Función",
  cuenta: "Cuenta",
  filas: "Filas",
  cambiadas: "Cambiadas",
  unidad: "Unidad",
  torre: "Torre",
  visible: "Lo ve",
  soporte: "Soporte",
  metodo: "Método",
  referencia: "Referencia",
  saldo_a_favor: "Saldo a favor",
  al_fondo_de_reserva: "Al fondo de reserva",
  al_fondo_de_contingencia: "Al fondo de contingencia",
  con_fondo: "Pagado con",
  anio: "Año",
  partidas: "Partidas",
  role: "Como",
  rol: "Como",
  por: "Hecho por",
  comentario: "Comentario",
};

/** Valores internos que aparecen en el detalle, dichos como los diría una persona. */
const VALOR: Record<string, string> = {
  owner: "propietario",
  tenant: "inquilino",
  owner_occupied: "vive el propietario",
  tenant_with_active_owner: "alquilada, con propietario activo",
  tenant_only: "alquilada, propietario ausente",
  transfer: "transferencia",
  cash: "efectivo",
  mobile_payment: "pago móvil",
  zelle: "Zelle",
  USD: "dólares",
  VES: "bolívares",
};

export function texto(v: unknown): string {
  if (typeof v === "string" && v in VALOR) return VALOR[v];
  if (v === null || v === undefined || v === "") return "";
  if (typeof v === "boolean") return v ? "sí" : "no";
  if (typeof v === "number") return v.toLocaleString("es-VE", { maximumFractionDigits: 5 });
  if (typeof v === "object") {
    return Object.entries(v as Record<string, unknown>)
      .map(([k, x]) => `${k.replace(/_/g, " ")}: ${texto(x)}`)
      .join(", ");
  }
  return String(v);
}

/**
 * Las partes legibles del detalle de un evento, como pares [etiqueta, valor].
 * `nombreDeUnidad` traduce un unit_id; sin él, la unidad se omite (en la ficha
 * de una unidad ya se sabe cuál es).
 */
export function partesDelDetalle(datos: Record<string, unknown>, nombreDeUnidad?: (id: string) => string): [string, string][] {
  return Object.entries(datos)
    .filter(([k, v]) => !OCULTAS.has(k) && k !== "nombre" && v !== null && v !== "" && v !== undefined)
    .filter(([k]) => k !== "unit_id" || Boolean(nombreDeUnidad))
    .map(([k, v]): [string, string] => (k === "unit_id" ? ["Unidad", nombreDeUnidad!(String(v))] : [ETIQUETA[k] ?? k.replace(/_/g, " "), texto(v)]))
    .filter(([, v]) => v !== "");
}
