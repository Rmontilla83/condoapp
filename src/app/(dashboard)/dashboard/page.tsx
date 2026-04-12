import {
  getCurrentProfile,
  getUserUnitIds,
  getInvoicesForUser,
  getAnnouncements,
  getMaintenanceForUser,
} from "@/lib/queries";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const statusLabels: Record<string, string> = {
  new: "Nuevo",
  in_review: "En revision",
  in_progress: "En progreso",
  resolved: "Resuelto",
};

const statusColors: Record<string, string> = {
  new: "bg-blue-100 text-blue-800",
  in_review: "bg-yellow-100 text-yellow-800",
  in_progress: "bg-orange-100 text-orange-800",
  resolved: "bg-emerald-100 text-emerald-800",
};

export default async function DashboardPage() {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return null;

  const unitIds = await getUserUnitIds(profile.id);
  const [invoices, announcements, requests] = await Promise.all([
    getInvoicesForUser(unitIds),
    getAnnouncements(profile.organization_id),
    getMaintenanceForUser(profile.id),
  ]);

  const pendingTotal = invoices
    .filter((i) => i.status === "pending" || i.status === "overdue")
    .reduce((sum, i) => sum + Number(i.amount), 0);

  const recentAnnouncements = announcements.slice(0, 3);
  const recentRequests = requests.slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Saludo */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Hola, {profile.full_name || "vecino"}
        </h1>
        <p className="text-muted-foreground">
          Aqui tienes un resumen de lo que pasa en tu comunidad.
        </p>
      </div>

      {/* Acciones rapidas */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Link href="/pagos">
          <Card className="cursor-pointer transition-all hover:shadow-md hover:border-primary/30">
            <CardContent className="flex flex-col items-center gap-2 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                </svg>
              </div>
              <span className="text-sm font-medium">Pagar</span>
            </CardContent>
          </Card>
        </Link>
        <Link href="/mantenimiento">
          <Card className="cursor-pointer transition-all hover:shadow-md hover:border-primary/30">
            <CardContent className="flex flex-col items-center gap-2 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
                <svg className="h-6 w-6 text-orange-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <span className="text-sm font-medium">Reportar</span>
            </CardContent>
          </Card>
        </Link>
        <Link href="/comunicados">
          <Card className="cursor-pointer transition-all hover:shadow-md hover:border-primary/30">
            <CardContent className="flex flex-col items-center gap-2 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 010 3.46" />
                </svg>
              </div>
              <span className="text-sm font-medium">Avisos</span>
            </CardContent>
          </Card>
        </Link>
        <Card className="cursor-pointer transition-all hover:shadow-md hover:border-primary/30 opacity-50">
          <CardContent className="flex flex-col items-center gap-2 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
              <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
            </div>
            <span className="text-sm font-medium">Reservar</span>
            <Badge variant="secondary" className="text-[10px]">Pronto</Badge>
          </CardContent>
        </Card>
      </div>

      {/* Estado de cuenta */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Estado de cuenta</CardTitle>
          <CardDescription>Tu resumen financiero actual</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="text-sm text-muted-foreground">Saldo pendiente</p>
              <p className={`text-3xl font-bold ${pendingTotal > 0 ? "text-destructive" : "text-primary"}`}>
                ${pendingTotal.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">USD</p>
            </div>
            {pendingTotal > 0 && (
              <Link href="/pagos">
                <Button>Pagar ahora</Button>
              </Link>
            )}
          </div>
          {pendingTotal === 0 && (
            <p className="mt-3 text-center text-sm text-emerald-600 font-medium">
              Estas al dia con tus pagos
            </p>
          )}
        </CardContent>
      </Card>

      {/* Ultimos comunicados */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Ultimos comunicados</CardTitle>
            <CardDescription>Noticias de tu comunidad</CardDescription>
          </div>
          <Link href="/comunicados">
            <Button variant="ghost" size="sm">Ver todos</Button>
          </Link>
        </CardHeader>
        <CardContent>
          {recentAnnouncements.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">No hay comunicados aun</p>
          ) : (
            <div className="space-y-3">
              {recentAnnouncements.map((a) => (
                <div key={a.id} className="flex items-start gap-3 rounded-lg border p-3">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                    a.priority === "urgent" ? "bg-red-100" : a.priority === "important" ? "bg-yellow-100" : "bg-blue-100"
                  }`}>
                    <div className={`h-2.5 w-2.5 rounded-full ${
                      a.priority === "urgent" ? "bg-red-500" : a.priority === "important" ? "bg-yellow-500" : "bg-blue-500"
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{a.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{a.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mis solicitudes */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Mis solicitudes</CardTitle>
            <CardDescription>Seguimiento de tus reportes</CardDescription>
          </div>
          <Link href="/mantenimiento">
            <Button variant="ghost" size="sm">Ver todas</Button>
          </Link>
        </CardHeader>
        <CardContent>
          {recentRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-sm text-muted-foreground">No tienes solicitudes aun</p>
              <Link href="/mantenimiento">
                <Button variant="outline" size="sm" className="mt-3">Crear un reporte</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentRequests.map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{r.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString("es")}
                    </p>
                  </div>
                  <Badge className={statusColors[r.status] ?? ""} variant="secondary">
                    {statusLabels[r.status] ?? r.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
