import { redirect } from "next/navigation";
import { getCurrentProfile, getAdminStats, getOrgMaintenance } from "@/lib/queries";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RequestManager } from "./request-manager";

const statusLabels: Record<string, { label: string; className: string }> = {
  new: { label: "Nuevo", className: "border-blue-300 text-blue-700 bg-blue-50" },
  in_review: { label: "En revision", className: "border-amber-300 text-amber-700 bg-amber-50" },
  in_progress: { label: "En progreso", className: "border-purple-300 text-purple-700 bg-purple-50" },
  resolved: { label: "Resuelto", className: "border-emerald-300 text-emerald-700 bg-emerald-50" },
};

export default async function AdminPage() {
  const profile = await getCurrentProfile();

  if (!profile?.organization_id) return null;

  // Role protection
  if (profile.role !== "admin" && profile.role !== "super_admin") {
    redirect("/dashboard");
  }

  const [stats, maintenance] = await Promise.all([
    getAdminStats(profile.organization_id),
    getOrgMaintenance(profile.organization_id),
  ]);

  const pendingRequests = maintenance.filter(
    (m) => m.status !== "resolved" && m.status !== "cancelled"
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Panel de Administracion</h1>
        <p className="text-muted-foreground">Vista general de tu condominio</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total unidades</p>
            <p className="text-3xl font-bold">{stats.totalUnits}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Pagos al dia</p>
            <p className="text-3xl font-bold text-emerald-600">{stats.paymentRate}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Unidades con deuda</p>
            <p className="text-3xl font-bold text-red-600">{stats.overdueCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Solicitudes abiertas</p>
            <p className="text-3xl font-bold text-amber-600">{stats.openRequests}</p>
          </CardContent>
        </Card>
      </div>

      {/* Solicitudes — gestión interactiva */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Solicitudes de mantenimiento</CardTitle>
          <CardDescription>{pendingRequests.length} pendientes — toca una para gestionar</CardDescription>
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
            <div className="rounded-lg border p-3 text-center">
              <p className="text-xs text-muted-foreground">Recaudado</p>
              <p className="text-xl font-bold text-emerald-600">${stats.totalIncome.toFixed(2)}</p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <p className="text-xs text-muted-foreground">Gastos</p>
              <p className="text-xl font-bold text-red-600">${stats.totalExpenses.toFixed(2)}</p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <p className="text-xs text-muted-foreground">Balance</p>
              <p className={`text-xl font-bold ${stats.balance >= 0 ? "text-primary" : "text-red-600"}`}>
                ${stats.balance.toFixed(2)}
              </p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <p className="text-xs text-muted-foreground">Tasa cobranza</p>
              <p className="text-xl font-bold">{stats.paymentRate}%</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
