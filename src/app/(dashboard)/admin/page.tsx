import { redirect } from "next/navigation";
import { getCurrentProfile, getAdminStats, getOrgMaintenance, getCurrentRate } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RequestManager } from "./request-manager";
import { PaymentReviewer } from "./payment-reviewer";
import { RateUpdater } from "./rate-updater";

export default async function AdminPage() {
  const profile = await getCurrentProfile();

  if (!profile?.organization_id) return null;
  if (profile.role !== "admin" && profile.role !== "super_admin") {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  const rateData = await getCurrentRate(profile.organization_id);

  const [stats, maintenance, pendingPaymentsRes, morosRes] = await Promise.all([
    getAdminStats(profile.organization_id),
    getOrgMaintenance(profile.organization_id),
    // Pending payment receipts
    supabase
      .from("transactions")
      .select("*, invoices(description, units(unit_number))")
      .eq("status", "pending")
      .order("paid_at", { ascending: false }),
    // Morosos: units with pending/overdue invoices
    supabase
      .from("invoices")
      .select("unit_id, amount, status, due_date, units(unit_number)")
      .eq("organization_id", profile.organization_id)
      .in("status", ["pending", "overdue"])
      .order("due_date", { ascending: true }),
  ]);

  const pendingPayments = pendingPaymentsRes.data ?? [];
  const overdueInvoices = morosRes.data ?? [];

  // Group morosos by unit
  const morosMap: Record<string, { unit: string; total: number; count: number; oldest: string }> = {};
  for (const inv of overdueInvoices) {
    const key = inv.unit_id;
    const unitData = Array.isArray(inv.units) ? inv.units[0] : inv.units;
    const unitNum = unitData?.unit_number ?? "?";
    if (!morosMap[key]) {
      morosMap[key] = { unit: unitNum, total: 0, count: 0, oldest: inv.due_date };
    }
    morosMap[key].total += Number(inv.amount);
    morosMap[key].count += 1;
  }
  const morosos = Object.values(morosMap).sort((a, b) => b.total - a.total);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "Outfit, sans-serif" }}>
          Panel de Administracion
        </h1>
        <p className="text-muted-foreground">Vista general de tu condominio</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total unidades</p>
            <p className="text-3xl font-extrabold mt-1" style={{ fontFamily: "Outfit, sans-serif" }}>{stats.totalUnits}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cobranza</p>
            <p className="text-3xl font-extrabold text-emerald-600 mt-1" style={{ fontFamily: "Outfit, sans-serif" }}>{stats.paymentRate}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Morosos</p>
            <p className="text-3xl font-extrabold text-red-600 mt-1" style={{ fontFamily: "Outfit, sans-serif" }}>{morosos.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Solicitudes</p>
            <p className="text-3xl font-extrabold text-amber-600 mt-1" style={{ fontFamily: "Outfit, sans-serif" }}>{stats.openRequests}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tasa BCV */}
      <RateUpdater currentRate={Number(rateData.rate)} effectiveDate={rateData.effective_date} />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Comprobantes pendientes de aprobación */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <svg className="h-5 w-5 text-amber-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185z" />
              </svg>
              Comprobantes por revisar
            </CardTitle>
            <CardDescription>{pendingPayments.length} pendientes de aprobacion</CardDescription>
          </CardHeader>
          <CardContent>
            <PaymentReviewer payments={pendingPayments as any} />
          </CardContent>
        </Card>

        {/* Morosos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              Morosos
            </CardTitle>
            <CardDescription>Unidades con cuotas pendientes o vencidas</CardDescription>
          </CardHeader>
          <CardContent>
            {morosos.length === 0 ? (
              <div className="py-4 text-center">
                <p className="text-sm text-emerald-600 font-medium">Todas las unidades estan al dia</p>
              </div>
            ) : (
              <div className="space-y-3">
                {morosos.map((m) => (
                  <div key={m.unit} className="flex items-center justify-between rounded-xl border border-red-100 bg-red-50/50 p-3">
                    <div>
                      <p className="text-sm font-semibold">Apto {m.unit}</p>
                      <p className="text-xs text-muted-foreground">
                        {m.count} cuota{m.count > 1 ? "s" : ""} — desde {new Date(m.oldest).toLocaleDateString("es", { month: "short", year: "numeric" })}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-red-600">${m.total.toFixed(2)}</span>
                  </div>
                ))}
                <div className="text-center pt-2">
                  <p className="text-xs text-muted-foreground">
                    Total por cobrar: <span className="font-bold text-red-600">${morosos.reduce((s, m) => s + m.total, 0).toFixed(2)}</span>
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Solicitudes — gestión interactiva */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Solicitudes de mantenimiento</CardTitle>
          <CardDescription>Toca una para gestionar — asignar responsable, cambiar estado</CardDescription>
        </CardHeader>
        <CardContent>
          <RequestManager requests={maintenance} />
        </CardContent>
      </Card>

      {/* Resumen financiero */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Resumen financiero</CardTitle>
          <CardDescription>Datos acumulados</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="rounded-xl border p-3 text-center">
              <p className="text-xs text-muted-foreground">Recaudado</p>
              <p className="text-xl font-extrabold text-emerald-600" style={{ fontFamily: "Outfit, sans-serif" }}>${stats.totalIncome.toFixed(2)}</p>
            </div>
            <div className="rounded-xl border p-3 text-center">
              <p className="text-xs text-muted-foreground">Gastos</p>
              <p className="text-xl font-extrabold text-red-600" style={{ fontFamily: "Outfit, sans-serif" }}>${stats.totalExpenses.toFixed(2)}</p>
            </div>
            <div className="rounded-xl border p-3 text-center">
              <p className="text-xs text-muted-foreground">Balance</p>
              <p className={`text-xl font-extrabold ${stats.balance >= 0 ? "text-primary" : "text-red-600"}`} style={{ fontFamily: "Outfit, sans-serif" }}>
                ${stats.balance.toFixed(2)}
              </p>
            </div>
            <div className="rounded-xl border p-3 text-center">
              <p className="text-xs text-muted-foreground">Tasa cobranza</p>
              <p className="text-xl font-extrabold" style={{ fontFamily: "Outfit, sans-serif" }}>{stats.paymentRate}%</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
