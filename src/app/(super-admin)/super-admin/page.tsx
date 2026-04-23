import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateOrgDialog } from "./create-org-dialog";
import { InviteAdminDialog } from "./invite-admin-dialog";
import { ViewSwitcher } from "./view-switcher";
import { EnterOrgButton } from "./enter-org-button";

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

  const totalRevenue = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + Number(i.amount), 0);
  const totalPending = invoices.filter((i) => i.status === "pending" || i.status === "overdue").reduce((s, i) => s + Number(i.amount), 0);

  return (
    <div className="min-h-screen bg-[#FAFBFC]">
      <div className="mx-auto max-w-7xl px-5 md:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-[#0F172A]" style={{ fontFamily: "Outfit, sans-serif" }}>
              Super Admin
            </h1>
            <p className="text-muted-foreground">Plataforma Atryum — vista global</p>
          </div>
          <div className="flex items-center gap-3">
            <ViewSwitcher currentView={profile.view_as ?? null} />
            <a href="/dashboard" className="text-sm font-medium text-primary hover:underline">Ir al dashboard →</a>
          </div>
        </div>

        {/* Global stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Condominios</p>
              <p className="text-3xl font-extrabold mt-1" style={{ fontFamily: "Outfit, sans-serif" }}>{orgs.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Unidades</p>
              <p className="text-3xl font-extrabold mt-1" style={{ fontFamily: "Outfit, sans-serif" }}>{totalUnits}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Usuarios</p>
              <p className="text-3xl font-extrabold mt-1" style={{ fontFamily: "Outfit, sans-serif" }}>{totalUsers}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recaudado</p>
              <p className="text-2xl font-extrabold text-emerald-600 mt-1" style={{ fontFamily: "Outfit, sans-serif" }}>${totalRevenue.toFixed(0)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Por cobrar</p>
              <p className="text-2xl font-extrabold text-amber-600 mt-1" style={{ fontFamily: "Outfit, sans-serif" }}>${totalPending.toFixed(0)}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Condominios */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Condominios</CardTitle>
                  <CardDescription>{orgs.length} registrados</CardDescription>
                </div>
                <CreateOrgDialog />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {orgs.map((org) => (
                  <div key={org.id} className="rounded-xl border p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-semibold">{org.name}</p>
                        <p className="text-xs text-muted-foreground">{org.city}</p>
                      </div>
                      <div className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${org.is_active ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                        {org.is_active ? "Activo" : "Inactivo"}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z"/></svg>
                        Codigo: <span className="font-mono font-bold text-primary">{org.invite_code}</span>
                      </span>
                    </div>
                    <div className="mt-2">
                      <InviteAdminDialog orgId={org.id} orgName={org.name} />
                    </div>
                    <EnterOrgButton orgId={org.id} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent invitations */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Invitaciones de admin</CardTitle>
              <CardDescription>Ultimas invitaciones enviadas</CardDescription>
            </CardHeader>
            <CardContent>
              {invitations.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">No hay invitaciones</p>
              ) : (
                <div className="space-y-3">
                  {invitations.map((inv) => {
                    const orgName = Array.isArray(inv.organizations) ? inv.organizations[0]?.name : inv.organizations?.name;
                    return (
                      <div key={inv.id} className="flex items-center justify-between rounded-xl border p-3">
                        <div>
                          <p className="text-sm font-medium">{inv.email}</p>
                          <p className="text-xs text-muted-foreground">{orgName}</p>
                        </div>
                        <div className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${inv.accepted_at ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                          {inv.accepted_at ? "Aceptada" : "Pendiente"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
