import { cn } from "@/lib/utils";

type AtryumTone = "ink" | "bone" | "sand" | "current";
type AtryumVariant = "symbol" | "horizontal" | "stacked";

interface AtryumLogoProps {
  variant?: AtryumVariant;
  tone?: AtryumTone;
  className?: string;
  "aria-label"?: string;
}

const FILL: Record<AtryumTone, string> = {
  ink: "#0E1116",
  bone: "#F5F2EC",
  sand: "#D4A574",
  current: "currentColor",
};

export function AtryumSymbol({
  tone = "ink",
  className,
  "aria-hidden": ariaHidden,
}: {
  tone?: AtryumTone;
  className?: string;
  "aria-hidden"?: boolean;
}) {
  const fill = FILL[tone];
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      shapeRendering="geometricPrecision"
      aria-hidden={ariaHidden ?? true}
      focusable="false"
    >
      <g fill={fill}>
        <polygon points="0,64 10,64 36,0 28,0" />
        <polygon points="54,64 64,64 36,0 28,0" />
        <rect x="10" y="40" width="16" height="6" />
        <rect x="38" y="40" width="16" height="6" />
      </g>
    </svg>
  );
}

export function AtryumLogo({
  variant = "horizontal",
  tone = "ink",
  className,
  "aria-label": ariaLabel = "Atryum",
}: AtryumLogoProps) {
  const fill = FILL[tone];

  if (variant === "symbol") {
    return (
      <AtryumSymbol
        tone={tone}
        className={className}
        aria-hidden={!ariaLabel}
      />
    );
  }

  if (variant === "stacked") {
    return (
      <svg
        viewBox="0 0 120 160"
        className={className}
        shapeRendering="geometricPrecision"
        role="img"
        aria-label={ariaLabel}
      >
        <g transform="translate(28 0)" fill={fill}>
          <polygon points="0,64 10,64 36,0 28,0" />
          <polygon points="54,64 64,64 36,0 28,0" />
          <rect x="10" y="40" width="16" height="6" />
          <rect x="38" y="40" width="16" height="6" />
        </g>
        <text
          x="60"
          y="130"
          textAnchor="middle"
          fontFamily="var(--font-sans), Inter, system-ui, sans-serif"
          fontWeight="500"
          fontSize="46"
          letterSpacing="-0.02em"
          fill={fill}
        >
          atryum
        </text>
      </svg>
    );
  }

  // horizontal (default)
  return (
    <svg
      viewBox="0 0 280 72"
      className={cn("h-auto", className)}
      shapeRendering="geometricPrecision"
      role="img"
      aria-label={ariaLabel}
    >
      <g transform="translate(4 4)" fill={fill}>
        <polygon points="0,64 10,64 36,0 28,0" />
        <polygon points="54,64 64,64 36,0 28,0" />
        <rect x="10" y="40" width="16" height="6" />
        <rect x="38" y="40" width="16" height="6" />
      </g>
      <text
        x="86"
        y="52"
        fontFamily="var(--font-sans), Inter, system-ui, sans-serif"
        fontWeight="500"
        fontSize="52"
        letterSpacing="-1"
        fill={fill}
      >
        atryum
      </text>
    </svg>
  );
}
