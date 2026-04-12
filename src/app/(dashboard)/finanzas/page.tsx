import { getCurrentProfile } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

  // Group expenses by category
  const byCategory: Record<string, number> = {};
  for (const e of expenses) {
    byCategory[e.category] = (byCategory[e.category] ?? 0) + Number(e.amount);
  }
  const categories = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);

  const categoryColors: Record<string, string> = {
    Mantenimiento: "bg-amber-500",
    Limpieza: "bg-blue-500",
    Seguridad: "bg-red-500",
    Servicios: "bg-purple-500",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "Outfit, sans-serif" }}>
            Transparencia financiera
          </h1>
          <p className="text-muted-foreground">
            Aqui puedes ver exactamente en que se gasta el dinero de tu condominio
          </p>
        </div>
        {(profile.role === "admin" || profile.role === "super_admin") && (
          <NewExpenseDialog />
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recaudado</p>
            <p className="text-2xl font-extrabold text-emerald-600 mt-1" style={{ fontFamily: "Outfit, sans-serif" }}>
              ${totalIncome.toFixed(2)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Gastos</p>
            <p className="text-2xl font-extrabold text-red-600 mt-1" style={{ fontFamily: "Outfit, sans-serif" }}>
              ${totalExpenses.toFixed(2)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Balance</p>
            <p className={`text-2xl font-extrabold mt-1 ${balance >= 0 ? "text-primary" : "text-red-600"}`} style={{ fontFamily: "Outfit, sans-serif" }}>
              ${balance.toFixed(2)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Por cobrar</p>
            <p className="text-2xl font-extrabold text-amber-600 mt-1" style={{ fontFamily: "Outfit, sans-serif" }}>
              ${totalPending.toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Expenses by category — visual bar chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Gastos por categoria</CardTitle>
          <CardDescription>Distribucion del gasto total</CardDescription>
        </CardHeader>
        <CardContent>
          {categories.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No hay gastos registrados</p>
          ) : (
            <div className="space-y-4">
              {categories.map(([cat, amount]) => {
                const pct = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0;
                const color = categoryColors[cat] ?? "bg-gray-500";
                return (
                  <div key={cat}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium">{cat}</span>
                      <span className="text-sm font-bold">${amount.toFixed(2)}</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full ${color} transition-all duration-500`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{pct.toFixed(0)}% del total</p>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detailed expense list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Detalle de gastos</CardTitle>
          <CardDescription>Cada gasto documentado del condominio</CardDescription>
        </CardHeader>
        <CardContent>
          {expenses.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No hay gastos registrados</p>
          ) : (
            <div className="space-y-0">
              {expenses.map((expense, idx) => (
                <div key={idx} className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full ${categoryColors[expense.category] ?? "bg-gray-400"}`} />
                    <div>
                      <p className="text-sm font-medium">{expense.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {expense.category} — {new Date(expense.expense_date).toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {expense.receipt_url && (
                      <a href={expense.receipt_url} target="_blank" rel="noopener noreferrer" className="block h-8 w-8 rounded border overflow-hidden hover:opacity-80">
                        <img src={expense.receipt_url} alt="Recibo" className="h-full w-full object-cover" />
                      </a>
                    )}
                    <span className="text-sm font-bold text-red-600">-${Number(expense.amount).toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
