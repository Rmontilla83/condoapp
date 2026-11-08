/**
 * Matriz de verificación de la carga. Cada unidad tiene cinco datos, y cada dato
 * un color. El general es el peor de los cinco.
 */
export const CAMPOS = ["alicuota", "puesto", "propietario", "marina", "contacto"] as const;

export type Campo = (typeof CAMPOS)[number];
export type Color = "verde" | "amarillo" | "rojo";

export const ETIQUETA_CAMPO: Record<Campo, string> = {
  alicuota: "Alícuota",
  puesto: "Puesto",
  propietario: "Propietario",
  marina: "Marina",
  contacto: "Contacto",
};

export const ETIQUETA_COLOR: Record<Color, string> = {
  verde: "Verificado",
  amarillo: "Incompleto",
  rojo: "Por aclarar",
};

export interface DatoVerificado {
  id: string;
  campo: Campo;
  estado: Color;
  /** El color que cuenta: un dato aclarado por la administración pasa a verde. */
  efectivo: Color;
  fuente: string | null;
  valorFuente: string | null;
  valorPlanilla: string | null;
  motivo: string | null;
  aclaracion: string | null;
  aclaradoPor: string | null;
  aclaradoEn: string | null;
}

export interface FilaVerificacion {
  unitId: string;
  torre: string;
  unidad: string;
  propietario: string | null;
  general: Color;
  datos: Partial<Record<Campo, DatoVerificado>>;
}

export interface HallazgoColectivo {
  titulo: string;
  motivo: string | null;
  total: number;
  pendientes: number;
}

export function colorEfectivo(estado: Color, aclaradoEn: string | null): Color {
  return aclaradoEn ? "verde" : estado;
}

/** Un dato que no se pudo revisar no puede dejar la unidad en verde. */
export function colorGeneral(datos: Partial<Record<Campo, { efectivo: Color }>>): Color {
  const colores = CAMPOS.map((c) => datos[c]?.efectivo ?? "amarillo");
  if (colores.includes("rojo")) return "rojo";
  if (colores.includes("amarillo")) return "amarillo";
  return "verde";
}
