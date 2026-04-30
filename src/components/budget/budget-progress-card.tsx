import type { ExpenseCategory, OrgBudget, OrgBudgetItem } from "@/types/database";
import { computeYearlyAmount } from "@/lib/budget";

interface Props {
  budget: OrgBudget;
  items: OrgBudgetItem[];
  executedByCategoryId: Record<string, number>;
  categories: ExpenseCategory[];
}

export function BudgetProgressCard({ budget, items, executedByCategoryId, categories }: Props) {
  const categoryById = new Map(categories.map((c) => [c.id, c]));

  // Items con presupuesto > 0 ordenados por monto descendente
  const rows = items
    .map((item) => {
      const category = categoryById.get(item.category_id);
      const yearly = computeYearlyAmount(item);
      const executed = executedByCategoryId[item.category_id] ?? 0;
      const pct = yearly > 0 ? (executed / yearly) * 100 : 0;
      return { item, category, yearly, executed, pct };
    })
    .filter((r) => r.yearly > 0)
    .sort((a, b) => b.yearly - a.yearly);

  const totalYearly = rows.reduce((s, r) => s + r.yearly, 0);
  const totalExecuted = rows.reduce((s, r) => s + r.executed, 0);
  const totalPct = totalYearly > 0 ? (totalExecuted / totalYearly) * 100 : 0;

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl bg-card border border-border p-6">
        <p className="font-meta text-mute">PRESUPUESTO {budget.year}</p>
        <p className="mt-2 text-[14px] text-mute italic">
          El presupuesto está aprobado pero sin partidas configuradas todavía.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-card border border-border p-6">
      <div className="flex items-baseline justify-between gap-3 mb-4">
        <div>
          <p className="font-meta text-mute">PRESUPUESTO {budget.year}</p>
          <p className="mt-1 text-[15px] font-medium text-marine-deep">
            Ejecutado vs aprobado por categoría
          </p>
        </div>
        <div className="text-right">
          <p className="font-display text-[22px] text-marine-deep">
            ${totalExecuted.toFixed(0)} <span className="text-mute text-[14px]">/ ${totalYearly.toFixed(0)}</span>
          </p>
          <p className="font-meta text-mute">{totalPct.toFixed(0)}% EJECUTADO</p>
        </div>
      </div>

      <div className="space-y-4">
        {rows.map(({ item, category, yearly, executed, pct }) => {
          const overspent = pct > 100;
          const tone = overspent
            ? "bg-destructive"
            : pct >= 75
              ? "bg-ember"
              : "bg-cyan";
          return (
            <div key={item.id}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[14px] text-marine-deep">
                  <span className="mr-2">{category?.icon ?? "·"}</span>
                  {category?.label ?? "Sin categoría"}
                </span>
                <div className="text-right">
                  <span className={`text-[13px] font-medium ${overspent ? "text-destructive" : "text-marine-deep"}`}>
                    ${executed.toFixed(0)} / ${yearly.toFixed(0)}
                  </span>
                  <span className="font-meta text-mute ml-3">{pct.toFixed(0)}%</span>
                </div>
              </div>
              <div className="h-2 rounded-full bg-cloud overflow-hidden">
                <div
                  className={`h-full rounded-full ${tone} transition-all duration-500`}
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
