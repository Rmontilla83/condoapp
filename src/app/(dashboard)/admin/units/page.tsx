import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, getEffectiveRole } from "@/lib/queries";
import { UnitManagerDialog } from "./unit-manager-dialog";
import type { OwnershipMode } from "@/types/database";

const MODE_LABEL: Record<OwnershipMode, string> = {
  owner_occupied: "PROPIETARIO",
  tenant_with_active_owner: "PROP + INQUILINO",
  tenant_only: "SOLO INQUILINO",
};

const MODE_TONE: Record<OwnershipMode, string> = {
  owner_occupied: "bg-ink text-bone",
  tenant_with_active_owner: "bg-steel text-bone",
  tenant_only: "bg-sand text-ink",
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
    <div className="space-y-8">
      <div>
        <span className="font-meta-loose text-steel">GESTIÓN · UNIDADES</span>
        <h1 className="mt-4 font-display text-[clamp(1.75rem,3.5vw,2.5rem)] leading-[1.1] tracking-[-0.03em] text-ink">
          Configura <em className="font-editorial text-steel">ocupación</em> y acceso
        </h1>
        <p className="mt-3 text-[15px] text-mute">
          Modo de ocupación, invitaciones por email y códigos físicos.
        </p>
      </div>

      {(units ?? []).length === 0 && (
        <div className="rounded-2xl bg-card border border-border py-12 text-center">
          <p className="text-[14px] text-mute">
            No hay unidades todavía. Agrégalas desde el panel principal.
          </p>
        </div>
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
            <div key={unit.id} className="rounded-2xl bg-card border border-border overflow-hidden">
              <div className="p-5 border-b border-border">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-meta text-mute">
                      {unit.type.toUpperCase()}
                      {unit.floor != null && ` · PISO ${unit.floor}`}
                    </p>
                    <h2 className="mt-2 font-display text-[22px] leading-tight text-ink">
                      Apto {unit.unit_number}
                      {unit.block && <span className="text-mute"> · {unit.block}</span>}
                    </h2>
                  </div>
                  <span className={`font-meta px-2.5 py-1 rounded-md shrink-0 ${MODE_TONE[mode]}`}>
                    {MODE_LABEL[mode]}
                  </span>
                </div>
              </div>

              <div className="p-5 space-y-4">
                <div className="space-y-2.5">
                  <div className="flex items-baseline gap-3">
                    <span className="font-meta text-mute w-24 shrink-0">PROPIETARIO</span>
                    <span className="text-[13.5px] text-ink truncate">
                      {owners[0]
                        ? (owners[0].profiles as { full_name?: string; email?: string } | null)
                            ?.full_name ||
                          (owners[0].profiles as { full_name?: string; email?: string } | null)
                            ?.email
                        : <span className="text-mute">—</span>}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-3">
                    <span className="font-meta text-mute w-24 shrink-0">INQUILINO</span>
                    <span className="text-[13.5px] text-ink truncate">
                      {tenants[0]
                        ? (tenants[0].profiles as { full_name?: string; email?: string } | null)
                            ?.full_name ||
                          (tenants[0].profiles as { full_name?: string; email?: string } | null)
                            ?.email
                        : <span className="text-mute">—</span>}
                    </span>
                  </div>
                  {(invites.length > 0 || codes.length > 0) && (
                    <div className="flex items-baseline gap-3 flex-wrap">
                      <span className="font-meta text-mute w-24 shrink-0">PENDIENTES</span>
                      <span className="font-meta text-sand">
                        {invites.length > 0 && `${invites.length} INVITACIÓN(ES)`}
                        {invites.length > 0 && codes.length > 0 && " · "}
                        {codes.length > 0 && `${codes.length} CÓDIGO(S)`}
                      </span>
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
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
