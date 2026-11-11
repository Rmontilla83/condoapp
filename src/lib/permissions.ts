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
 * Funciones dentro de la administración (migration 069).
 *
 * Todas entran al panel y lo ven todo; lo que cambia es qué pueden hacer. La
 * regla que pidió la Junta: quien carga no es quien aprueba.
 *
 *   completa        sin separación: hace todo. Es la cuenta de siempre (función
 *                   sin asignar) y el equipo de Atryum.
 *   administradora  opera el condominio, salvo lo que aprueba la Junta.
 *   junta           ve todo y aprueba: presupuesto, documentos y censo.
 *   asistente       carga gastos, ingresos, documentos y reportes; no aprueba.
 *   contador        solo lectura.
 */
export type FuncionAdmin = "completa" | "administradora" | "junta" | "asistente" | "contador";

export const FUNCIONES: Record<FuncionAdmin, { nombre: string; resumen: string }> = {
  completa: { nombre: "Administración completa", resumen: "Hace todo, sin separación de tareas." },
  administradora: { nombre: "Administradora", resumen: "Opera el condominio. No aprueba lo que le toca a la Junta." },
  junta: { nombre: "Junta de Condominio", resumen: "Ve todo y aprueba el presupuesto, los documentos y el censo." },
  asistente: { nombre: "Asistente administrativo", resumen: "Carga gastos, ingresos y documentos. No aprueba." },
  contador: { nombre: "Contador", resumen: "Solo lectura." },
};

/**
 *   cargar          registrar gastos e ingresos, subir documentos, atender reportes.
 *   administrar     cobrar, emitir, anular, unidades, alícuotas y configuración.
 *   aprobar_junta   aprobar el presupuesto, publicar documentos y aprobar el censo.
 *   comunicar       publicar comunicados.
 *   decidir         crear y cerrar consultas y asambleas; llevar las tareas de la Junta.
 */
export type Permiso = "cargar" | "administrar" | "aprobar_junta" | "comunicar" | "decidir";

const MATRIZ: Record<Permiso, FuncionAdmin[]> = {
  cargar: ["completa", "administradora", "asistente"],
  administrar: ["completa", "administradora"],
  aprobar_junta: ["completa", "junta"],
  comunicar: ["completa", "administradora", "junta", "asistente"],
  decidir: ["completa", "administradora", "junta"],
};

/** La función de una cuenta de administración, o null si no lo es. */
export function funcionDe(profile: ProfileLike | null): FuncionAdmin | null {
  if (!profile || !isAdminRole(profile)) return null;
  if (profile.role === "super_admin") return "completa";
  return (profile.admin_funcion as FuncionAdmin | null | undefined) ?? "completa";
}

export function puede(profile: ProfileLike | null, permiso: Permiso): boolean {
  const funcion = funcionDe(profile);
  return funcion !== null && MATRIZ[permiso].includes(funcion);
}

/** Por qué no, en palabras de quien lo lee. */
export function sinPermiso(profile: ProfileLike | null): string {
  const funcion = funcionDe(profile);
  if (!funcion) return "Solo la administración puede hacer esto";
  return `Tu función (${FUNCIONES[funcion].nombre}) no permite hacer esto.`;
}

/**
 * Check + return tipo-estrecho. Úsalo al principio de acciones admin:
 *   const guard = requireAdmin(profile);
 *   if (guard) return guard;
 *
 * Sin segundo argumento exige «administrar», que es lo más restrictivo de la
 * operación diaria: una acción nueva nace cerrada para asistente y contador.
 */
export function requireAdmin(profile: ProfileLike | null, permiso: Permiso = "administrar"): { error: string } | null {
  if (!profile) return { error: "No autenticado" };
  if (!profile.organization_id) return { error: "Sin organización asignada" };
  if (!isAdminRole(profile)) return { error: "Solo administradores pueden hacer esto" };
  if (!puede(profile, permiso)) return { error: sinPermiso(profile) };
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
  tenant_can_see_decisions: boolean;
}> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("organizations")
    .select("tenant_can_vote, tenant_can_see_delinquents, tenant_can_reserve, tenant_can_see_decisions")
    .eq("id", organizationId)
    .single();

  return {
    tenant_can_vote: data?.tenant_can_vote ?? false,
    tenant_can_see_delinquents: data?.tenant_can_see_delinquents ?? false,
    tenant_can_reserve: data?.tenant_can_reserve ?? false,
    tenant_can_see_decisions: data?.tenant_can_see_decisions ?? true,
  };
}

/**
 * Evalúa si el user puede ejecutar una acción gobernada por una política
 * de inquilinos. Owners y admins siempre pueden.
 */
export async function canTenantAct(
  profile: ProfileLike,
  policy: "tenant_can_vote" | "tenant_can_reserve" | "tenant_can_see_delinquents" | "tenant_can_see_decisions",
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
