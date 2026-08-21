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
  /**
   * 0–100. NULL = sin configurar, que NO es lo mismo que 0 (exenta por
   * decisión). Colapsar los dos a 0 facturaba $0 en silencio a una unidad que
   * simplemente nadie había cargado.
   */
  aliquot: number | null;
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
  divide_total_amount?: number; // divide_total: costo total a repartir en partes iguales
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

function roundTo(n: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}

/**
 * Reparte `total` entre las unidades según sus `weights`, garantizando que la
 * suma sea EXACTAMENTE `total` (compensa el residuo de redondeo en la unidad
 * con mayor peso). Si Σweights ≤ 0, todas reciben 0.
 *
 * `decimals` por defecto 2, que es dinero. El editor de alícuotas la reutiliza
 * con 4 decimales para que el criterio de residuo sea UNO SOLO en todo el
 * sistema: si el editor repartiera con su propia regla, las alícuotas semilla
 * podrían no cuadrar con el reparto real de las cuotas.
 */
export function distributeExact(
  total: number,
  weights: Array<{ id: string; w: number }>,
  decimals: number = 2,
): Map<string, number> {
  const map = new Map<string, number>();
  const sumW = weights.reduce((s, x) => s + x.w, 0);
  if (sumW <= 0) {
    for (const x of weights) map.set(x.id, 0);
    return map;
  }
  let allocated = 0;
  for (const x of weights) {
    const amt = x.w > 0 ? roundTo((total * x.w) / sumW, decimals) : 0;
    map.set(x.id, amt);
    allocated = roundTo(allocated + amt, decimals);
  }
  const residual = roundTo(total - allocated, decimals);
  if (residual !== 0) {
    const target = weights
      .filter((x) => x.w > 0)
      .sort((a, b) => b.w - a.w)[0];
    if (target) map.set(target.id, roundTo((map.get(target.id) ?? 0) + residual, decimals));
  }
  return map;
}

/**
 * Calcula los amounts por unidad según el modo de cobranza.
 *
 * - **flat**: cada unit recibe `flat_amount`.
 * - **divide_total**: reparte `divide_total_amount` en partes iguales entre todas
 *   las units. Σ montos = total exacto (compensa centavos en la unidad mayor).
 * - **by_aliquot**: reparte `base_amount` proporcional a la alícuota de cada unit
 *   (`base * aliquot / Σaliquot`). Σ montos = base exacto. Warning si Σ aliquot ≠ 100
 *   o si alguna unit tiene aliquot=0 (recibe $0). Error si TODAS tienen aliquot=0.
 * - **by_type**: lookup por `unit.type` en `type_amounts`. Error si falta type.
 * - **manual**: lookup por `unit.id` en `manual_amounts`. Error si falta.
 *
 * Retorna `{ invoices, warnings, errors }`. Si `errors` tiene elementos, no
 * generes invoices — el caller debe presentarlos al usuario.
 *
 * Casos cubiertos por verification:
 * - by_aliquot con Σ aliquot ≠ 100 → reparto proporcional, total = base exacto.
 * - by_aliquot con alguna aliquot = 0 → invoice $0 + warning.
 * - by_aliquot con TODAS aliquot = 0 → error explícito.
 * - divide_total → partes iguales, total exacto.
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

    case "divide_total": {
      const total = input.divide_total_amount;
      if (total === undefined || Number.isNaN(total) || total <= 0) {
        errors.push("Modo dividir total requiere un costo total > 0.");
        return { invoices: [], warnings, errors };
      }
      // Reparto en partes iguales (peso 1 por unidad), exacto al centavo.
      perUnit = distributeExact(
        total,
        input.units.map((u) => ({ id: u.id, w: 1 })),
      );
      break;
    }

    case "by_aliquot": {
      const base = input.base_amount;
      if (base === undefined || Number.isNaN(base) || base <= 0) {
        errors.push("Modo por alícuota requiere monto base > 0.");
        return { invoices: [], warnings, errors };
      }
      const sumAliquot = input.units.reduce((s, u) => s + (u.aliquot ?? 0), 0);
      if (sumAliquot <= 0) {
        errors.push(
          "Ninguna unidad tiene alícuota cargada. Cárgalas en Unidades → Alícuotas antes de cobrar por alícuota.",
        );
        return { invoices: [], warnings, errors };
      }

      // Sin configurar = error, no warning: facturarle $0 a una unidad porque
      // nadie cargó su alícuota es un error de cobranza silencioso, y ahora hay
      // una pantalla donde arreglarlo.
      const sinConfigurar = input.units.filter((u) => u.aliquot === null);
      if (sinConfigurar.length > 0) {
        errors.push(
          `${sinConfigurar.length} unidad(es) no tienen alícuota cargada y recibirían cuota de $0. ` +
            "Complétalas en Unidades → Alícuotas, o ponles 0 si están exentas a propósito.",
        );
        return { invoices: [], warnings, errors };
      }

      // Exentas a propósito: solo se avisa.
      const exentas = input.units.filter((u) => u.aliquot === 0);
      if (exentas.length > 0) {
        warnings.push(
          `${exentas.length} unidad(es) están exentas (alícuota 0) y recibirán cuota de $0.`,
        );
      }
      if (Math.abs(sumAliquot - 100) >= 0.01) {
        warnings.push(
          `Las alícuotas suman ${sumAliquot.toFixed(2)}% (no 100%). Se reparte el total de $${base.toFixed(2)} de forma proporcional para que el cobro sea exacto.`,
        );
      }
      // Reparto proporcional a la alícuota: Σ montos = base exacto.
      perUnit = distributeExact(
        base,
        input.units.map((u) => ({ id: u.id, w: u.aliquot ?? 0 })),
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
