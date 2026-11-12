/**
 * Búsqueda tolerante para listas cortas (unidades, cuentas).
 *
 * Quien busca no escribe como está guardado: pone «pb8» por «PB-8», «1 1» por
 * «1-1», «narvaez» por «Narváez», o las palabras en otro orden («c pb8»). Se
 * ignoran mayúsculas, acentos, guiones, puntos y espacios, y basta con que
 * cada palabra escrita aparezca en algún lugar del texto.
 */
const sinAcentos = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const compacto = (s: string) => sinAcentos(s).replace(/[^a-z0-9]/g, "");

export function coincide(texto: string, consulta: string): boolean {
  const q = sinAcentos(consulta).trim();
  if (!q) return true;
  const pegado = compacto(texto);
  // Todo lo escrito, seguido («pb8», «pb 8», «pb-8» encuentran «PB-8»).
  if (pegado.includes(compacto(q))) return true;
  // O cada palabra por separado, en cualquier orden («c pb8», «rocha ph1»).
  const palabras = q.split(/\s+/).map(compacto).filter(Boolean);
  return palabras.length > 1 && palabras.every((p) => pegado.includes(p));
}
