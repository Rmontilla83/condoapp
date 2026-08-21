import {
  getCurrentProfile,
  getDashboardContext,
  getCurrentMonthExpenseSummary,
  getLatestRejectionsByInvoice,
} from "@/lib/queries";
import { todayInTimeZone, describeDueDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { IdentityStrip } from "@/components/dashboard/identity-strip";
import { UrgentBanner } from "@/components/dashboard/urgent-banner";
import { UpcomingReservationCard } from "@/components/dashboard/upcoming-reservation-card";
import { PendingDecisionCard } from "@/components/dashboard/pending-decision-card";
import { RecentAnnouncementsLink } from "@/components/dashboard/recent-announcements-link";
import { SmartPayButton } from "./smart-pay-button";
import type { BankAccount } from "@/types/database";

const statusLabels: Record<string, string> = {
  new: "NUEVO",
  in_review: "EN REVISIÓN",
  in_progress: "EN CURSO",
  resolved: "RESUELTO",
  cancelled: "CANCELADO",
};

const statusTone: Record<string, string> = {
  new: "bg-cyan/10 text-cyan-ink",
  in_review: "bg-ember/15 text-ember-ink",
  in_progress: "bg-ember/15 text-ember-ink",
  resolved: "bg-cyan/10 text-cyan-ink",
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
  // Los datos bancarios viajan hasta el diálogo de pago: tocar "Pagar ahora" no
  // puede terminar en un formulario que pide el comprobante de una transferencia
  // que el propietario todavía no sabe a dónde hacer.
  const bankAccounts: BankAccount[] = Array.isArray(ctx.org?.bank_accounts)
    ? (ctx.org.bank_accounts as BankAccount[])
    : [];

  const hoy = todayInTimeZone(ctx.org?.timezone ?? undefined);
  // La cuota más próxima a vencer: es la que responde "¿de qué es y para cuándo?"
  const proxima = [...actionableInvoices].sort((a, b) =>
    String(a.due_date).localeCompare(String(b.due_date)),
  )[0];
  const vencimiento = proxima ? describeDueDate(String(proxima.due_date), hoy) : null;
  const tasa = Number(ctx.rate?.rate ?? 0);
  const totalBs = tasa > 0 ? actionableTotal * tasa : 0;

  const [gastoDelMes, rechazos] = await Promise.all([
    getCurrentMonthExpenseSummary(profile.organization_id, hoy),
    // El rechazo tiene que llegar a la PRIMERA pantalla: es acá donde el
    // propietario ve reaparecer una deuda que creía resuelta.
    getLatestRejectionsByInvoice(actionableInvoices.map((i) => i.id)),
  ]);
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
                  actionableTotal > 0 ? "text-marine-deep" : "text-cyan-ink"
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
                <p className="mt-3 font-meta text-cyan-ink">AL DÍA · GRACIAS</p>
              )}

              {/* De qué es y para cuándo. Sin esto el número grande no termina
                  de responder la pregunta con la que el propietario abre la app. */}
              {proxima && vencimiento && (
                <div className="mt-3 space-y-1">
                  <p className="text-[14px] text-marine-deep/80">
                    {proxima.description}
                    {actionableInvoices.length > 1 && (
                      <span className="text-mute">
                        {" "}· y {actionableInvoices.length - 1} cuota
                        {actionableInvoices.length - 1 !== 1 ? "s" : ""} más
                      </span>
                    )}
                  </p>
                  <p
                    className={`font-meta ${
                      vencimiento.tone === "vencida"
                        ? "text-destructive"
                        : vencimiento.tone === "hoy" || vencimiento.tone === "pronto"
                          ? "text-ember-ink"
                          : "text-mute"
                    }`}
                  >
                    {vencimiento.label}
                  </p>
                </div>
              )}

              {/* Paga en bolívares: el monto convertido va acá, no una pantalla
                  más adentro, porque lo teclea en la app del banco. */}
              {totalBs > 0 && (
                <p className="mt-2 font-mono text-[13px] text-mute tabular-nums">
                  Bs {totalBs.toFixed(2)}
                  <span className="font-sans"> · tasa {tasa.toFixed(2)}</span>
                </p>
              )}
            </div>
            <SmartPayButton
              actionable={actionableInvoices}
              inReview={inReviewInvoices}
              rate={ctx.rate.rate}
              canSeeFee={ctx.canSeeFee}
              bankAccounts={bankAccounts}
            />
          </div>
        </div>
      )}

      {/* Un comprobante rechazado explica por qué volvió a subir el saldo. */}
      {rechazos.size > 0 && (
        <Link
          href="/pagos"
          className="group flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-2xl border border-destructive/40 bg-destructive/5 p-5 transition-colors hover:bg-destructive/10"
        >
          <div className="min-w-0">
            <p className="font-meta text-destructive">
              COMPROBANTE{rechazos.size !== 1 ? "S" : ""} RECHAZADO{rechazos.size !== 1 ? "S" : ""}
            </p>
            <p className="mt-2 text-[15px] text-marine-deep">
              {rechazos.size === 1
                ? "El administrador no pudo confirmar uno de tus pagos."
                : `El administrador no pudo confirmar ${rechazos.size} de tus pagos.`}{" "}
              <span className="text-mute">Por eso la cuota sigue pendiente.</span>
            </p>
          </div>
          <span className="font-meta text-destructive shrink-0 transition-transform group-hover:translate-x-0.5">
            VER POR QUÉ →
          </span>
        </Link>
      )}

      {/* Transparencia del gasto. /finanzas ya lo resolvía bien pero no tenía
          UN SOLO enlace desde el inicio, así que el propietario nunca descubría
          que existía y la app le seguía pareciendo un cobrador. */}
      {gastoDelMes.count > 0 && (
        <Link
          href="/finanzas"
          className="group flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-2xl bg-card border border-border p-5 transition-all duration-300 hover:border-cyan/40 hover:shadow-[0_18px_50px_-18px_rgb(15,46,90,0.18)]"
        >
          <div className="min-w-0">
            <p className="font-meta text-mute">¿EN QUÉ SE FUE TU CUOTA?</p>
            <p className="mt-2 text-[15px] text-marine-deep">
              En {gastoDelMes.monthLabel} el condominio lleva gastados{" "}
              <span className="font-mono tabular-nums">
                ${gastoDelMes.total.toFixed(2)}
              </span>{" "}
              en {gastoDelMes.count} concepto{gastoDelMes.count !== 1 ? "s" : ""}.
            </p>
          </div>
          <span className="font-meta text-cyan-ink shrink-0 transition-transform group-hover:translate-x-0.5">
            VER EL DETALLE →
          </span>
        </Link>
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
          <Link href="/mantenimiento" className="font-meta text-cyan-ink hover:text-marine-deep transition-colors">
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
