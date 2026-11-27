import { createAdminClient } from "@/lib/supabase/admin";
import { gastoEnUsd, serieDeTasas } from "@/lib/contabilidad/gastos";
import { redirect } from "next/navigation";
import {
  getCurrentProfile,
  getEffectiveRole,
  getCurrentBudget,
  getExpenseAccounts,
  getExpenseCategories,
  getExpensesForYear,
} from "@/lib/queries";
import { executedByCategory } from "@/lib/budget";
import { BudgetEditor } from "./budget-editor";
import { CategoryManager } from "./category-manager";
import type { ExpenseAccount, ExpenseCategory, OrgBudget, OrgBudgetItem } from "@/types/database";

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

  const [budgetData, categories, cuentasData, expenses] = await Promise.all([
    getCurrentBudget(profile.organization_id, year),
    getExpenseCategories(profile.organization_id),
    getExpenseAccounts(profile.organization_id),
    getExpensesForYear(profile.organization_id, year),
  ]);

  const budget = (budgetData?.budget as OrgBudget | undefined) ?? null;
  const items = (budgetData?.items as OrgBudgetItem[] | undefined) ?? [];
  const cats = categories as ExpenseCategory[];
  const cuentas = cuentasData as ExpenseAccount[];

  const tasas = await serieDeTasas(createAdminClient(), profile.organization_id);
  const executed = executedByCategory(
    expenses.map((e) => ({
      category_id: e.category_id as string,
      amount: gastoEnUsd(e as { amount: number; currency: string; expense_date: string }, tasas),
      expense_date: e.expense_date as string,
      voided_at: (e.voided_at as string | null) ?? null,
    })),
  );

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <span className="font-meta-loose text-cyan-ink">PRESUPUESTO ANUAL</span>
          <h1 className="mt-4 font-display text-[clamp(1.75rem,3.5vw,2.5rem)] leading-[1.1] tracking-[-0.03em] text-marine-deep">
            Presupuesto <em className="font-editorial text-cyan">{year}</em>
          </h1>
          <p className="mt-3 text-[15px] text-mute">
            Define el monto mensual por categoría. La columna ANUAL suma los 12 meses.
            Cuando el presupuesto está aprobado, los residentes lo ven en /finanzas.
          </p>
        </div>
        <CategoryManager categories={cats} />
      </div>

      <BudgetEditor
        year={year}
        budget={budget}
        items={items}
        categories={cats}
        executedByCategoryId={executed}
      />

      {cuentas.length > 0 && (
        <section>
          <h2 className="font-display text-[20px] text-marine-deep">Cuentas de gasto</h2>
          <p className="mt-1 text-[14px] text-mute">
            Al registrar un gasto se elige su cuenta. De ella salen la categoría que ve el vecino y la cuenta contable del libro.
          </p>
          <div className="mt-4 overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border bg-frost text-left text-[11px] uppercase tracking-[0.06em] text-mute">
                  <th className="px-3 py-2 font-medium">Categoría</th>
                  <th className="px-3 py-2 font-medium">Código</th>
                  <th className="px-3 py-2 font-medium">Cuenta de gasto</th>
                  <th className="px-3 py-2 font-medium">Cuenta contable</th>
                </tr>
              </thead>
              <tbody>
                {cats.flatMap((c) =>
                  cuentas
                    .filter((k) => k.category_id === c.id)
                    .map((k, i) => (
                      <tr key={k.id} className="border-b border-border last:border-0">
                        <td className="px-3 py-2 text-marine-deep">{i === 0 ? c.label : ""}</td>
                        <td className="px-3 py-2 font-mono text-[12px]">{k.code}</td>
                        <td className="px-3 py-2">{k.label}</td>
                        <td className="px-3 py-2">
                          {k.ledger_code ? (
                            <>
                              <span className="font-mono text-[12px] text-mute">{k.ledger_code}</span> {k.ledger_name}
                            </>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    )),
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
