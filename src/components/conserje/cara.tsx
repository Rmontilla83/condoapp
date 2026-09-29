/**
 * Atri, el conserje.
 *
 * Tiene que sentirse como el conserje amigo del edificio, no como un ícono: cara
 * cálida con cejas amables y sonrisa grande, gorra de conserje con visera e
 * insignia, y el uniforme con corbatín. Colores de la marca: gorra y chaqueta
 * marino, banda y corbatín ember, insignia cian. Parpadea cada tanto (salvo con
 * "reducir movimiento").
 */
import { useId } from "react";

export const NOMBRE_CONSERJE = "Atri";

export function CaraConserje({
  tam = 48,
  animada = true,
  className = "",
}: {
  tam?: number;
  animada?: boolean;
  className?: string;
}) {
  // Un id por instancia (con varias caras en pantalla, un clipPath repetido es HTML
  // inválido). Solo caracteres seguros: React 19 genera ids con «» y dos puntos.
  const clip = `atri-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <svg
      width={tam}
      height={tam}
      viewBox="0 0 96 96"
      role="img"
      aria-label={`${NOMBRE_CONSERJE}, el conserje`}
      className={className}
    >
      <defs>
        <clipPath id={clip}>
          <circle cx="48" cy="48" r="48" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clip})`}>
        {/* Fondo */}
        <circle cx="48" cy="48" r="48" fill="#DCEFF9" />

        {/* Uniforme: chaqueta, cuello y corbatín */}
        <path d="M10 100 Q14 74 34 70 L48 78 L62 70 Q82 74 86 100 Z" fill="#0F2E5A" />
        <path d="M34 70 L48 84 L62 70 L57 68 L48 76 L39 68 Z" fill="#F4F7FB" />
        <path d="M41.5 76.5 L48 80 L54.5 76.5 L54.5 84 L48 80.5 L41.5 84 Z" fill="#E8732C" />
        <circle cx="48" cy="80.2" r="1.9" fill="#B4530F" />
        {/* Botones dorados */}
        <circle cx="48" cy="90" r="1.6" fill="#F2C14E" />

        {/* Cuello y orejas */}
        <rect x="41" y="60" width="14" height="12" rx="5" fill="#E9B48A" />
        <ellipse cx="25.5" cy="47" rx="4.2" ry="5.6" fill="#E9B48A" />
        <ellipse cx="70.5" cy="47" rx="4.2" ry="5.6" fill="#E9B48A" />

        {/* Cara */}
        <ellipse cx="48" cy="46" rx="22" ry="23" fill="#F4C7A1" />

        {/* Mejillas */}
        <ellipse cx="35" cy="53" rx="4.4" ry="3" fill="#E8732C" opacity="0.28" />
        <ellipse cx="61" cy="53" rx="4.4" ry="3" fill="#E8732C" opacity="0.28" />

        {/* Cejas amables, un poco levantadas */}
        <path d="M34.5 38.5 Q38.5 35.2 42.5 37.6" fill="none" stroke="#5A3A24" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M53.5 37.6 Q57.5 35.2 61.5 38.5" fill="none" stroke="#5A3A24" strokeWidth="2.4" strokeLinecap="round" />

        {/* Ojos */}
        <g className={animada ? "atri-ojos" : undefined}>
          <ellipse cx="38.8" cy="45" rx="3" ry="3.6" fill="#1B2533" />
          <ellipse cx="57.2" cy="45" rx="3" ry="3.6" fill="#1B2533" />
          <circle cx="39.9" cy="43.6" r="1.05" fill="#FFFFFF" />
          <circle cx="58.3" cy="43.6" r="1.05" fill="#FFFFFF" />
        </g>

        {/* Nariz */}
        <path d="M48 47.5 Q46.6 51.5 48.8 52" fill="none" stroke="#C98A63" strokeWidth="1.8" strokeLinecap="round" />

        {/* Sonrisa grande, abierta */}
        <path d="M38.5 56 Q48 65.5 57.5 56 Q48 59.2 38.5 56 Z" fill="#8A3B22" />
        <path d="M40.6 56.9 Q48 59.2 55.4 56.9 Q48 58.4 40.6 56.9 Z" fill="#FFFFFF" />
        <path d="M38.5 56 Q48 65.5 57.5 56" fill="none" stroke="#5A3A24" strokeWidth="1.6" strokeLinecap="round" />

        {/* Pelo asomando bajo la gorra */}
        <path d="M27 34 Q28 26 36 25 L60 25 Q68 26 69 34 Q64 29 48 29 Q32 29 27 34 Z" fill="#3B2A1E" />

        {/* Gorra de conserje: copa, banda, visera e insignia */}
        <path d="M24 26 Q26 9 48 8 Q70 9 72 26 Z" fill="#0F2E5A" />
        <rect x="24" y="22" width="48" height="6" rx="2" fill="#E8732C" />
        <path d="M22 28.5 Q48 24.5 74 28.5 Q75 33 70 32.4 Q48 29.6 26 32.4 Q21 33 22 28.5 Z" fill="#1E4D8F" />
        <circle cx="48" cy="16" r="4.4" fill="#2FB4E6" stroke="#F4F7FB" strokeWidth="1.4" />
        <path d="M46.2 16.2 L47.6 17.6 L50.2 14.8" fill="none" stroke="#F4F7FB" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}
