import type { OrgBudgetItem } from "@/types/database";

/**
 * Calcula el monto presupuestado para un mes específico (1-12).
 * Si hay override en monthly_overrides[month] lo usa, sino el monthly_amount base.
 */
export function computeMonthlyAmount(item: OrgBudgetItem, month: number): number {
  const overrides = item.monthly_overrides ?? {};
  const monthKey = String(month);
  if (monthKey in overrides && typeof overrides[monthKey] === "number") {
    return Number(overrides[monthKey]);
  }
  return Number(item.monthly_amount ?? 0);
}

/**
 * Suma anual del item: 12 meses computados con overrides.
 */
export function computeYearlyAmount(item: OrgBudgetItem): number {
  let total = 0;
  for (let m = 1; m <= 12; m++) {
    total += computeMonthlyAmount(item, m);
  }
  return total;
}

/**
 * Suma anual del presupuesto entero.
 */
export function computeYearlyBudget(items: OrgBudgetItem[]): number {
  return items.reduce((sum, item) => sum + computeYearlyAmount(item), 0);
}

interface ExecutedExpense {
  category_id: string;
  amount: number;
  expense_date: string;
  voided_at: string | null;
}

/**
 * Suma ejecutada por categoría (excluye voided).
 * Si filterYear se pasa, solo incluye expenses de ese año.
 */
export function executedByCategory(
  expenses: ExecutedExpense[],
  filterYear?: number,
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const e of expenses) {
    if (e.voided_at) continue;
    if (filterYear !== undefined) {
      const year = new Date(e.expense_date).getFullYear();
      if (year !== filterYear) continue;
    }
    result[e.category_id] = (result[e.category_id] ?? 0) + Number(e.amount);
  }
  return result;
}
