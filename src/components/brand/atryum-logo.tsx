import Image from "next/image";
import { cn } from "@/lib/utils";

// Acepta tones canónicos (color/marine/white/black) y alias heredados del
// sweep de la paleta V3 (marine-deep, frost, ember, ink, bone, sand).
// Todos resuelven a uno de los 4 canónicos sin romper llamados existentes.
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

const LOCKUP_SRC: Record<CanonicalTone, string> = {
  color: "/brand/lockup.png",
  marine: "/brand/lockup-marine.png",
  white: "/brand/lockup-white.png",
  black: "/brand/lockup-black.png",
};

const SYMBOL_SRC: Record<CanonicalTone, string> = {
  color: "/brand/symbol.png",
  marine: "/brand/symbol-marine.png",
  white: "/brand/symbol-white.png",
  black: "/brand/symbol-black.png",
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

  // horizontal y stacked usan el lockup (símbolo + wordmark ATRYUM debajo)
  const canonical = resolveTone(tone);
  return (
    <Image
      src={LOCKUP_SRC[canonical]}
      alt={ariaLabel}
      width={800}
      height={240}
      priority={priority}
      className={cn("h-auto w-auto", className)}
      unoptimized
    />
  );
}
