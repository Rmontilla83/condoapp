/**
 * Tipos y textos de los datos en verificación. Sin acceso a la base: lo pueden
 * importar los componentes del navegador. La consulta está en verificacion-pendiente.ts.
 */
export interface DatoPendiente {
  campo: "alicuota" | "puesto" | "propietario" | "marina" | "contacto";
  /** rojo: hay una diferencia entre las fuentes. amarillo: falta información. */
  estado: "rojo" | "amarillo";
  motivo: string | null;
}

export const NOMBRE_DATO: Record<DatoPendiente["campo"], string> = {
  alicuota: "Alícuota",
  propietario: "Propietario",
  contacto: "Contacto",
  marina: "Marina",
  puesto: "Puesto de estacionamiento",
};

/** «Propietario y alícuota», para una etiqueta corta. */
export function resumenPendientes(datos: DatoPendiente[]): string {
  const nombres = datos.map((d) => NOMBRE_DATO[d.campo].toLowerCase());
  if (nombres.length <= 1) return nombres[0] ?? "";
  return `${nombres.slice(0, -1).join(", ")} y ${nombres.at(-1)}`;
}
