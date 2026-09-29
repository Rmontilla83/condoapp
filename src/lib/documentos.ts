import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminRole } from "@/lib/permissions";
import { getUnitIdsWithFeeAccess } from "@/lib/queries";
import type { Membrete } from "@/components/documentos/documento";
import type { Profile } from "@/types/database";

/**
 * ¿Puede esta persona ver los documentos de cuentas de la unidad?
 * La administración de SU condominio, o un miembro de la unidad con permiso de
 * ver las cuotas (el propietario siempre; el inquilino si se lo dieron).
 */
export async function puedeVerUnidad(profile: Profile, unitId: string): Promise<boolean> {
  const { data: unidad } = await createAdminClient()
    .from("units")
    .select("organization_id")
    .eq("id", unitId)
    .maybeSingle();
  if (!unidad) return false;
  if (isAdminRole(profile) && unidad.organization_id === profile.organization_id) return true;
  return (await getUnitIdsWithFeeAccess(profile.id)).includes(unitId);
}

export async function membreteDe(orgId: string): Promise<Membrete & { timezone: string }> {
  const { data: o } = await createAdminClient()
    .from("organizations")
    .select("name, tax_id, address, city, logo_url, timezone")
    .eq("id", orgId)
    .single();
  return {
    nombre: (o?.name as string) ?? "Condominio",
    rif: (o?.tax_id as string) ?? null,
    direccion: (o?.address as string) || null,
    ciudad: (o?.city as string) || null,
    logoUrl: (o?.logo_url as string) || null,
    timezone: (o?.timezone as string) || "America/Caracas",
  };
}

export function fechaLarga(isoODia: string, tz = "America/Caracas"): string {
  const d = /^\d{4}-\d{2}-\d{2}$/.test(isoODia) ? new Date(`${isoODia}T12:00:00Z`) : new Date(isoODia);
  return d.toLocaleDateString("es-VE", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: /^\d{4}-\d{2}-\d{2}$/.test(isoODia) ? "UTC" : tz,
  });
}
