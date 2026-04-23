import { createClient } from "@/lib/supabase/server";
import { getEffectiveRole } from "@/lib/queries";
import type { Profile } from "@/types/database";

type ProfileLike = Profile & { view_as?: string | null };

/**
 * True si el rol efectivo es admin o super_admin.
 * Úsalo en todas las actions en vez de `profile.role !== "admin" && ...`
 * para que los super_admins con view_as=admin pasen el check.
 */
export function isAdminRole(profile: ProfileLike): boolean {
  const role = getEffectiveRole(profile);
  return role === "admin" || role === "super_admin";
}

/**
 * Check + return tipo-estrecho. Úsalo al principio de acciones admin:
 *   const guard = requireAdmin(profile);
 *   if (guard) return guard;
 */
export function requireAdmin(profile: ProfileLike | null): { error: string } | null {
  if (!profile) return { error: "No autenticado" };
  if (!profile.organization_id) return { error: "Sin organización asignada" };
  if (!isAdminRole(profile)) return { error: "Solo administradores pueden hacer esto" };
  return null;
}

/**
 * Membresías del usuario en sus unidades. Útil para saber si alguien es
 * owner (puede siempre) vs sólo tenant (sujeto a tenant_can_*).
 */
export async function getUserMembership(
  profileId: string,
): Promise<{
  ownerUnits: string[];
  tenantUnits: string[];
  isOwner: boolean;
  isTenant: boolean;
}> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("unit_members")
    .select("unit_id, role")
    .eq("profile_id", profileId)
    .eq("active", true);

  const ownerUnits: string[] = [];
  const tenantUnits: string[] = [];
  for (const m of data ?? []) {
    if (m.role === "owner") ownerUnits.push(m.unit_id as string);
    else if (m.role === "tenant") tenantUnits.push(m.unit_id as string);
  }
  return {
    ownerUnits,
    tenantUnits,
    isOwner: ownerUnits.length > 0,
    isTenant: tenantUnits.length > 0,
  };
}

/**
 * Políticas del condominio para inquilinos. Defaults conservadores (false)
 * si algo falla.
 */
export async function getOrgPolicies(
  organizationId: string,
): Promise<{
  tenant_can_vote: boolean;
  tenant_can_see_delinquents: boolean;
  tenant_can_reserve: boolean;
}> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("organizations")
    .select("tenant_can_vote, tenant_can_see_delinquents, tenant_can_reserve")
    .eq("id", organizationId)
    .single();

  return {
    tenant_can_vote: data?.tenant_can_vote ?? false,
    tenant_can_see_delinquents: data?.tenant_can_see_delinquents ?? false,
    tenant_can_reserve: data?.tenant_can_reserve ?? false,
  };
}

/**
 * Evalúa si el user puede ejecutar una acción gobernada por una política
 * de inquilinos. Owners y admins siempre pueden.
 */
export async function canTenantAct(
  profile: ProfileLike,
  policy: "tenant_can_vote" | "tenant_can_reserve" | "tenant_can_see_delinquents",
): Promise<{ allowed: boolean; reason?: string }> {
  if (!profile.organization_id) return { allowed: false, reason: "Sin organización" };
  if (isAdminRole(profile)) return { allowed: true };

  const membership = await getUserMembership(profile.id);
  if (membership.isOwner) return { allowed: true };

  // Solo tenant (o ningún rol) → depende de la política
  const policies = await getOrgPolicies(profile.organization_id);
  if (policies[policy]) return { allowed: true };

  return {
    allowed: false,
    reason: "El reglamento de tu condominio no permite esta acción a inquilinos.",
  };
}
