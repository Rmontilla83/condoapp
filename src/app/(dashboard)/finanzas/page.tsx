import { getCurrentProfile, getEffectiveRole } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { NewExpenseDialog } from "./new-expense-dialog";

export default async function FinanzasPage() {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return null;

  const supabase = await createClient();

  const [invoicesRes, expensesRes, transactionsRes] = await Promise.all([
    supabase
      .from("invoices")
      .select("amount, status")
      .eq("organization_id", profile.organization_id),
    supabase
      .from("expense_records")
      .select("category, description, amount, expense_date, receipt_url")
      .eq("organization_id", profile.organization_id)
      .order("expense_date", { ascending: false }),
    supabase
      .from("transactions")
      .select("amount, paid_at, invoices!inner(organization_id)")
      .eq("invoices.organization_id", profile.organization_id)
      .order("paid_at", { ascending: false }),
  ]);

  const expenses = expensesRes.data ?? [];
  const transactions = transactionsRes.data ?? [];
  const invoices = invoicesRes.data ?? [];

  const totalIncome = transactions.reduce((s, t) => s + Number(t.amount), 0);
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const balance = totalIncome - totalExpenses;
  const totalPending = invoices
    .filter((i) => i.status === "pending" || i.status === "overdue")
    .reduce((s, i) => s + Number(i.amount), 0);

  const byCategory: Record<string, number> = {};
  for (const e of expenses) {
    byCategory[e.category] = (byCategory[e.category] ?? 0) + Number(e.amount);
  }
  const categories = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);

  const categoryAccent: Record<string, string> = {
    Mantenimiento: "bg-sand",
    Limpieza: "bg-steel",
    Seguridad: "bg-destructive",
    Servicios: "bg-mute",
  };

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="font-meta-loose text-steel">FINANZAS</span>
          <h1 className="mt-4 font-display text-[clamp(1.75rem,3.5vw,2.5rem)] leading-[1.1] tracking-[-0.03em] text-ink">
            Transparencia <em className="font-editorial text-steel">financiera</em>
          </h1>
          <p className="mt-3 text-[15px] text-mute">
            Exactamente en qué se gasta el dinero de tu condominio.
          </p>
        </div>
        {(getEffectiveRole(profile) === "admin" || getEffectiveRole(profile) === "super_admin") && (
          <NewExpenseDialog />
        )}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-2xl bg-card border border-border p-5">
          <p className="font-meta text-mute">RECAUDADO</p>
          <p className="mt-3 font-display text-[28px] leading-none tracking-[-0.02em] text-steel">
            ${totalIncome.toFixed(2)}
          </p>
        </div>
        <div className="rounded-2xl bg-card border border-border p-5">
          <p className="font-meta text-mute">GASTOS</p>
          <p className="mt-3 font-display text-[28px] leading-none tracking-[-0.02em] text-ink">
            ${totalExpenses.toFixed(2)}
          </p>
        </div>
        <div className="rounded-2xl bg-card border border-border p-5">
          <p className="font-meta text-mute">BALANCE</p>
          <p
            className={`mt-3 font-display text-[28px] leading-none tracking-[-0.02em] ${
              balance >= 0 ? "text-ink" : "text-destructive"
            }`}
          >
            ${balance.toFixed(2)}
          </p>
        </div>
        <div className="rounded-2xl bg-card border border-border p-5">
          <p className="font-meta text-mute">POR COBRAR</p>
          <p className="mt-3 font-display text-[28px] leading-none tracking-[-0.02em] text-sand">
            ${totalPending.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Gastos por categoría */}
      <div className="rounded-2xl bg-card border border-border p-6">
        <p className="font-meta text-mute">GASTOS POR CATEGORÍA</p>
        <p className="mt-2 text-[15px] font-medium text-ink mb-6">
          Distribución del gasto total
        </p>

        {categories.length === 0 ? (
          <p className="py-6 text-center text-[13px] text-mute">No hay gastos registrados</p>
        ) : (
          <div className="space-y-5">
            {categories.map(([cat, amount]) => {
              const pct = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0;
              const color = categoryAccent[cat] ?? "bg-mute";
              return (
                <div key={cat}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[14px] font-medium text-ink">{cat}</span>
                    <div>
                      <span className="text-[14px] font-medium text-ink">${amount.toFixed(2)}</span>
                      <span className="font-meta text-mute ml-3">{pct.toFixed(0)}%</span>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-cloud overflow-hidden">
                    <div
                      className={`h-full rounded-full ${color} transition-all duration-500`}
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
        <p className="mt-2 text-[15px] font-medium text-ink mb-5">
          Cada gasto documentado
        </p>

        {expenses.length === 0 ? (
          <p className="py-6 text-center text-[13px] text-mute">No hay gastos registrados</p>
        ) : (
          <div className="space-y-0">
            {expenses.map((expense, idx) => (
              <div key={idx} className="flex items-center justify-between py-3.5 border-b border-border last:border-0">
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${categoryAccent[expense.category] ?? "bg-mute"}`} />
                  <div className="min-w-0">
                    <p className="text-[14px] font-medium text-ink truncate">{expense.description}</p>
                    <p className="font-meta text-mute truncate">
                      {expense.category.toUpperCase()} ·{" "}
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
                  <span className="text-[14px] font-medium text-ink">
                    −${Number(expense.amount).toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
