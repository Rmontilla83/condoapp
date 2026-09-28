import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Saldo a favor por unidad (migration 043). El saldo es la suma del libro
 * `unit_credits`; nunca se guarda como número suelto.
 *
 * `db` puede ser el cliente de la sesión (la RLS deja ver el saldo propio y, a
 * los admins, el del condominio) o el admin client.
 */
export async function saldosPorUnidad(
  db: SupabaseClient,
  unitIds: string[],
): Promise<Map<string, number>> {
  const saldos = new Map<string, number>();
  if (unitIds.length === 0) return saldos;
  const { data } = await db
    .from("unit_credits")
    .select("unit_id, amount")
    .in("unit_id", unitIds);
  for (const m of data ?? []) {
    const id = m.unit_id as string;
    saldos.set(id, Math.round(((saldos.get(id) ?? 0) + Number(m.amount)) * 100) / 100);
  }
  for (const [id, s] of saldos) if (s === 0) saldos.delete(id);
  return saldos;
}

/**
 * Aplica el saldo de cada unidad a sus cuotas pendientes. Solo con el admin
 * client: la función está revocada para anon y authenticated. Nunca lanza —
 * si falla, las cuotas quedan como estaban y el saldo sigue disponible.
 */
export async function aplicarSaldos(
  admin: SupabaseClient,
  unitIds: string[],
  actorId: string | null,
): Promise<number> {
  let tocadas = 0;
  const saldos = await saldosPorUnidad(admin, unitIds);
  for (const [unitId, saldo] of saldos) {
    if (saldo <= 0) continue;
    const { data, error } = await admin.rpc("aplicar_saldo_a_favor", {
      p_unit: unitId,
      p_actor: actorId,
    });
    if (error) console.error("[saldos] aplicar falló:", unitId, error.message);
    else tocadas += Number(data) || 0;
  }
  return tocadas;
}
