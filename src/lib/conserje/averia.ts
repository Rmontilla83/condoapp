/**
 * Propuesta de reporte de avería que el conserje le ofrece al vecino.
 *
 * El conserje NO escribe en la base: propone. El vecino ve un formulario ya
 * llenado y es él quien toca "Enviar reporte", que usa la misma acción (y las
 * mismas validaciones) que la sección Mantenimiento.
 */
export interface PropuestaAveria {
  tipo: "reportar_averia";
  titulo: string;
  descripcion: string;
  categoria: string;
  lugar: "unidad" | "area_comun";
}

const CATEGORIAS: [string, RegExp][] = [
  ["elevator", /ascensor/],
  ["plumbing", /(fuga|agua|tuberi|bote|filtraci|poceta|lavamanos|bajante|destap|humedad)/],
  ["electrical", /(luz|electric|breaker|enchufe|bombillo|lampara|corto)/],
  ["hvac", /(aire|split|a\/c)/],
  ["security", /(porton|camara|cerco|reja|seguridad|robo)/],
  ["access", /(puerta|acceso|intercomunicador|control remoto|llave)/],
  ["cleaning", /(basura|sucio|limpieza|olor)/],
  ["structural", /(grieta|pared|techo|piso|friso|ceramica)/],
];

const AREAS_COMUNES = /(pasillo|ascensor|escalera|lobby|estacionamiento|piscina|parrillera|caney|playa|marina|muelle|porton|garita|bomba|tanque|jardin|area comun|areas comunes|fachada|azotea)/;

const norm = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

export function sugerirAveria(texto: string): PropuestaAveria {
  const t = norm(texto);
  const categoria = CATEGORIAS.find(([, re]) => re.test(t))?.[0] ?? "other";
  const limpio = texto
    .trim()
    .replace(/^(quiero|necesito|me gustaria|quisiera)\s+(reportar|avisar)\s+(que\s+)?/i, "")
    .replace(/[¿?¡!]+/g, "")
    .trim();
  const titulo = (limpio.charAt(0).toUpperCase() + limpio.slice(1)).slice(0, 80) || "Avería";
  return {
    tipo: "reportar_averia",
    titulo,
    descripcion: texto.trim().slice(0, 1000),
    categoria,
    lugar: AREAS_COMUNES.test(t) ? "area_comun" : "unidad",
  };
}
