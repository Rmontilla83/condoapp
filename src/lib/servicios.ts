/**
 * Categorías del directorio de servicios (migration 045). El orden es el de la
 * pantalla: primero lo que más se pide en un edificio.
 */
export const CATEGORIAS_SERVICIO = [
  { id: "aire_acondicionado", nombre: "Aires acondicionados" },
  { id: "plomeria", nombre: "Plomería" },
  { id: "electricidad", nombre: "Electricidad" },
  { id: "albanileria", nombre: "Albañilería" },
  { id: "pintura", nombre: "Pintura" },
  { id: "cerrajeria", nombre: "Cerrajería" },
  { id: "fumigacion", nombre: "Fumigación" },
  { id: "linea_blanca", nombre: "Línea blanca" },
  { id: "tecnologia", nombre: "Internet y cámaras" },
  { id: "herreria", nombre: "Herrería" },
  { id: "vidrieria", nombre: "Vidrios y ventanas" },
  { id: "limpieza", nombre: "Limpieza" },
  { id: "jardineria", nombre: "Jardinería" },
  { id: "piscina", nombre: "Piscinas" },
  { id: "mudanzas", nombre: "Mudanzas" },
  { id: "otro", nombre: "Otros" },
] as const;

export type CategoriaServicio = (typeof CATEGORIAS_SERVICIO)[number]["id"];

export const NOMBRE_CATEGORIA: Record<string, string> = Object.fromEntries(
  CATEGORIAS_SERVICIO.map((c) => [c.id, c.nombre]),
);

/**
 * Palabras con las que un vecino pide cada servicio. Las usa el conserje en
 * modo demo para entender "se me dañó el aire" o "necesito un cerrajero".
 */
export const PALABRAS_SERVICIO: Record<CategoriaServicio, RegExp> = {
  aire_acondicionado: /\b(aires?( acondicionados?)?|a\/?c|split|climatizaci\w*|no enfria)\b/,
  plomeria: /\b(plomer\w*|tuberi\w*|fuga\w*|bote de agua|destap\w*|griferi\w*|calentador|filtracion\w*|poceta|lavamanos)\b/,
  electricidad: /\b(electricist\w*|breaker|brequer|enchufe\w*|tomacorriente\w*|corto ?circuito|cableado|electric\w*)\b/,
  albanileria: /\b(albanil\w*|friso|ceramica\w*|remodel\w*|obra|pared\w*|piso\w*)\b/,
  pintura: /\b(pint\w*)\b/,
  cerrajeria: /\b(cerrajer\w*|cerradura\w*|llave\w*|me quede afuera)\b/,
  fumigacion: /\b(fumig\w*|cucaracha\w*|plaga\w*|termita\w*|comejen|zancudo\w*|chiripa\w*)\b/,
  linea_blanca: /\b(nevera\w*|lavadora\w*|secadora\w*|cocina\w*|horno\w*|linea blanca)\b/,
  tecnologia: /\b(internet|wifi|router|camara\w*|cctv|computador\w*|tecnico de redes)\b/,
  herreria: /\b(herrer\w*|reja\w*|soldad\w*|porton\w*)\b/,
  vidrieria: /\b(vidri\w*|ventana\w*|ventanal\w*|puerta de vidrio)\b/,
  limpieza: /\b(limpieza|limpiar|senora de limpieza)\b/,
  jardineria: /\b(jardin\w*|poda\w*|grama)\b/,
  piscina: /\b(piscina\w*)\b/,
  mudanzas: /\b(mudanza\w*|flete\w*)\b/,
  otro: /$^/,
};

/** Número venezolano a formato wa.me: "0414-555-0142" → "584145550142". */
export function enlaceWhatsApp(numero: string | null | undefined): string | null {
  if (!numero) return null;
  let d = numero.replace(/\D/g, "");
  if (d.startsWith("0")) d = `58${d.slice(1)}`;
  if (d.length < 11) return null;
  return `https://wa.me/${d}`;
}
