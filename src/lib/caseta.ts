import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Caseta de vigilancia (migration 044).
 *
 * Una caseta es un navegador (el teléfono o la tablet de la garita) que abrió el
 * enlace secreto que genera la administración. Ese enlace deja una cookie con el
 * token; en la base solo está su hash. El vigilante no necesita cuenta.
 */

export const COOKIE_CASETA = "atryum_caseta";
/** Seis meses: la tablet de la garita no debería pedir el enlace a cada rato. */
export const DURACION_COOKIE_S = 60 * 60 * 24 * 180;

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function nuevoToken(): string {
  return randomBytes(24).toString("base64url");
}

export interface Caseta {
  id: string;
  organization_id: string;
  name: string;
}

export async function casetaPorToken(token: string): Promise<Caseta | null> {
  if (!token || token.length < 20 || token.length > 100) return null;
  const db = createAdminClient();
  const { data } = await db
    .from("guard_stations")
    .select("id, organization_id, name, last_seen_at")
    .eq("token_hash", hashToken(token))
    .eq("active", true)
    .maybeSingle();
  if (!data) return null;

  // "Última vez vista" para que la administración sepa si la caseta está en uso.
  // Se escribe como mucho cada 10 minutos, no en cada carga.
  const visto = data.last_seen_at ? Date.parse(data.last_seen_at as string) : 0;
  if (Date.now() - visto > 10 * 60_000) {
    await db.from("guard_stations").update({ last_seen_at: new Date().toISOString() }).eq("id", data.id);
  }
  return { id: data.id as string, organization_id: data.organization_id as string, name: data.name as string };
}

/** La caseta de ESTE navegador, o null. */
export async function casetaActual(): Promise<Caseta | null> {
  const token = (await cookies()).get(COOKIE_CASETA)?.value;
  return token ? casetaPorToken(token) : null;
}

export async function condominioTieneCasetas(orgId: string): Promise<boolean> {
  const { count } = await createAdminClient()
    .from("guard_stations")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .eq("active", true);
  return (count ?? 0) > 0;
}

/**
 * ¿Puede este navegador registrar la entrada de un pase de `orgId`?
 * Sin casetas activas, sí (así funcionaba antes). Con casetas, solo una caseta
 * de ESE condominio.
 */
export async function puedeRegistrarEntrada(
  orgId: string,
): Promise<{ permitido: boolean; caseta: Caseta | null }> {
  const caseta = await casetaActual();
  if (caseta && caseta.organization_id === orgId) return { permitido: true, caseta };
  if (!(await condominioTieneCasetas(orgId))) return { permitido: true, caseta: null };
  return { permitido: false, caseta: null };
}
