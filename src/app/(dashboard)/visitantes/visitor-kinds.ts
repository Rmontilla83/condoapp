import type { VisitorKind } from "@/types/database";

interface VisitorKindMeta {
  id: VisitorKind;
  label: string;
  icon: string;
  defaultHours: number;
}

export const VISITOR_KINDS: readonly VisitorKindMeta[] = [
  { id: "family",    label: "Familia",     icon: "👨‍👩‍👧", defaultHours: 12 },
  { id: "delivery",  label: "Delivery",    icon: "📦",  defaultHours: 2 },
  { id: "rideshare", label: "Uber/Taxi",   icon: "🚗",  defaultHours: 1 },
  { id: "service",   label: "Técnico",     icon: "🔧",  defaultHours: 4 },
  { id: "moving",    label: "Mudanza",     icon: "📦",  defaultHours: 8 },
  { id: "guest",     label: "Genérico",    icon: "👤",  defaultHours: 24 },
  { id: "other",     label: "Otro",        icon: "·",   defaultHours: 24 },
] as const;

export const VISITOR_KIND_BY_ID: Record<VisitorKind, VisitorKindMeta> = Object.fromEntries(
  VISITOR_KINDS.map((k) => [k.id, k]),
) as Record<VisitorKind, VisitorKindMeta>;

export const VISITOR_KIND_IDS = VISITOR_KINDS.map((k) => k.id);

/** Whitelist guard. Devuelve 'guest' si el input no es válido. */
export function normalizeVisitorKind(input: unknown): VisitorKind {
  if (typeof input !== "string") return "guest";
  return VISITOR_KIND_IDS.includes(input as VisitorKind) ? (input as VisitorKind) : "guest";
}

/** Calcula horas válidas: 1 ≤ h ≤ 168 (1 semana). Default por kind si fuera de rango. */
export function resolveDurationHours(kind: VisitorKind, customHours?: number | null): number {
  if (typeof customHours === "number" && customHours >= 1 && customHours <= 168) {
    return Math.round(customHours);
  }
  return VISITOR_KIND_BY_ID[kind].defaultHours;
}
