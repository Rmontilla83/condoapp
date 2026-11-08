import { cookies } from "next/headers";
import { hashToken } from "@/lib/caseta";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Revisión previa a la migración (migration 064).
 *
 * Vive en el portal pero fuera de la app: no pide cuenta ni pasa por el panel.
 * Quien abre el enlace secreto recibe una cookie con el token; en la base solo
 * está su hash. Cuando todo esté aclarado, se revoca el enlace y se migra.
 */

export const COOKIE_REVISION = "atryum_revision";
export const DURACION_COOKIE_S = 60 * 60 * 24 * 30;

export interface Revision {
  organizationId: string;
  condominio: string;
}

export async function revisionPorToken(token: string): Promise<Revision | null> {
  if (!token || token.length < 20 || token.length > 100) return null;
  const { data } = await createAdminClient()
    .from("verificacion_enlaces")
    .select("organization_id, organizations(name)")
    .eq("token_hash", hashToken(token))
    .is("revocado_en", null)
    .returns<{ organization_id: string; organizations: { name: string } | null }[]>()
    .maybeSingle();
  if (!data) return null;
  return { organizationId: data.organization_id, condominio: data.organizations?.name ?? "" };
}

/** La revisión que abrió ESTE navegador, o null. */
export async function revisionActual(): Promise<Revision | null> {
  const token = (await cookies()).get(COOKIE_REVISION)?.value;
  return token ? revisionPorToken(token) : null;
}
