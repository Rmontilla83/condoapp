import { createAdminClient } from "@/lib/supabase/admin";
import { compararUnidades } from "@/lib/units/orden";

export interface Propietario {
  unitId: string;
  torre: string;
  unidad: string;
  profileId: string;
  nombre: string;
  correo: string;
  telefono: string | null;
  entro: boolean;
  invitadoEl: string | null;
}

/**
 * Propietarios activos del condominio con su estado de acceso. Con el admin
 * client: la vista la usa la administración (a veces un super_admin con
 * view_as) y las políticas de profiles no le muestran los correos ajenos.
 */
export async function propietariosDeOrg(orgId: string): Promise<Propietario[]> {
  const db = createAdminClient();
  const [{ data: miembros }, { data: invitaciones }, usuarios] = await Promise.all([
    db
      .from("unit_members")
      .select("unit_id, units!inner(unit_number, block, organization_id), profiles!inner(id, full_name, email, phone)")
      .eq("role", "owner")
      .eq("active", true)
      .eq("units.organization_id", orgId),
    db
      .from("auth_events")
      .select("target_email, created_at")
      .eq("organization_id", orgId)
      .eq("event", "portal_invite_sent")
      .order("created_at", { ascending: false })
      .limit(2000),
    ultimosAccesos(),
  ]);

  const invitado = new Map<string, string>();
  for (const i of invitaciones ?? []) {
    const correo = (i.target_email as string | null)?.toLowerCase();
    if (correo && !invitado.has(correo)) invitado.set(correo, i.created_at as string);
  }

  type Fila = {
    unit_id: string;
    units: { unit_number: string; block: string | null };
    profiles: { id: string; full_name: string | null; email: string; phone: string | null };
  };
  return ((miembros ?? []) as unknown as Fila[])
    .map((m) => ({
      unitId: m.unit_id,
      torre: m.units.block ?? "",
      unidad: m.units.unit_number,
      profileId: m.profiles.id,
      nombre: m.profiles.full_name ?? "",
      correo: (m.profiles.email ?? "").toLowerCase(),
      telefono: m.profiles.phone,
      entro: usuarios.has(m.profiles.id),
      invitadoEl: invitado.get((m.profiles.email ?? "").toLowerCase()) ?? null,
    }))
    .sort((a, b) =>
      compararUnidades({ unit_number: a.unidad, block: a.torre || null }, { unit_number: b.unidad, block: b.torre || null }),
    );
}

/** Ids de las cuentas que ya iniciaron sesión alguna vez. */
async function ultimosAccesos(): Promise<Set<string>> {
  const db = createAdminClient();
  const entraron = new Set<string>();
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error || !data) break;
    for (const u of data.users) if (u.last_sign_in_at) entraron.add(u.id);
    if (data.users.length < 1000) break;
  }
  return entraron;
}
