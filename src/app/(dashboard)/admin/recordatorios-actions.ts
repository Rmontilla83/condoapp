"use server";

import { getCurrentProfile } from "@/lib/queries";
import { requireAdmin } from "@/lib/permissions";
import { recordarMorosidad } from "@/lib/recordatorios";

/** La administración recuerda la deuda: a todos los morosos o a una unidad. */
export async function recordarMorosos(unitId?: string): Promise<{ error: string } | { unidades: number; avisados: number }> {
  const profile = await getCurrentProfile();
  const guard = requireAdmin(profile);
  if (guard) return guard;
  return recordarMorosidad(profile!.organization_id!, unitId);
}
