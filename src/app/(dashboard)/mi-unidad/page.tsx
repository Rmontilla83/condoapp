import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/queries";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TenantManager } from "./tenant-manager";
import type { MemberRole, OwnershipMode, TenantPermissions } from "@/types/database";

export default async function MiUnidadPage() {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) redirect("/dashboard");

  const supabase = await createClient();

  // Buscar unidades donde soy propietario activo
  const { data: myOwnership } = await supabase
    .from("unit_members")
    .select("id, unit_id, role, units(id, unit_number, floor, block, type, ownership_mode)")
    .eq("profile_id", profile.id)
    .eq("active", true)
    .eq("role", "owner");

  const ownedUnits = myOwnership ?? [];

  if (ownedUnits.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "Outfit, sans-serif" }}>
            Mi unidad
          </h1>
        </div>
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-sm text-muted-foreground">
              No eres propietario de ninguna unidad registrada en esta app.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Para cada unidad propia, cargar tenants + invitaciones + códigos pendientes
  const unitIds = ownedUnits.map((o) => o.unit_id);

  const [tenantsRes, invitesRes, codesRes] = await Promise.all([
    supabase
      .from("unit_members")
      .select("id, unit_id, role, permissions, profiles(full_name, email)")
      .in("unit_id", unitIds)
      .eq("active", true)
      .eq("role", "tenant"),
    supabase
      .from("unit_invitations")
      .select("id, unit_id, email, assigned_role, expires_at")
      .in("unit_id", unitIds)
      .eq("assigned_role", "tenant")
      .is("accepted_at", null),
    supabase
      .from("unit_access_codes")
      .select("id, unit_id, code, assigned_role, expires_at")
      .in("unit_id", unitIds)
      .eq("assigned_role", "tenant")
      .is("used_at", null)
      .is("revoked_at", null),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "Outfit, sans-serif" }}>
          Mi unidad
        </h1>
        <p className="text-muted-foreground">Gestiona tu inquilino y permisos.</p>
      </div>

      <div className="space-y-4">
        {ownedUnits.map((o) => {
          const unit = Array.isArray(o.units) ? o.units[0] : o.units;
          if (!unit) return null;

          const mode = unit.ownership_mode as OwnershipMode;
          const tenants = (tenantsRes.data ?? []).filter((t) => t.unit_id === o.unit_id);
          const invites = (invitesRes.data ?? []).filter((i) => i.unit_id === o.unit_id);
          const codes = (codesRes.data ?? []).filter((c) => c.unit_id === o.unit_id);

          return (
            <Card key={o.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>
                      Apto {unit.unit_number}
                      {unit.block && <span className="text-muted-foreground"> · {unit.block}</span>}
                    </CardTitle>
                    <CardDescription>
                      {unit.type}
                      {unit.floor != null && ` · piso ${unit.floor}`}
                    </CardDescription>
                  </div>
                  <Badge variant="default">
                    {mode === "owner_occupied"
                      ? "Habitada por ti"
                      : mode === "tenant_with_active_owner"
                        ? "Arrendada"
                        : "Solo inquilino"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <TenantManager
                  unit={{ id: unit.id, unit_number: unit.unit_number, ownership_mode: mode }}
                  tenants={tenants.map((t) => ({
                    id: t.id,
                    full_name:
                      (t.profiles as { full_name?: string; email?: string } | null)?.full_name ??
                      "",
                    email:
                      (t.profiles as { full_name?: string; email?: string } | null)?.email ?? "",
                    permissions: (t.permissions as TenantPermissions) ?? {},
                  }))}
                  invites={invites.map((i) => ({
                    id: i.id,
                    email: i.email,
                    assigned_role: i.assigned_role as MemberRole,
                    expires_at: i.expires_at,
                  }))}
                  codes={codes.map((c) => ({
                    id: c.id,
                    code: c.code,
                    assigned_role: c.assigned_role as MemberRole,
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
