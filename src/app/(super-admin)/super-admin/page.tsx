import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { CreateOrgDialog } from "./create-org-dialog";
import { InviteAdminDialog } from "./invite-admin-dialog";
import { EnterOrgButton } from "./enter-org-button";
import { AnimatedCounter } from "@/components/ui/animated-counter";

export default async function SuperAdminPage() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "super_admin") redirect("/dashboard");

  const supabase = await createClient();

  const [orgsRes, profilesRes, unitsRes, invoicesRes, invitationsRes] = await Promise.all([
    supabase.from("organizations").select("id, name, city, invite_code, is_active, created_at").order("created_at", { ascending: false }),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("units").select("id", { count: "exact", head: true }),
    supabase.from("invoices").select("amount, status"),
    supabase.from("admin_invitations").select("*, organizations(name)").order("created_at", { ascending: false }).limit(10),
  ]);

  const orgs = orgsRes.data ?? [];
  const totalUsers = profilesRes.count ?? 0;
  const totalUnits = unitsRes.count ?? 0;
  const invoices = invoicesRes.data ?? [];
  const invitations = invitationsRes.data ?? [];

  const totalRevenue = invoices
    .filter((i) => i.status === "paid")
    .reduce((s, i) => s + Number(i.amount), 0);
  const totalPending = invoices
    .filter((i) => i.status === "pending" || i.status === "overdue")
    .reduce((s, i) => s + Number(i.amount), 0);

  return (
    <div className="mx-auto max-w-7xl px-5 md:px-8 py-10 space-y-10">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <span className="font-meta-loose text-cyan">VISTA GLOBAL · Q2 2026</span>
          <h1 className="mt-4 font-display text-[clamp(2rem,4.5vw,3.5rem)] leading-[1.05] tracking-[-0.035em] text-marine-deep">
            {orgs.length} condominios ·{" "}
            <em className="font-editorial">{totalUnits} unidades</em>
          </h1>
        </div>
        <CreateOrgDialog />
      </div>

      {/* KPI cards — manual style con count-up */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KpiCard label="CONDOMINIOS" value={orgs.length} />
        <KpiCard label="UNIDADES" value={totalUnits} />
        <KpiCard label="USUARIOS" value={totalUsers} />
        <KpiCard label="RECAUDADO" value={totalRevenue} prefix="$" tone="cyan" />
        <KpiCard label="POR COBRAR" value={totalPending} prefix="$" tone="ember" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Condominios */}
        <div className="rounded-2xl bg-card border border-border p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="font-meta text-mute">CONDOMINIOS</p>
              <p className="mt-2 text-[15px] font-medium text-marine-deep">
                {orgs.length} registrados
              </p>
            </div>
          </div>

          {orgs.length === 0 ? (
            <p className="py-6 text-center text-[13px] text-mute">
              Sin condominios todavía.
            </p>
          ) : (
            <div className="space-y-3">
              {orgs.map((org) => (
                <div key={org.id} className="rounded-xl bg-cloud/30 border border-border p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <p className="text-[15px] font-medium text-marine-deep truncate">{org.name}</p>
                      <p className="mt-1 font-meta text-mute">
                        {org.city?.toUpperCase()}
                      </p>
                    </div>
                    <span
                      className={`font-meta px-2 py-0.5 rounded-md shrink-0 ${
                        org.is_active ? "bg-cyan/10 text-cyan" : "bg-mute/15 text-mute"
                      }`}
                    >
                      {org.is_active ? "ACTIVO" : "INACTIVO"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 font-meta text-mute mb-4">
                    <span>CÓDIGO ·</span>
                    <span className="font-mono text-marine-deep">{org.invite_code}</span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <InviteAdminDialog orgId={org.id} orgName={org.name} />
                    <EnterOrgButton orgId={org.id} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Invitations */}
        <div className="rounded-2xl bg-card border border-border p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="font-meta text-mute">INVITACIONES · ADMIN</p>
              <p className="mt-2 text-[15px] font-medium text-marine-deep">
                Últimas enviadas
              </p>
            </div>
          </div>

          {invitations.length === 0 ? (
            <p className="py-6 text-center text-[13px] text-mute">No hay invitaciones.</p>
          ) : (
            <ul className="space-y-0">
              {invitations.map((inv) => {
                const orgName = Array.isArray(inv.organizations)
                  ? inv.organizations[0]?.name
                  : inv.organizations?.name;
                return (
                  <li
                    key={inv.id}
                    className="flex items-center justify-between py-3 border-b border-border last:border-0 gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-[14px] font-medium text-marine-deep truncate">
                        {inv.email}
                      </p>
                      <p className="mt-0.5 font-meta text-mute truncate">{orgName}</p>
                    </div>
                    <span
                      className={`font-meta px-2 py-0.5 rounded-md shrink-0 ${
                        inv.accepted_at
                          ? "bg-cyan/10 text-cyan"
                          : "bg-ember/15 text-ember"
                      }`}
                    >
                      {inv.accepted_at ? "ACEPTADA" : "PENDIENTE"}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  prefix,
  tone = "marine-deep",
}: {
  label: string;
  value: number;
  prefix?: string;
  tone?: "marine-deep" | "cyan" | "ember";
}) {
  const toneClass =
    tone === "cyan" ? "text-cyan" : tone === "ember" ? "text-ember" : "text-marine-deep";
  const borderHover =
    tone === "cyan"
      ? "hover:border-cyan/40"
      : tone === "ember"
      ? "hover:border-ember/40"
      : "hover:border-marine/40";

  return (
    <div
      className={`group rounded-2xl bg-card border border-border p-5 transition-all duration-500 ${borderHover} hover:-translate-y-0.5 hover:shadow-[0_18px_50px_-18px_rgb(15,46,90,0.18)]`}
    >
      <p className="font-meta text-mute">{label}</p>
      <p
        className={`mt-3 font-display text-[28px] leading-none tracking-[-0.02em] tabular-nums ${toneClass}`}
      >
        <AnimatedCounter value={value} duration={1400} prefix={prefix ?? ""} />
      </p>
    </div>
  );
}
