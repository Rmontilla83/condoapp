import { redirect } from "next/navigation";
import {
  getCurrentProfile,
  getEffectiveRole,
  getCurrentBudget,
  getExpenseCategories,
  getExpensesForYear,
} from "@/lib/queries";
import { executedByCategory } from "@/lib/budget";
import { BudgetEditor } from "./budget-editor";
import type { ExpenseCategory, OrgBudget, OrgBudgetItem } from "@/types/database";

export default async function BudgetPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) redirect("/dashboard");

  const effectiveRole = getEffectiveRole(profile);
  if (effectiveRole !== "admin" && effectiveRole !== "super_admin") {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const yearParam = params.year ? parseInt(params.year, 10) : null;
  const year = Number.isFinite(yearParam) ? (yearParam as number) : new Date().getFullYear();

  const [budgetData, categories, expenses] = await Promise.all([
    getCurrentBudget(profile.organization_id, year),
    getExpenseCategories(profile.organization_id),
    getExpensesForYear(profile.organization_id, year),
  ]);

  const budget = (budgetData?.budget as OrgBudget | undefined) ?? null;
  const items = (budgetData?.items as OrgBudgetItem[] | undefined) ?? [];
  const cats = categories as ExpenseCategory[];

  const executed = executedByCategory(
    expenses.map((e) => ({
      category_id: e.category_id as string,
      amount: Number(e.amount),
      expense_date: e.expense_date as string,
      voided_at: (e.voided_at as string | null) ?? null,
    })),
  );

  return (
    <div className="space-y-8">
      <div>
        <span className="font-meta-loose text-cyan">PRESUPUESTO ANUAL</span>
        <h1 className="mt-4 font-display text-[clamp(1.75rem,3.5vw,2.5rem)] leading-[1.1] tracking-[-0.03em] text-marine-deep">
          Presupuesto <em className="font-editorial text-cyan">{year}</em>
        </h1>
        <p className="mt-3 text-[15px] text-mute">
          Define el monto mensual por categoría. La columna ANUAL suma los 12 meses.
          Cuando el presupuesto está aprobado, los residentes lo ven en /finanzas.
        </p>
      </div>

      <BudgetEditor
        year={year}
        budget={budget}
        items={items}
        categories={cats}
        executedByCategoryId={executed}
      />
    </div>
  );
}
