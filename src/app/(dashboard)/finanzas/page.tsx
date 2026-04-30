import { getCurrentProfile, getEffectiveRole, getExpenseCategories } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { NewExpenseDialog } from "./new-expense-dialog";
import { VoidExpenseDialog } from "./void-expense-dialog";
import type { ExpenseCategory } from "@/types/database";

interface ExpenseRow {
  id: string;
  description: string;
  amount: number;
  expense_date: string;
  receipt_url: string | null;
  voided_at: string | null;
  voided_reason: string | null;
  category_id: string;
  vendor_id: string | null;
  expense_categories: { id: string; code: string; label: string; icon: string | null } | null;
  vendors: { id: string; name: string } | null;
}

export default async function FinanzasPage() {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return null;

  const isAdmin =
    getEffectiveRole(profile) === "admin" ||
    getEffectiveRole(profile) === "super_admin";

  const supabase = await createClient();

  const [invoicesRes, expensesRes, transactionsRes, categoriesData] = await Promise.all([
    supabase
      .from("invoices")
      .select("amount, status")
      .eq("organization_id", profile.organization_id),
    supabase
      .from("expense_records")
      .select(
        "id, description, amount, expense_date, receipt_url, voided_at, voided_reason, category_id, vendor_id, expense_categories(id, code, label, icon), vendors(id, name)",
      )
      .eq("organization_id", profile.organization_id)
      .order("expense_date", { ascending: false }),
    supabase
      .from("transactions")
      .select("amount, paid_at, invoices!inner(organization_id)")
      .eq("invoices.organization_id", profile.organization_id)
      .eq("status", "approved")
      .order("paid_at", { ascending: false }),
    getExpenseCategories(profile.organization_id),
  ]);

  const expensesAll = (expensesRes.data ?? []) as unknown as ExpenseRow[];
  // Filtrar voided (no cuentan en totales ni gráficos)
  const expenses = expensesAll.filter((e) => e.voided_at === null);
  const transactions = transactionsRes.data ?? [];
  const invoices = invoicesRes.data ?? [];
  const categories = (categoriesData ?? []) as ExpenseCategory[];

  const totalIncome = transactions.reduce((s, t) => s + Number(t.amount), 0);
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const balance = totalIncome - totalExpenses;
  const totalPending = invoices
    .filter((i) => i.status === "pending" || i.status === "overdue")
    .reduce((s, i) => s + Number(i.amount), 0);

  // Aggregate por category_id usando la tabla normalizada
  const byCategoryId: Record<string, number> = {};
  for (const e of expenses) {
    byCategoryId[e.category_id] = (byCategoryId[e.category_id] ?? 0) + Number(e.amount);
  }
  const categoryEntries = Object.entries(byCategoryId)
    .map(([id, amount]) => {
      const cat = categories.find((c) => c.id === id);
      return {
        id,
        label: cat?.label ?? "Sin categoría",
        icon: cat?.icon ?? "·",
        amount,
      };
    })
    .sort((a, b) => b.amount - a.amount);

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="font-meta-loose text-cyan">FINANZAS</span>
          <h1 className="mt-4 font-display text-[clamp(1.75rem,3.5vw,2.5rem)] leading-[1.1] tracking-[-0.03em] text-marine-deep">
            Transparencia <em className="font-editorial text-cyan">financiera</em>
          </h1>
          <p className="mt-3 text-[15px] text-mute">
            Exactamente en qué se gasta el dinero de tu condominio.
          </p>
        </div>
        {isAdmin && <NewExpenseDialog categories={categories} />}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-2xl bg-card border border-border p-5">
          <p className="font-meta text-mute">RECAUDADO</p>
          <p className="mt-3 font-display text-[28px] leading-none tracking-[-0.02em] text-cyan">
            ${totalIncome.toFixed(2)}
          </p>
        </div>
        <div className="rounded-2xl bg-card border border-border p-5">
          <p className="font-meta text-mute">GASTOS</p>
          <p className="mt-3 font-display text-[28px] leading-none tracking-[-0.02em] text-marine-deep">
            ${totalExpenses.toFixed(2)}
          </p>
        </div>
        <div className="rounded-2xl bg-card border border-border p-5">
          <p className="font-meta text-mute">BALANCE</p>
          <p
            className={`mt-3 font-display text-[28px] leading-none tracking-[-0.02em] ${
              balance >= 0 ? "text-marine-deep" : "text-destructive"
            }`}
          >
            ${balance.toFixed(2)}
          </p>
        </div>
        <div className="rounded-2xl bg-card border border-border p-5">
          <p className="font-meta text-mute">POR COBRAR</p>
          <p className="mt-3 font-display text-[28px] leading-none tracking-[-0.02em] text-ember">
            ${totalPending.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Gastos por categoría */}
      <div className="rounded-2xl bg-card border border-border p-6">
        <p className="font-meta text-mute">GASTOS POR CATEGORÍA</p>
        <p className="mt-2 text-[15px] font-medium text-marine-deep mb-6">
          Distribución del gasto total
        </p>

        {categoryEntries.length === 0 ? (
          <p className="py-6 text-center text-[13px] text-mute">No hay gastos registrados</p>
        ) : (
          <div className="space-y-5">
            {categoryEntries.map(({ id, label, icon, amount }) => {
              const pct = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0;
              return (
                <div key={id}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[14px] font-medium text-marine-deep">
                      <span className="mr-2">{icon}</span>
                      {label}
                    </span>
                    <div>
                      <span className="text-[14px] font-medium text-marine-deep">${amount.toFixed(2)}</span>
                      <span className="font-meta text-mute ml-3">{pct.toFixed(0)}%</span>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-cloud overflow-hidden">
                    <div
                      className="h-full rounded-full bg-cyan transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detalle */}
      <div className="rounded-2xl bg-card border border-border p-6">
        <p className="font-meta text-mute">DETALLE</p>
        <p className="mt-2 text-[15px] font-medium text-marine-deep mb-5">
          Cada gasto documentado{" "}
          {expensesAll.length !== expenses.length && (
            <span className="font-meta text-mute">
              · {expensesAll.length - expenses.length} ANULADO{expensesAll.length - expenses.length > 1 ? "S" : ""}
            </span>
          )}
        </p>

        {expensesAll.length === 0 ? (
          <p className="py-6 text-center text-[13px] text-mute">No hay gastos registrados</p>
        ) : (
          <div className="space-y-0">
            {expensesAll.map((expense) => {
              const cat = expense.expense_categories;
              const vendor = expense.vendors;
              const voided = expense.voided_at !== null;
              return (
                <div
                  key={expense.id}
                  className={`flex items-center justify-between py-3.5 border-b border-border last:border-0 ${voided ? "opacity-60" : ""}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-[16px] shrink-0">{cat?.icon ?? "·"}</span>
                    <div className="min-w-0">
                      <p
                        className={`text-[14px] font-medium text-marine-deep truncate ${voided ? "line-through" : ""}`}
                      >
                        {expense.description}
                        {vendor && (
                          <span className="ml-2 font-meta text-cyan">· {vendor.name.toUpperCase()}</span>
                        )}
                        {voided && (
                          <span className="ml-2 font-meta bg-destructive/10 text-destructive px-2 py-0.5 rounded">
                            ANULADO
                          </span>
                        )}
                      </p>
                      <p className="font-meta text-mute truncate">
                        {(cat?.label ?? "Sin categoría").toUpperCase()} ·{" "}
                        {new Date(expense.expense_date).toLocaleDateString("es", {
                          day: "numeric",
                          month: "short",
                        }).toUpperCase()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {expense.receipt_url && (
                      <a
                        href={expense.receipt_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block h-8 w-8 rounded-md border border-border overflow-hidden hover:opacity-80"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={expense.receipt_url} alt="Recibo" className="h-full w-full object-cover" />
                      </a>
                    )}
                    <span className={`text-[14px] font-medium text-marine-deep ${voided ? "line-through" : ""}`}>
                      −${Number(expense.amount).toFixed(2)}
                    </span>
                    {isAdmin && !voided && (
                      <VoidExpenseDialog
                        expenseId={expense.id}
                        expenseDescription={expense.description}
                        expenseAmount={Number(expense.amount)}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
