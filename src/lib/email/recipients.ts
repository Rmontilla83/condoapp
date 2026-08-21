import { createAdminClient } from "@/lib/supabase/admin";

/**
 * A quién le escribimos.
 *
 * Server-only: usa el admin client porque estas consultas cruzan
 * unit_members → profiles y corren dentro de server actions que YA validaron la
 * autorización (aprobar un pago, publicar un comunicado). Nunca se llama con
 * datos que vengan del cliente sin filtrar por organización.
 */

/** Correos de los miembros activos de una unidad (propietario e inquilino). */
export async function emailsDeUnidad(unitId: string): Promise<string[]> {
  if (!unitId) return [];
  const admin = createAdminClient();
  const { data } = await admin
    .from("unit_members")
    .select("profiles(email)")
    .eq("unit_id", unitId)
    .eq("active", true);

  return (data ?? [])
    .map((m) => {
      const p = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
      return (p as { email?: string } | null)?.email ?? null;
    })
    .filter((e): e is string => Boolean(e));
}

/**
 * Correos de los miembros activos de VARIAS unidades, en una sola consulta.
 *
 * La versión de a una servía para un pago puntual, pero emitir las cuotas de un
 * condominio de 40 unidades hacía 40 viajes a la base más 40 envíos: demasiado
 * para el tiempo de una función serverless.
 */
export async function emailsPorUnidad(
  unitIds: string[],
): Promise<Map<string, string[]>> {
  const out = new Map<string, string[]>();
  if (unitIds.length === 0) return out;

  const admin = createAdminClient();
  const { data } = await admin
    .from("unit_members")
    .select("unit_id, profiles(email)")
    .in("unit_id", unitIds)
    .eq("active", true);

  for (const m of data ?? []) {
    const p = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
    const email = (p as { email?: string } | null)?.email;
    if (!email) continue;
    const unitId = m.unit_id as string;
    const lista = out.get(unitId) ?? [];
    if (!lista.includes(email)) lista.push(email);
    out.set(unitId, lista);
  }

  return out;
}

/** Correos de quien reportó algo (o de cualquier perfil suelto). */
export async function emailDePerfil(profileId: string | null | undefined): Promise<string[]> {
  if (!profileId) return [];
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("email")
    .eq("id", profileId)
    .maybeSingle();
  return data?.email ? [data.email as string] : [];
}

/**
 * Correos de todos los residentes de un condominio.
 *
 * Se resuelve por `unit_members` activos y no por `profiles.organization_id`,
 * porque un super_admin "viendo como" tiene la organización seteada y no debe
 * recibir los comunicados del condominio que está inspeccionando.
 */
export async function emailsDeOrg(orgId: string): Promise<string[]> {
  if (!orgId) return [];
  const admin = createAdminClient();

  const { data: unidades } = await admin
    .from("units")
    .select("id")
    .eq("organization_id", orgId);

  const ids = (unidades ?? []).map((u) => u.id as string);
  if (ids.length === 0) return [];

  const { data } = await admin
    .from("unit_members")
    .select("profiles(email)")
    .in("unit_id", ids)
    .eq("active", true);

  return [
    ...new Set(
      (data ?? [])
        .map((m) => {
          const p = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
          return (p as { email?: string } | null)?.email ?? null;
        })
        .filter((e): e is string => Boolean(e)),
    ),
  ];
}

/** Nombre del condominio, para encabezar el correo. */
export async function nombreDeOrg(orgId: string): Promise<string> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("organizations")
    .select("name")
    .eq("id", orgId)
    .maybeSingle();
  return (data?.name as string) ?? "Tu condominio";
}
