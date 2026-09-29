/**
 * La marca del condominio: su logo si lo cargó la administración, o un
 * monograma con sus iniciales. Dentro de la app manda el condominio; Atryum
 * queda como firma discreta.
 */
const PARTICULAS = new Set(["de", "del", "la", "las", "los", "el", "y", "residencias", "residencia", "conjunto", "edificio", "condominio"]);

export function iniciales(nombre: string): string {
  const palabras = nombre
    .split(/\s+/)
    .map((p) => p.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter(Boolean);
  const utiles = palabras.filter((p) => !PARTICULAS.has(p.toLowerCase()));
  const base = utiles.length ? utiles : palabras;
  return base
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

export function CondoMarca({
  nombre,
  logoUrl,
  tam = 36,
  tono = "claro",
  className = "",
}: {
  nombre: string;
  logoUrl?: string | null;
  tam?: number;
  /** "claro" sobre fondo blanco; "oscuro" sobre el marino del menú. */
  tono?: "claro" | "oscuro";
  className?: string;
}) {
  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- logo subido por el condominio, tamaño pequeño y fijo
      <img
        src={logoUrl}
        alt={`Logo de ${nombre}`}
        width={tam}
        height={tam}
        className={`shrink-0 rounded-xl bg-white object-contain ${className}`}
        style={{ width: tam, height: tam }}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-xl font-display font-bold tracking-[-0.04em] ${
        tono === "oscuro" ? "bg-frost text-marine-deep" : "bg-marine-deep text-frost"
      } ${className}`}
      style={{ width: tam, height: tam, fontSize: Math.round(tam * 0.4) }}
    >
      {iniciales(nombre)}
    </span>
  );
}
