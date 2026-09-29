/**
 * Orden natural de unidades: por torre, y dentro de la torre PB primero, luego
 * por piso y número, y PH al final.
 *
 * Ordenar por `unit_number` como texto mezclaba las torres (1-1 A, 1-1 B, 1-1 C)
 * y ponía "1-10" antes de "1-2".
 */
export function claveDeUnidad(unitNumber: string): [number, number, string] {
  const n = unitNumber.trim().toUpperCase();
  const num = (s: string) => Number(s.match(/\d+/)?.[0] ?? 0);
  if (n.startsWith("PB")) return [-1, num(n.slice(2)), n];
  if (n.startsWith("PH")) return [9999, num(n.slice(2)), n];
  const m = n.match(/^(\d+)\D+(\d+)/);
  if (m) return [Number(m[1]), Number(m[2]), n];
  return [num(n), 0, n];
}

export function compararUnidades(
  a: { unit_number: string; block?: string | null },
  b: { unit_number: string; block?: string | null },
): number {
  const ta = a.block ?? "";
  const tb = b.block ?? "";
  if (ta !== tb) return ta.localeCompare(tb, "es");
  const [pa, na, sa] = claveDeUnidad(a.unit_number);
  const [pb, nb, sb] = claveDeUnidad(b.unit_number);
  return pa - pb || na - nb || sa.localeCompare(sb, "es");
}
