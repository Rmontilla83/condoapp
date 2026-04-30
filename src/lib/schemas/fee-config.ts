import type { FeeMode } from "@/types/database";

export const FEE_MODES: FeeMode[] = ["flat", "by_aliquot", "by_type", "manual"];

export const FEE_MODE_LABELS: Record<FeeMode, string> = {
  flat: "Plano (mismo monto para todas)",
  by_aliquot: "Por alícuota (% del total)",
  by_type: "Por tipo de unidad",
  manual: "Manual (monto por unidad)",
};

export const FEE_MODE_DESCRIPTIONS: Record<FeeMode, string> = {
  flat: "El admin ingresa un monto único y todas las unidades pagan lo mismo.",
  by_aliquot: "El admin ingresa el total mensual del condo. Cada unidad paga base × alícuota/100.",
  by_type: "Configura un monto por tipo de unidad (apartamento, PH, local, etc.).",
  manual: "Cada vez que generas cuotas decides el monto unidad por unidad.",
};

export const UNIT_TYPES = [
  "apartment",
  "house",
  "penthouse",
  "local",
  "office",
] as const;

export const UNIT_TYPE_LABELS: Record<string, string> = {
  apartment: "Apartamento",
  house: "Casa",
  penthouse: "Penthouse",
  local: "Local",
  office: "Oficina",
};

export interface FeeConfigInput {
  fee_mode: FeeMode;
  fee_base_amount: number | null;
  late_fee_pct: number | null;
}

export interface FeeConfigValidation {
  ok: boolean;
  config?: FeeConfigInput;
  error?: string;
}

export function validateFeeConfig(input: unknown): FeeConfigValidation {
  if (!input || typeof input !== "object") {
    return { ok: false, error: "Configuración inválida" };
  }
  const o = input as Record<string, unknown>;

  const mode = o.fee_mode;
  if (typeof mode !== "string" || !FEE_MODES.includes(mode as FeeMode)) {
    return { ok: false, error: "Modo de cobranza inválido" };
  }

  let fee_base_amount: number | null = null;
  if (o.fee_base_amount !== null && o.fee_base_amount !== undefined && o.fee_base_amount !== "") {
    const v = typeof o.fee_base_amount === "string" ? parseFloat(o.fee_base_amount) : Number(o.fee_base_amount);
    if (Number.isNaN(v) || v < 0) {
      return { ok: false, error: "Monto base inválido" };
    }
    fee_base_amount = Math.round(v * 100) / 100;
  }

  if (mode === "by_aliquot" && (fee_base_amount === null || fee_base_amount <= 0)) {
    return { ok: false, error: "Por alícuota requiere monto base > 0" };
  }

  let late_fee_pct: number | null = null;
  if (o.late_fee_pct !== null && o.late_fee_pct !== undefined && o.late_fee_pct !== "") {
    const v = typeof o.late_fee_pct === "string" ? parseFloat(o.late_fee_pct) : Number(o.late_fee_pct);
    if (Number.isNaN(v) || v < 0 || v > 99.99) {
      return { ok: false, error: "Recargo por mora debe estar entre 0 y 99.99" };
    }
    late_fee_pct = Math.round(v * 100) / 100;
  }

  return {
    ok: true,
    config: {
      fee_mode: mode as FeeMode,
      fee_base_amount,
      late_fee_pct,
    },
  };
}

export interface FeeTypeAmountInput {
  unit_type: string;
  amount: number;
}

export function validateFeeTypeAmounts(input: unknown): {
  ok: boolean;
  rows?: FeeTypeAmountInput[];
  error?: string;
} {
  if (!Array.isArray(input)) return { ok: false, error: "Formato inválido" };

  const rows: FeeTypeAmountInput[] = [];
  const seenTypes = new Set<string>();

  for (let i = 0; i < input.length; i++) {
    const r = input[i];
    if (!r || typeof r !== "object") return { ok: false, error: `Fila #${i + 1} inválida` };

    const unit_type = typeof r.unit_type === "string" ? r.unit_type.trim() : "";
    if (!unit_type) return { ok: false, error: `Fila #${i + 1}: tipo requerido` };

    const v = typeof r.amount === "string" ? parseFloat(r.amount) : Number(r.amount);
    if (Number.isNaN(v) || v < 0) {
      return { ok: false, error: `Fila #${i + 1}: monto inválido` };
    }
    if (seenTypes.has(unit_type)) {
      return { ok: false, error: `Tipo "${unit_type}" duplicado` };
    }
    seenTypes.add(unit_type);
    rows.push({ unit_type, amount: Math.round(v * 100) / 100 });
  }

  return { ok: true, rows };
}

export interface FeeBreakdownItemInput {
  id?: string;
  concept: string;
  amount: number;
  is_active: boolean;
}

export function validateFeeBreakdownItems(input: unknown): {
  ok: boolean;
  items?: FeeBreakdownItemInput[];
  error?: string;
} {
  if (!Array.isArray(input)) return { ok: false, error: "Formato inválido" };

  const items: FeeBreakdownItemInput[] = [];

  for (let i = 0; i < input.length; i++) {
    const r = input[i];
    if (!r || typeof r !== "object") return { ok: false, error: `Item #${i + 1} inválido` };

    const concept = typeof r.concept === "string" ? r.concept.trim().slice(0, 80) : "";
    if (!concept) return { ok: false, error: `Item #${i + 1}: concepto requerido` };

    const v = typeof r.amount === "string" ? parseFloat(r.amount) : Number(r.amount);
    if (Number.isNaN(v) || v < 0) return { ok: false, error: `Item #${i + 1}: monto inválido` };

    const id = typeof r.id === "string" && r.id.length > 0 ? r.id : undefined;
    const is_active = r.is_active !== false;

    items.push({ id, concept, amount: Math.round(v * 100) / 100, is_active });
  }

  return { ok: true, items };
}
