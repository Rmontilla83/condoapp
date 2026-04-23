import { redirect } from "next/navigation";
import {
  getCurrentProfile,
  getEffectiveRole,
  getAdminStats,
  getOrgMaintenance,
  getCurrentRate,
} from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { RequestManager } from "./request-manager";
import { PaymentReviewer } from "./payment-reviewer";
import { RateUpdater } from "./rate-updater";
import { GenerateInvoicesDialog } from "./generate-invoices-dialog";
import { AddUnitDialog } from "./add-unit-dialog";
import { AnimatedCounter } from "@/components/ui/animated-counter";

export default async function AdminPage() {
  const profile = await getCurrentProfile();

  if (!profile?.organization_id) return null;
  const effectiveRole = getEffectiveRole(profile);
  if (effectiveRole !== "admin" && effectiveRole !== "super_admin") {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  const rateData = await getCurrentRate(profile.organization_id);

  const [stats, maintenance, pendingPaymentsRes, morosRes] = await Promise.all([
    getAdminStats(profile.organization_id),
    getOrgMaintenance(profile.organization_id),
    supabase
      .from("transactions")
      .select("*, invoices(description, units(unit_number))")
      .eq("status", "pending")
      .order("paid_at", { ascending: false }),
    supabase
      .from("invoices")
      .select("unit_id, amount, status, due_date, units(unit_number)")
      .eq("organization_id", profile.organization_id)
      .in("status", ["pending", "overdue"])
      .order("due_date", { ascending: true }),
  ]);

  const pendingPayments = pendingPaymentsRes.data ?? [];
  const overdueInvoices = morosRes.data ?? [];

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
    <div className="space-y-10">
      <div>
        <span className="font-meta-loose text-cyan">PANEL ADMINISTRADOR</span>
        <h1 className="mt-4 font-display text-[clamp(2rem,4.5vw,3.25rem)] leading-[1.05] tracking-[-0.035em] text-marine-deep">
          Vista <em className="font-editorial text-cyan">general</em>
        </h1>
        <p className="mt-3 text-[15px] text-mute">
          {stats.totalUnits} unidades · {stats.paymentRate}% de cobranza · {stats.openRequests} solicitudes abiertas
        </p>
      </div>

      {/* KPI cards — manual style con count-up */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="group rounded-2xl bg-card border border-border p-5 transition-all duration-500 hover:border-cyan/40 hover:-translate-y-0.5 hover:shadow-[0_18px_50px_-18px_rgb(15,46,90,0.18)]">
          <p className="font-meta text-mute">UNIDADES</p>
          <p className="mt-3 font-display text-[32px] leading-none tracking-[-0.02em] text-marine-deep tabular-nums">
            <AnimatedCounter value={stats.totalUnits} duration={1200} />
          </p>
        </div>
        <div className="group rounded-2xl bg-card border border-border p-5 transition-all duration-500 hover:border-cyan/40 hover:-translate-y-0.5 hover:shadow-[0_18px_50px_-18px_rgb(15,46,90,0.18)]">
          <p className="font-meta text-mute">COBRANZA</p>
          <p className="mt-3 font-display text-[32px] leading-none tracking-[-0.02em] text-cyan tabular-nums">
            <AnimatedCounter value={stats.paymentRate} duration={1500} />
            <span className="text-mute text-[20px]">%</span>
          </p>
        </div>
        <div className="group rounded-2xl bg-card border border-border p-5 transition-all duration-500 hover:border-destructive/40 hover:-translate-y-0.5 hover:shadow-[0_18px_50px_-18px_rgb(15,46,90,0.18)]">
          <p className="font-meta text-mute">MOROSOS</p>
          <p className="mt-3 font-display text-[32px] leading-none tracking-[-0.02em] text-destructive tabular-nums">
            <AnimatedCounter value={morosos.length} duration={1100} />
          </p>
        </div>
        <div className="group rounded-2xl bg-card border border-border p-5 transition-all duration-500 hover:border-ember/40 hover:-translate-y-0.5 hover:shadow-[0_18px_50px_-18px_rgb(15,46,90,0.18)]">
          <p className="font-meta text-mute">SOLICITUDES</p>
          <p className="mt-3 font-display text-[32px] leading-none tracking-[-0.02em] text-ember tabular-nums">
            <AnimatedCounter value={stats.openRequests} duration={1100} />
          </p>
        </div>
      </div>

      {/* Acciones rápidas */}
      <div className="grid gap-3 md:grid-cols-3">
        <RateUpdater currentRate={Number(rateData.rate)} effectiveDate={rateData.effective_date} />
        <div className="rounded-2xl bg-card border border-border p-5 flex flex-col justify-between gap-4">
          <div>
            <p className="font-meta text-mute">COBRANZA</p>
            <p className="mt-2 text-[14px] text-marine-deep/80 leading-relaxed">
              Genera cuotas para todas las unidades de un mes.
            </p>
          </div>
          <GenerateInvoicesDialog />
        </div>
        <div className="rounded-2xl bg-card border border-border p-5 flex flex-col justify-between gap-4">
          <div>
            <p className="font-meta text-mute">UNIDADES</p>
            <p className="mt-2 text-[14px] text-marine-deep/80 leading-relaxed">
              {stats.totalUnits} unidad{stats.totalUnits !== 1 ? "es" : ""} registrada{stats.totalUnits !== 1 ? "s" : ""}.
            </p>
          </div>
          <AddUnitDialog />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Comprobantes */}
        <div className="rounded-2xl bg-card border border-border p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="font-meta text-mute">COMPROBANTES POR REVISAR</p>
              <p className="mt-2 text-[15px] font-medium text-marine-deep">
                {pendingPayments.length} pendiente{pendingPayments.length !== 1 ? "s" : ""} de aprobación
              </p>
            </div>
          </div>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <PaymentReviewer payments={pendingPayments as any} />
        </div>

        {/* Morosos */}
        <div className="rounded-2xl bg-card border border-border p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="font-meta text-mute">MOROSOS</p>
              <p className="mt-2 text-[15px] font-medium text-marine-deep">
                Unidades con cuotas pendientes
              </p>
            </div>
          </div>

          {morosos.length === 0 ? (
            <div className="py-6 text-center">
              <p className="font-meta text-cyan">TODAS AL DÍA · GRACIAS</p>
            </div>
          ) : (
            <div className="space-y-0">
              {morosos.map((m) => (
                <div
                  key={m.unit}
                  className="flex items-center justify-between py-3.5 border-b border-border last:border-0 gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-[14px] font-medium text-marine-deep">Apto {m.unit}</p>
                    <p className="mt-0.5 font-meta text-mute truncate">
                      {m.count} CUOTA{m.count > 1 ? "S" : ""} ·{" "}
                      DESDE{" "}
                      {new Date(m.oldest)
                        .toLocaleDateString("es", { month: "short", year: "numeric" })
                        .toUpperCase()}
                    </p>
                  </div>
                  <span className="text-[14px] font-medium text-destructive shrink-0">
                    ${m.total.toFixed(2)}
                  </span>
                </div>
              ))}
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex items-center justify-between">
                  <span className="font-meta text-mute">TOTAL POR COBRAR</span>
                  <span className="font-display text-[20px] text-destructive">
                    ${morosos.reduce((s, m) => s + m.total, 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Solicitudes — gestión */}
      <div className="rounded-2xl bg-card border border-border p-6">
        <div className="mb-5">
          <p className="font-meta text-mute">SOLICITUDES DE MANTENIMIENTO</p>
          <p className="mt-2 text-[15px] font-medium text-marine-deep">
            Toca una para gestionar — asignar responsable, cambiar estado
          </p>
        </div>
        <RequestManager requests={maintenance} />
      </div>

      {/* Resumen financiero */}
      <div className="rounded-2xl bg-card border border-border p-6">
        <p className="font-meta text-mute mb-5">RESUMEN FINANCIERO · ACUMULADO</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-xl bg-cloud/40 border border-border p-4">
            <p className="font-meta text-mute">RECAUDADO</p>
            <p className="mt-3 font-display text-[22px] leading-none text-cyan">
              ${stats.totalIncome.toFixed(2)}
            </p>
          </div>
          <div className="rounded-xl bg-cloud/40 border border-border p-4">
            <p className="font-meta text-mute">GASTOS</p>
            <p className="mt-3 font-display text-[22px] leading-none text-marine-deep">
              ${stats.totalExpenses.toFixed(2)}
            </p>
          </div>
          <div className="rounded-xl bg-cloud/40 border border-border p-4">
            <p className="font-meta text-mute">BALANCE</p>
            <p
              className={`mt-3 font-display text-[22px] leading-none ${
                stats.balance >= 0 ? "text-marine-deep" : "text-destructive"
              }`}
            >
              ${stats.balance.toFixed(2)}
            </p>
          </div>
          <div className="rounded-xl bg-cloud/40 border border-border p-4">
            <p className="font-meta text-mute">COBRANZA</p>
            <p className="mt-3 font-display text-[22px] leading-none text-marine-deep">
              {stats.paymentRate}
              <span className="text-mute text-[14px]">%</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
