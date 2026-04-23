import {
  getCurrentProfile,
  getUserUnitIds,
  getInvoicesForUser,
  getAnnouncements,
  getMaintenanceForUser,
} from "@/lib/queries";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const statusLabels: Record<string, string> = {
  new: "NUEVO",
  in_review: "EN REVISIÓN",
  in_progress: "EN CURSO",
  resolved: "RESUELTO",
  cancelled: "CANCELADO",
};

const statusTone: Record<string, string> = {
  new: "bg-steel/10 text-steel",
  in_review: "bg-sand/15 text-sand",
  in_progress: "bg-sand/15 text-sand",
  resolved: "bg-steel/10 text-steel",
  cancelled: "bg-mute/15 text-mute",
};

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "BUENOS DÍAS";
  if (hour < 19) return "BUENAS TARDES";
  return "BUENAS NOCHES";
}

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

  const firstName = (profile.full_name || "vecino").split(" ")[0];

  return (
    <div className="space-y-10">
      {/* Saludo editorial */}
      <div>
        <span className="font-meta-loose text-steel">{getGreeting()}</span>
        <h1 className="mt-4 font-display text-[clamp(2rem,4.5vw,3.25rem)] leading-[1.02] tracking-[-0.035em] text-ink">
          <em className="font-editorial">{firstName}</em>
        </h1>
        <p className="mt-3 text-[15px] text-mute">
          Aquí está lo que pasa hoy en tu comunidad.
        </p>
      </div>

      {/* Saldo card — manual style */}
      <div className="rounded-2xl bg-card border border-border p-6 md:p-8">
        <div className="flex items-start justify-between gap-5">
          <div className="min-w-0">
            <p className="font-meta text-mute">SALDO PENDIENTE · USD</p>
            <p
              className={`mt-4 font-display text-[clamp(2.75rem,6vw,4rem)] leading-none tracking-[-0.03em] ${
                pendingTotal > 0 ? "text-ink" : "text-steel"
              }`}
            >
              ${pendingTotal.toFixed(2)}
            </p>
            {pendingTotal === 0 && (
              <p className="mt-3 font-meta text-steel">AL DÍA · GRACIAS</p>
            )}
          </div>
          {pendingTotal > 0 && (
            <Link href="/pagos">
              <Button className="h-11 px-5">Pagar ahora</Button>
            </Link>
          )}
        </div>
      </div>

      {/* Acciones rápidas */}
      <div>
        <p className="font-meta text-mute mb-4">ACCIONES RÁPIDAS</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <ActionTile
            href="/pagos"
            label="Pagar"
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
              </svg>
            }
          />
          <ActionTile
            href="/mantenimiento"
            label="Reportar"
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.384 3.174A1 1 0 014.5 17.447V6.553a1 1 0 011.536-.897l5.384 3.174m0 0l5.384-3.174A1 1 0 0118.34 6.553v10.894a1 1 0 01-1.536.897l-5.384-3.174" />
              </svg>
            }
          />
          <ActionTile
            href="/visitantes"
            label="Generar QR"
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
              </svg>
            }
          />
          <ActionTile
            href="/reservas"
            label="Reservar"
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
            }
          />
        </div>
      </div>

      {/* Comunicados + Solicitudes */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Comunicados */}
        <div className="rounded-2xl bg-card border border-border p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="font-meta text-mute">COMUNICADOS</p>
              <p className="mt-2 text-[15px] font-medium text-ink">Hoy en la comunidad</p>
            </div>
            <Link href="/comunicados" className="font-meta text-steel hover:text-ink transition-colors">
              VER TODOS
            </Link>
          </div>

          {recentAnnouncements.length === 0 ? (
            <p className="py-8 text-center text-[13px] text-mute">
              No hay comunicados todavía.
            </p>
          ) : (
            <ul className="space-y-0 -mx-2" role="list">
              {recentAnnouncements.map((a) => {
                const accent =
                  a.priority === "urgent"
                    ? "bg-destructive"
                    : a.priority === "important"
                      ? "bg-sand"
                      : "bg-steel";
                return (
                  <li key={a.id} className="px-2 py-3 border-b border-border last:border-0">
                    <div className="flex items-start gap-3">
                      <span className={`mt-1.5 block h-1.5 w-1.5 rounded-full shrink-0 ${accent}`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-medium text-ink truncate">{a.title}</p>
                        <p className="mt-0.5 text-[12.5px] text-mute line-clamp-1">{a.content}</p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Solicitudes */}
        <div className="rounded-2xl bg-card border border-border p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="font-meta text-mute">MIS REPORTES</p>
              <p className="mt-2 text-[15px] font-medium text-ink">Seguimiento</p>
            </div>
            <Link href="/mantenimiento" className="font-meta text-steel hover:text-ink transition-colors">
              VER TODOS
            </Link>
          </div>

          {recentRequests.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-[13px] text-mute mb-4">No tienes reportes activos.</p>
              <Link href="/mantenimiento">
                <Button variant="outline" size="sm">Crear un reporte</Button>
              </Link>
            </div>
          ) : (
            <ul className="space-y-0 -mx-2" role="list">
              {recentRequests.map((r) => (
                <li key={r.id} className="px-2 py-3 border-b border-border last:border-0">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-medium text-ink truncate">{r.title}</p>
                      <p className="mt-0.5 font-meta text-mute">
                        {new Date(r.created_at).toLocaleDateString("es", {
                          day: "numeric",
                          month: "short",
                        }).toUpperCase()}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 font-meta px-2.5 py-1 rounded-md ${
                        statusTone[r.status] ?? "bg-mute/10 text-mute"
                      }`}
                    >
                      {statusLabels[r.status] ?? r.status.toUpperCase()}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function ActionTile({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col items-start gap-4 rounded-xl bg-card border border-border p-4 hover:border-ink/20 transition-colors"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-ink text-bone group-hover:bg-steel transition-colors">
        {icon}
      </span>
      <span className="text-[14px] font-medium text-ink">{label}</span>
    </Link>
  );
}
