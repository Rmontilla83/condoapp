import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/queries";
import { TenantManager } from "./tenant-manager";
import type { MemberRole, OwnershipMode, TenantPermissions } from "@/types/database";

const MODE_LABEL: Record<OwnershipMode, string> = {
  owner_occupied: "HABITADA POR TI",
  tenant_with_active_owner: "ARRENDADA",
  tenant_only: "SOLO INQUILINO",
};

export default async function MiUnidadPage() {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) redirect("/dashboard");

  const supabase = await createClient();

  const { data: myOwnership } = await supabase
    .from("unit_members")
    .select("id, unit_id, role, units(id, unit_number, floor, block, type, ownership_mode)")
    .eq("profile_id", profile.id)
    .eq("active", true)
    .eq("role", "owner");

  const ownedUnits = myOwnership ?? [];

  if (ownedUnits.length === 0) {
    return (
      <div className="space-y-8">
        <div>
          <span className="font-meta-loose text-steel">MI UNIDAD</span>
          <h1 className="mt-4 font-display text-[clamp(1.75rem,3.5vw,2.5rem)] leading-[1.1] tracking-[-0.03em] text-ink">
            Unidades a tu <em className="font-editorial text-steel">nombre</em>
          </h1>
        </div>
        <div className="rounded-2xl bg-card border border-border p-10 text-center">
          <p className="text-[14px] text-mute">
            No eres propietario de ninguna unidad registrada en esta app.
          </p>
        </div>
      </div>
    );
  }

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
    <div className="space-y-8">
      <div>
        <span className="font-meta-loose text-steel">MI UNIDAD</span>
        <h1 className="mt-4 font-display text-[clamp(1.75rem,3.5vw,2.5rem)] leading-[1.1] tracking-[-0.03em] text-ink">
          Gestiona tu <em className="font-editorial text-steel">inquilino</em> y permisos
        </h1>
      </div>

      <div className="space-y-5">
        {ownedUnits.map((o) => {
          const unit = Array.isArray(o.units) ? o.units[0] : o.units;
          if (!unit) return null;

          const mode = unit.ownership_mode as OwnershipMode;
          const tenants = (tenantsRes.data ?? []).filter((t) => t.unit_id === o.unit_id);
          const invites = (invitesRes.data ?? []).filter((i) => i.unit_id === o.unit_id);
          const codes = (codesRes.data ?? []).filter((c) => c.unit_id === o.unit_id);

          return (
            <div key={o.id} className="rounded-2xl bg-card border border-border overflow-hidden">
              <div className="p-6 border-b border-border">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-meta text-mute">
                      {unit.type.toUpperCase()}
                      {unit.floor != null && ` · PISO ${unit.floor}`}
                    </p>
                    <h2 className="mt-3 font-display text-[28px] leading-tight text-ink">
                      Apto {unit.unit_number}
                      {unit.block && (
                        <span className="text-mute"> · {unit.block}</span>
                      )}
                    </h2>
                  </div>
                  <span className="shrink-0 font-meta bg-ink text-bone px-3 py-1.5 rounded-md">
                    {MODE_LABEL[mode]}
                  </span>
                </div>
              </div>
              <div className="p-6">
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
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
