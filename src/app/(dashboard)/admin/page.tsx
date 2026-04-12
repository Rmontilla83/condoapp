import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const stats = [
  { label: "Total unidades", value: "48", icon: "building" },
  { label: "Pagos al día", value: "85%", icon: "check", accent: "text-emerald-600" },
  { label: "Morosos", value: "7", icon: "alert", accent: "text-red-600" },
  { label: "Solicitudes abiertas", value: "3", icon: "ticket", accent: "text-amber-600" },
];

const recentPayments = [
  { unit: "4A", name: "María García", amount: 85, date: "Hoy", status: "paid" },
  { unit: "7C", name: "Carlos López", amount: 85, date: "Ayer", status: "paid" },
  { unit: "2B", name: "Ana Rodríguez", amount: 85, date: "Hace 2 días", status: "paid" },
];

const morosos = [
  { unit: "5D", name: "Pedro Hernández", amount: 170, months: 2 },
  { unit: "1A", name: "Luis Torres", amount: 85, months: 1 },
  { unit: "8B", name: "Carmen Silva", amount: 255, months: 3 },
];

const pendingRequests = [
  { id: "1", title: "Fuga de agua piso 3", unit: "3B", status: "in_progress" as const, priority: "high" },
  { id: "2", title: "Foco fundido estacionamiento", unit: "N/A", status: "in_review" as const, priority: "medium" },
  { id: "3", title: "Puerta de entrada no cierra", unit: "PB", status: "new" as const, priority: "high" },
];

const statusLabels = {
  new: { label: "Nuevo", className: "border-blue-300 text-blue-700 bg-blue-50" },
  in_review: { label: "En revisión", className: "border-amber-300 text-amber-700 bg-amber-50" },
  in_progress: { label: "En progreso", className: "border-purple-300 text-purple-700 bg-purple-50" },
};

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Panel de Administración</h1>
        <p className="text-muted-foreground">Vista general de tu condominio</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className={`text-3xl font-bold ${stat.accent || ""}`}>{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Morosos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              Morosos
            </CardTitle>
            <CardDescription>Unidades con pagos pendientes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {morosos.map((m) => (
                <div key={m.unit} className="flex items-center justify-between rounded-lg border border-red-100 bg-red-50/50 p-3">
                  <div>
                    <p className="text-sm font-medium">{m.name}</p>
                    <p className="text-xs text-muted-foreground">Apto {m.unit} — {m.months} {m.months === 1 ? "mes" : "meses"}</p>
                  </div>
                  <span className="text-sm font-bold text-red-600">${m.amount}</span>
                </div>
              ))}
              <p className="text-xs text-muted-foreground text-center pt-2">
                Total por cobrar: <strong className="text-red-600">${morosos.reduce((s, m) => s + m.amount, 0)}</strong>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Pagos recientes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <svg className="h-5 w-5 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Pagos recientes
            </CardTitle>
            <CardDescription>Últimos pagos recibidos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentPayments.map((p) => (
                <div key={p.unit} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">Apto {p.unit} — {p.date}</p>
                  </div>
                  <span className="text-sm font-bold text-emerald-600">+${p.amount}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Solicitudes pendientes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Solicitudes de mantenimiento pendientes</CardTitle>
          <CardDescription>Requieren atención</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {pendingRequests.map((req) => (
              <div key={req.id} className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-3">
                  <div className={`h-2 w-2 rounded-full ${
                    req.priority === "high" ? "bg-red-500" : "bg-amber-500"
                  }`} />
                  <div>
                    <p className="text-sm font-medium">{req.title}</p>
                    <p className="text-xs text-muted-foreground">Ubicación: {req.unit}</p>
                  </div>
                </div>
                <Badge variant="outline" className={statusLabels[req.status].className}>
                  {statusLabels[req.status].label}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Resumen financiero */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Resumen financiero del mes</CardTitle>
          <CardDescription>Abril 2026</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="rounded-lg border p-3 text-center">
              <p className="text-xs text-muted-foreground">Ingresos esperados</p>
              <p className="text-xl font-bold">$4,080</p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <p className="text-xs text-muted-foreground">Recaudado</p>
              <p className="text-xl font-bold text-emerald-600">$3,485</p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <p className="text-xs text-muted-foreground">Gastos</p>
              <p className="text-xl font-bold text-red-600">$2,100</p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <p className="text-xs text-muted-foreground">Balance</p>
              <p className="text-xl font-bold text-primary">$1,385</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
