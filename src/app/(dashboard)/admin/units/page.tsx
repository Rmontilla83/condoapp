import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, getEffectiveRole } from "@/lib/queries";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UnitManagerDialog } from "./unit-manager-dialog";
import type { OwnershipMode } from "@/types/database";

const modeLabels: Record<OwnershipMode, string> = {
  owner_occupied: "Propietario",
  tenant_with_active_owner: "Propietario + inquilino",
  tenant_only: "Solo inquilino",
};

const modeVariants: Record<OwnershipMode, "default" | "secondary" | "outline"> = {
  owner_occupied: "default",
  tenant_with_active_owner: "secondary",
  tenant_only: "outline",
};

export default async function AdminUnitsPage() {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return null;
  const effectiveRole = getEffectiveRole(profile);
  if (effectiveRole !== "admin" && effectiveRole !== "super_admin") {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  const { data: units } = await supabase
    .from("units")
    .select("id, unit_number, floor, block, type, ownership_mode")
    .eq("organization_id", profile.organization_id)
    .order("unit_number");

  // Para cada unidad: miembros activos + invitaciones pendientes + códigos activos
  const unitIds = (units ?? []).map((u) => u.id);

  const [membersRes, invitesRes, codesRes] = await Promise.all([
    supabase
      .from("unit_members")
      .select("id, unit_id, role, active, profile_id, profiles(full_name, email)")
      .in("unit_id", unitIds.length > 0 ? unitIds : ["00000000-0000-0000-0000-000000000000"])
      .eq("active", true),
    supabase
      .from("unit_invitations")
      .select("id, unit_id, email, assigned_role, expires_at, accepted_at")
      .in("unit_id", unitIds.length > 0 ? unitIds : ["00000000-0000-0000-0000-000000000000"])
      .is("accepted_at", null),
    supabase
      .from("unit_access_codes")
      .select("id, unit_id, code, assigned_role, expires_at, used_at, revoked_at")
      .in("unit_id", unitIds.length > 0 ? unitIds : ["00000000-0000-0000-0000-000000000000"])
      .is("used_at", null)
      .is("revoked_at", null),
  ]);

  const membersByUnit = new Map<string, typeof membersRes.data>();
  for (const m of membersRes.data ?? []) {
    const arr = membersByUnit.get(m.unit_id) ?? [];
    arr.push(m);
    membersByUnit.set(m.unit_id, arr);
  }

  const invitesByUnit = new Map<string, typeof invitesRes.data>();
  for (const i of invitesRes.data ?? []) {
    const arr = invitesByUnit.get(i.unit_id) ?? [];
    arr.push(i);
    invitesByUnit.set(i.unit_id, arr);
  }

  const codesByUnit = new Map<string, typeof codesRes.data>();
  for (const c of codesRes.data ?? []) {
    const arr = codesByUnit.get(c.unit_id) ?? [];
    arr.push(c);
    codesByUnit.set(c.unit_id, arr);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "Outfit, sans-serif" }}>
          Gestión de unidades
        </h1>
        <p className="text-muted-foreground">
          Configura el modo de ocupación, invita residentes por email o genera códigos de acceso.
        </p>
      </div>

      {(units ?? []).length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-sm text-muted-foreground">
              No hay unidades todavía. Agrega una desde el panel principal.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {(units ?? []).map((unit) => {
          const mode = unit.ownership_mode as OwnershipMode;
          const members = membersByUnit.get(unit.id) ?? [];
          const invites = invitesByUnit.get(unit.id) ?? [];
          const codes = codesByUnit.get(unit.id) ?? [];
          const owners = members.filter((m) => m.role === "owner");
          const tenants = members.filter((m) => m.role === "tenant");

          return (
            <Card key={unit.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">
                      Apto {unit.unit_number}
                      {unit.block && <span className="text-muted-foreground text-sm"> · {unit.block}</span>}
                    </CardTitle>
                    <CardDescription className="text-xs mt-1">
                      {unit.type} {unit.floor != null && `· piso ${unit.floor}`}
                    </CardDescription>
                  </div>
                  <Badge variant={modeVariants[mode]}>{modeLabels[mode]}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground uppercase w-20">
                      Propietario
                    </span>
                    <span className="truncate">
                      {owners[0]
                        ? `${(owners[0].profiles as { full_name?: string; email?: string } | null)?.full_name || (owners[0].profiles as { full_name?: string; email?: string } | null)?.email}`
                        : <span className="text-muted-foreground">—</span>}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground uppercase w-20">
                      Inquilino
                    </span>
                    <span className="truncate">
                      {tenants[0]
                        ? `${(tenants[0].profiles as { full_name?: string; email?: string } | null)?.full_name || (tenants[0].profiles as { full_name?: string; email?: string } | null)?.email}`
                        : <span className="text-muted-foreground">—</span>}
                    </span>
                  </div>
                  {(invites.length > 0 || codes.length > 0) && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {invites.length > 0 && <span>{invites.length} invitación(es) pendiente(s)</span>}
                      {codes.length > 0 && <span>· {codes.length} código(s) activo(s)</span>}
                    </div>
                  )}
                </div>

                <UnitManagerDialog
                  unit={{
                    id: unit.id,
                    unit_number: unit.unit_number,
                    ownership_mode: mode,
                  }}
                  members={members.map((m) => ({
                    id: m.id,
                    role: m.role as "owner" | "tenant",
                    full_name:
                      (m.profiles as { full_name?: string; email?: string } | null)?.full_name ?? "",
                    email:
                      (m.profiles as { full_name?: string; email?: string } | null)?.email ?? "",
                  }))}
                  invites={invites.map((i) => ({
                    id: i.id,
                    email: i.email,
                    assigned_role: i.assigned_role as "owner" | "tenant",
                    expires_at: i.expires_at,
                  }))}
                  codes={codes.map((c) => ({
                    id: c.id,
                    code: c.code,
                    assigned_role: c.assigned_role as "owner" | "tenant",
                    expires_at: c.expires_at,
                  }))}
                />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
