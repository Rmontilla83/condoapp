import Image from "next/image";
import { cn } from "@/lib/utils";

// Acepta tones canónicos (color/marine/white/black) y alias heredados.
type CanonicalTone = "color" | "marine" | "white" | "black";
type AtryumTone =
  | CanonicalTone
  | "marine-deep"
  | "frost"
  | "ember"
  | "cyan"
  | "ink"
  | "bone"
  | "sand"
  | "current";

// Variantes:
//   symbol      → solo el isotipo (PNG cuadrado)
//   horizontal  → símbolo + wordmark ATRYUM al lado (composición horizontal)
//   stacked     → lockup original del kit (símbolo encima + wordmark debajo, PNG 1.3:1)
type AtryumVariant = "symbol" | "horizontal" | "stacked";

interface AtryumLogoProps {
  variant?: AtryumVariant;
  tone?: AtryumTone;
  className?: string;
  priority?: boolean;
  "aria-label"?: string;
}

function resolveTone(tone: AtryumTone): CanonicalTone {
  switch (tone) {
    case "marine-deep":
    case "ink":
      return "marine";
    case "frost":
    case "bone":
      return "white";
    case "ember":
    case "sand":
    case "cyan":
    case "current":
      return "color";
    default:
      return tone;
  }
}

const SYMBOL_SRC: Record<CanonicalTone, string> = {
  color: "/brand/symbol.png",
  marine: "/brand/symbol-marine.png",
  white: "/brand/symbol-white.png",
  black: "/brand/symbol-black.png",
};

const STACKED_SRC: Record<CanonicalTone, string> = {
  color: "/brand/lockup.png",
  marine: "/brand/lockup-marine.png",
  white: "/brand/lockup-white.png",
  black: "/brand/lockup-black.png",
};

// Color del wordmark tipográfico (para variant="horizontal")
const WORDMARK_COLOR: Record<CanonicalTone, string> = {
  color: "#1E4D8F", // Marine — según symbols-v3.jsx oficial
  marine: "#1E4D8F",
  white: "#FFFFFF",
  black: "#0F2E5A",
};

export function AtryumSymbol({
  tone = "color",
  className,
  priority,
  "aria-hidden": ariaHidden = true,
}: {
  tone?: AtryumTone;
  className?: string;
  priority?: boolean;
  "aria-hidden"?: boolean;
}) {
  const canonical = resolveTone(tone);
  return (
    <Image
      src={SYMBOL_SRC[canonical]}
      alt="Atryum"
      width={128}
      height={128}
      priority={priority}
      aria-hidden={ariaHidden}
      className={cn("h-auto w-auto", className)}
      unoptimized
    />
  );
}

export function AtryumLogo({
  variant = "horizontal",
  tone = "color",
  className,
  priority,
  "aria-label": ariaLabel = "Atryum",
}: AtryumLogoProps) {
  const canonical = resolveTone(tone);

  // symbol → solo isotipo
  if (variant === "symbol") {
    return (
      <AtryumSymbol
        tone={tone}
        className={className}
        priority={priority}
        aria-hidden={!ariaLabel}
      />
    );
  }

  // stacked → PNG del kit (símbolo + ATRYUM apilados, aspect 1.3:1)
  if (variant === "stacked") {
    return (
      <Image
        src={STACKED_SRC[canonical]}
        alt={ariaLabel}
        width={800}
        height={613}
        priority={priority}
        className={cn("h-auto w-auto", className)}
        unoptimized
      />
    );
  }

  // horizontal → símbolo (PNG) + wordmark ATRYUM tipográfico al lado.
  // Este patrón respeta el manual (variante A Principal) y escala limpio
  // en navs horizontales donde el lockup vertical se ve desproporcionado.
  return (
    <span
      className={cn("inline-flex items-center gap-2.5", className)}
      role="img"
      aria-label={ariaLabel}
    >
      <Image
        src={SYMBOL_SRC[canonical]}
        alt=""
        width={128}
        height={128}
        priority={priority}
        className="h-[1.4em] w-auto"
        unoptimized
      />
      <span
        className="font-display"
        style={{
          color: WORDMARK_COLOR[canonical],
          fontWeight: 700,
          fontSize: "1em",
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          lineHeight: 1,
        }}
      >
        atryum
      </span>
    </span>
  );
}
