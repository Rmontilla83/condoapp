import type { FeeMode, InvoiceKind } from "@/types/database";

/**
 * Insert candidate para invoices. Compatible con shape esperado por
 * supabase.from("invoices").insert(...).
 */
export interface InvoiceInsert {
  organization_id: string;
  unit_id: string;
  amount: number;
  currency: string;
  description: string;
  due_date: string;
  status: "pending";
  kind: InvoiceKind;
  exchange_rate: number | null;
  amount_bs: number | null;
}

export interface ComputeUnit {
  id: string;
  type: string;
  aliquot: number; // 0–100
}

export interface ComputeInput {
  organization_id: string;
  fee_mode: FeeMode;
  due_date: string;
  description: string;
  kind: InvoiceKind;
  currency: string;
  units: ComputeUnit[];
  exchange_rate: number | null;
  // Inputs según modo:
  flat_amount?: number;
  base_amount?: number; // by_aliquot
  type_amounts?: Record<string, number>; // by_type
  manual_amounts?: Record<string, number>; // unit_id -> amount
}

export interface ComputeResult {
  invoices: InvoiceInsert[];
  warnings: string[];
  errors: string[];
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Calcula los amounts por unidad según el modo de cobranza.
 *
 * - **flat**: cada unit recibe `flat_amount`.
 * - **by_aliquot**: `base_amount * aliquot / 100`. Warning si Σ aliquot ≠ 100.
 *   Warning si alguna unit tiene aliquot=0 (recibe $0). NO compensa centavos.
 * - **by_type**: lookup por `unit.type` en `type_amounts`. Error si falta type.
 * - **manual**: lookup por `unit.id` en `manual_amounts`. Error si falta.
 *
 * Retorna `{ invoices, warnings, errors }`. Si `errors` tiene elementos, no
 * generes invoices — el caller debe presentarlos al usuario.
 *
 * Casos cubiertos por verification:
 * - Σ aliquot = 100 → suma exacta del base.
 * - Σ aliquot = 99.7 → warning con monto exacto del derrame total.
 * - aliquot = 0 → invoice $0 + warning.
 * - by_type sin precio para algún type → error.
 * - manual sin amount para algún unit_id → error.
 * - 0 units → error explícito.
 */
export function computeInvoiceAmounts(input: ComputeInput): ComputeResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  if (input.units.length === 0) {
    return {
      invoices: [],
      warnings: [],
      errors: ["No hay unidades en el condominio."],
    };
  }

  if (!input.description.trim()) {
    errors.push("La descripción es obligatoria.");
  }
  if (!input.due_date.match(/^\d{4}-\d{2}-\d{2}$/)) {
    errors.push("Fecha de vencimiento inválida.");
  }

  let perUnit: Map<string, number>;

  switch (input.fee_mode) {
    case "flat": {
      const amt = input.flat_amount;
      if (amt === undefined || Number.isNaN(amt) || amt <= 0) {
        errors.push("Modo plano requiere monto > 0.");
        return { invoices: [], warnings, errors };
      }
      const rounded = round2(amt);
      perUnit = new Map(input.units.map((u) => [u.id, rounded]));
      break;
    }

    case "by_aliquot": {
      const base = input.base_amount;
      if (base === undefined || Number.isNaN(base) || base <= 0) {
        errors.push("Modo por alícuota requiere monto base > 0.");
        return { invoices: [], warnings, errors };
      }
      const sumAliquot = input.units.reduce((s, u) => s + u.aliquot, 0);
      if (Math.abs(sumAliquot - 100) >= 0.01) {
        const totalDerramado = round2((base * sumAliquot) / 100);
        warnings.push(
          `Las alícuotas suman ${sumAliquot.toFixed(2)}% (no 100%). Total derramado será $${totalDerramado.toFixed(2)} en lugar de $${base.toFixed(2)}.`,
        );
      }
      const zeroAliquotUnits = input.units.filter((u) => u.aliquot <= 0);
      if (zeroAliquotUnits.length > 0) {
        warnings.push(
          `${zeroAliquotUnits.length} unidad(es) tienen alícuota 0 y recibirán cuota de $0. Verifica antes de continuar.`,
        );
      }
      perUnit = new Map(
        input.units.map((u) => [u.id, round2((base * u.aliquot) / 100)]),
      );
      break;
    }

    case "by_type": {
      const types = input.type_amounts ?? {};
      const missingTypes = new Set<string>();
      for (const u of input.units) {
        const v = types[u.type];
        if (v === undefined || Number.isNaN(v) || v < 0) {
          missingTypes.add(u.type);
        }
      }
      if (missingTypes.size > 0) {
        errors.push(
          `Faltan montos para los tipos: ${[...missingTypes].join(", ")}. Configúralos en Ajustes.`,
        );
        return { invoices: [], warnings, errors };
      }
      perUnit = new Map(input.units.map((u) => [u.id, round2(types[u.type])]));
      break;
    }

    case "manual": {
      const amounts = input.manual_amounts ?? {};
      const missing: string[] = [];
      for (const u of input.units) {
        const v = amounts[u.id];
        if (v === undefined || Number.isNaN(v) || v < 0) {
          missing.push(u.id);
        }
      }
      if (missing.length > 0) {
        errors.push(`Faltan ${missing.length} monto(s) por configurar.`);
        return { invoices: [], warnings, errors };
      }
      perUnit = new Map(input.units.map((u) => [u.id, round2(amounts[u.id])]));
      break;
    }

    default: {
      errors.push(`Modo de cobranza desconocido: ${input.fee_mode}`);
      return { invoices: [], warnings, errors };
    }
  }

  if (errors.length > 0) return { invoices: [], warnings, errors };

  const invoices: InvoiceInsert[] = input.units.map((u) => {
    const amount = perUnit.get(u.id) ?? 0;
    const amount_bs = input.exchange_rate
      ? round2(amount * input.exchange_rate)
      : null;
    return {
      organization_id: input.organization_id,
      unit_id: u.id,
      amount,
      currency: input.currency,
      description: input.description.trim(),
      due_date: input.due_date,
      status: "pending" as const,
      kind: input.kind,
      exchange_rate: input.exchange_rate,
      amount_bs,
    };
  });

  return { invoices, warnings, errors: [] };
}
