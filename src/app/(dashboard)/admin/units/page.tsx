import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, getEffectiveRole } from "@/lib/queries";
import { UnitManagerDialog } from "./unit-manager-dialog";
import { aliquotStatus, computeCoverage, formatAliquot } from "@/lib/units/aliquot";
import type { OwnershipMode } from "@/types/database";
import { UNIT_TYPE_LABELS } from "@/lib/labels";
import { compararUnidades } from "@/lib/units/orden";
import { UnitsFilter } from "./units-filter";

const MODE_LABEL: Record<OwnershipMode, string> = {
  owner_occupied: "PROPIETARIO",
  tenant_with_active_owner: "PROP + INQUILINO",
  tenant_only: "SOLO INQUILINO",
};

const MODE_TONE: Record<OwnershipMode, string> = {
  owner_occupied: "bg-marine-deep text-frost",
  tenant_with_active_owner: "bg-cyan text-frost",
  tenant_only: "bg-ember text-marine-deep",
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
    .select("id, unit_number, floor, block, type, ownership_mode, aliquot")
    .eq("organization_id", profile.organization_id)
    .order("unit_number");

  const unitIds = (units ?? []).map((u) => u.id);

  // Semáforo de alícuotas. Es el punto de entrada a la hoja: sin esto, la
  // pantalla no da ninguna pista de que la alícuota existe ni de que hace falta.
  const cobertura = computeCoverage(
    (units ?? []).map((u) => ({
      aliquot: u.aliquot === null || u.aliquot === undefined ? null : Number(u.aliquot),
    })),
  );
  const estadoAliquot = aliquotStatus(cobertura);
  const TONO_ALIQUOT: Record<string, string> = {
    ok: "border-cyan/40 bg-cyan/5",
    warn: "border-ember/40 bg-ember/5",
    danger: "border-destructive/40 bg-destructive/5",
  };
  const TEXTO_ALIQUOT: Record<string, string> = {
    ok: "text-cyan-ink",
    warn: "text-ember-ink",
    danger: "text-destructive",
  };

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
        <span className="font-meta-loose text-cyan-ink">GESTIÓN · UNIDADES</span>
        <h1 className="mt-4 font-display text-[clamp(1.75rem,3.5vw,2.5rem)] leading-[1.1] tracking-[-0.03em] text-marine-deep">
          Configura <em className="font-editorial text-cyan">ocupación</em> y acceso
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

      {(units ?? []).length > 0 && (
        <Link
          href="/admin/units/alicuotas"
          className={`group flex flex-wrap items-center justify-between gap-x-5 gap-y-2 rounded-2xl border p-5 transition-colors ${TONO_ALIQUOT[estadoAliquot.tone]}`}
        >
          <div className="min-w-0">
            <p className={`font-meta ${TEXTO_ALIQUOT[estadoAliquot.tone]}`}>
              ALÍCUOTAS · {estadoAliquot.label}
            </p>
            <p className="mt-2 text-[14px] text-marine-deep max-w-2xl">{estadoAliquot.detail}</p>
          </div>
          <span className={`font-meta shrink-0 transition-transform group-hover:translate-x-0.5 ${TEXTO_ALIQUOT[estadoAliquot.tone]}`}>
            {cobertura.configured === 0 ? "CARGARLAS" : "EDITAR"} →
          </span>
        </Link>
      )}

      <UnitsFilter
        filas={[...(units ?? [])].sort(compararUnidades).map((unit) => {
          const mode = unit.ownership_mode as OwnershipMode;
          const members = membersByUnit.get(unit.id) ?? [];
          const invites = invitesByUnit.get(unit.id) ?? [];
          const codes = codesByUnit.get(unit.id) ?? [];
          const nombre = (m: (typeof members)[number] | undefined) => {
            const pr = m?.profiles as { full_name?: string; email?: string } | null | undefined;
            return pr?.full_name || pr?.email || "";
          };
          const propietario = nombre(members.find((m) => m.role === "owner"));
          const inquilino = nombre(members.find((m) => m.role === "tenant"));
          const tipo = unit.type === "apartment" ? "Apto" : UNIT_TYPE_LABELS[unit.type] ?? unit.type;

          return {
            id: unit.id,
            torre: unit.block,
            busqueda: `${unit.unit_number} ${unit.block ?? ""} ${propietario} ${inquilino}`.toLowerCase(),
            fila: (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                <div className="w-full sm:w-44 shrink-0">
                  <p className="text-[15px] font-semibold text-marine-deep">
                    {unit.type === "penthouse" ? "" : `${tipo} `}
                    {unit.unit_number}
                    {unit.block && <span className="font-normal text-mute"> · {unit.block}</span>}
                  </p>
                  <p className="font-meta text-mute">
                    {unit.aliquot === null || unit.aliquot === undefined ? (
                      <span className="text-ember-ink">SIN ALÍCUOTA</span>
                    ) : (
                      formatAliquot(Number(unit.aliquot))
                    )}
                    {unit.floor != null && ` · PISO ${unit.floor}`}
                  </p>
                </div>
                <div className="min-w-0 flex-1 text-[13.5px]">
                  <p className="truncate text-marine-deep">
                    {propietario || <span className="text-mute">Sin propietario</span>}
                  </p>
                  <p className="truncate text-mute">
                    {inquilino ? `Inquilino: ${inquilino}` : MODE_LABEL[mode] === "PROPIETARIO" ? "Vive el propietario" : ""}
                    {(invites.length > 0 || codes.length > 0) && (
                      <span className="text-ember-ink">
                        {" "}· {invites.length + codes.length} acceso{invites.length + codes.length !== 1 ? "s" : ""} pendiente{invites.length + codes.length !== 1 ? "s" : ""}
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`hidden md:inline font-meta px-2 py-0.5 rounded-md ${MODE_TONE[mode]}`}>
                    {MODE_LABEL[mode]}
                  </span>
                  <UnitManagerDialog
                    unit={{
                      id: unit.id,
                      unit_number: unit.block ? `${unit.unit_number} · ${unit.block}` : unit.unit_number,
                      ownership_mode: mode,
                    }}
                    members={members.map((m) => ({
                      id: m.id,
                      role: m.role as "owner" | "tenant",
                      full_name: (m.profiles as { full_name?: string; email?: string } | null)?.full_name ?? "",
                      email: (m.profiles as { full_name?: string; email?: string } | null)?.email ?? "",
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
            ),
          };
        })}
      />
    </div>
  );
}
