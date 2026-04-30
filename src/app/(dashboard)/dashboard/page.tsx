import { getCurrentProfile, getDashboardContext } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { IdentityStrip } from "@/components/dashboard/identity-strip";
import { UrgentBanner } from "@/components/dashboard/urgent-banner";
import { UpcomingReservationCard } from "@/components/dashboard/upcoming-reservation-card";
import { PendingDecisionCard } from "@/components/dashboard/pending-decision-card";
import { RecentAnnouncementsLink } from "@/components/dashboard/recent-announcements-link";
import { SmartPayButton } from "./smart-pay-button";

const statusLabels: Record<string, string> = {
  new: "NUEVO",
  in_review: "EN REVISIÓN",
  in_progress: "EN CURSO",
  resolved: "RESUELTO",
  cancelled: "CANCELADO",
};

const statusTone: Record<string, string> = {
  new: "bg-cyan/10 text-cyan",
  in_review: "bg-ember/15 text-ember",
  in_progress: "bg-ember/15 text-ember",
  resolved: "bg-cyan/10 text-cyan",
  cancelled: "bg-mute/15 text-mute",
};

export default async function DashboardPage() {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return null;

  const ctx = await getDashboardContext(profile);
  if (!ctx) return null;

  const recentRequests = ctx.recentRequests;
  const actionableInvoices = ctx.pendingInvoices.filter((i) => !ctx.inReviewInvoiceIds.has(i.id));
  const inReviewInvoices = ctx.pendingInvoices.filter((i) => ctx.inReviewInvoiceIds.has(i.id));
  const actionableTotal = actionableInvoices.reduce((s, i) => s + Number(i.amount), 0);
  const inReviewTotal = inReviewInvoices.reduce((s, i) => s + Number(i.amount), 0);

  return (
    <div className="space-y-8 md:space-y-10">
      <IdentityStrip ctx={ctx} />

      {/* Banner urgent — única excepción a la jerarquía: si hay urgent, sale antes del saldo */}
      <UrgentBanner announcements={ctx.urgentAnnouncements} />

      {/* Saldo card — con count-up dramático. Oculto si tenant sin can_see_fee. */}
      {ctx.canSeeFee && (
        <div className="group rounded-2xl bg-card border border-border p-6 md:p-8 transition-all duration-500 hover:border-marine/25 hover:shadow-[0_18px_50px_-18px_rgb(15,46,90,0.18)]">
          <div className="flex items-start justify-between gap-5">
            <div className="min-w-0">
              <p className="font-meta text-mute">SALDO PENDIENTE · USD</p>
              <p
                className={`mt-4 font-display text-[clamp(2.75rem,6vw,4rem)] leading-none tracking-[-0.03em] tabular-nums ${
                  actionableTotal > 0 ? "text-marine-deep" : "text-cyan"
                }`}
              >
                <AnimatedCounter
                  value={actionableTotal}
                  decimals={2}
                  prefix="$"
                  duration={1600}
                />
              </p>
              {inReviewTotal > 0 && (
                <p className="mt-2 font-meta text-amber-700">
                  ${inReviewTotal.toFixed(2)} EN REVISIÓN
                </p>
              )}
              {actionableTotal === 0 && inReviewTotal === 0 && (
                <p className="mt-3 font-meta text-cyan">AL DÍA · GRACIAS</p>
              )}
            </div>
            <SmartPayButton
              actionable={actionableInvoices}
              inReview={inReviewInvoices}
              rate={ctx.rate.rate}
              canSeeFee={ctx.canSeeFee}
            />
          </div>
        </div>
      )}

      {/* Decisión pendiente (si aplica) */}
      <PendingDecisionCard decisions={ctx.openDecisionsNotVoted} />

      {/* Próxima reserva (si aplica) */}
      <UpcomingReservationCard reservation={ctx.upcomingReservation} />

      {/* Counter de comunicados — descubrimiento sin imponer */}
      {ctx.totalRecentAnnouncements > 0 && (
        <RecentAnnouncementsLink count={ctx.totalRecentAnnouncements} />
      )}

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

      {/* MIS REPORTES — full-width al final */}
      <div className="rounded-2xl bg-card border border-border p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="font-meta text-mute">MIS REPORTES</p>
            <p className="mt-2 text-[15px] font-medium text-marine-deep">Seguimiento</p>
          </div>
          <Link href="/mantenimiento" className="font-meta text-cyan hover:text-marine-deep transition-colors">
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
                    <p className="text-[14px] font-medium text-marine-deep truncate">{r.title}</p>
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
      className="group flex flex-col items-start gap-4 rounded-xl bg-card border border-border p-4 hover:border-marine/40 transition-colors"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-marine-deep text-frost group-hover:bg-cyan transition-colors">
        {icon}
      </span>
      <span className="text-[14px] font-medium text-marine-deep">{label}</span>
    </Link>
  );
}
