"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/queries";
import { puede, requireAdmin } from "@/lib/permissions";

type Resultado = { error: string } | { success: true };

/**
 * Notas internas de una unidad (migration 075). Solo la administración las ve
 * y las escribe; la tabla no tiene políticas, así que todo pasa por aquí.
 */
export async function agregarNota(unitId: string, texto: string): Promise<Resultado> {
  const profile = await getCurrentProfile();
  const guard = requireAdmin(profile, "cargar");
  if (guard) return guard;
  const limpio = texto.trim();
  if (limpio.length < 2) return { error: "Escribe la nota." };
  if (limpio.length > 2000) return { error: "La nota es muy larga: máximo 2.000 caracteres." };

  const db = createAdminClient();
  const { data: unidad } = await db.from("units").select("id, organization_id").eq("id", unitId).maybeSingle();
  if (!unidad || unidad.organization_id !== profile!.organization_id) return { error: "Unidad no encontrada." };

  const { error } = await db.from("unit_notas").insert({
    organization_id: unidad.organization_id,
    unit_id: unitId,
    texto: limpio,
    creada_por: profile!.id,
  });
  if (error) return { error: "No se pudo guardar la nota." };
  return { success: true };
}

/** Retira una nota: quien la escribió, o quien administra. No se borra; queda el rastro. */
export async function retirarNota(notaId: string): Promise<Resultado> {
  const profile = await getCurrentProfile();
  const guard = requireAdmin(profile, "cargar");
  if (guard) return guard;

  const db = createAdminClient();
  const { data: nota } = await db.from("unit_notas").select("id, organization_id, creada_por, retirada_en").eq("id", notaId).maybeSingle();
  if (!nota || nota.organization_id !== profile!.organization_id) return { error: "Nota no encontrada." };
  if (nota.retirada_en) return { success: true };
  if (nota.creada_por !== profile!.id && !puede(profile, "administrar")) {
    return { error: "Solo quien escribió la nota o quien administra puede retirarla." };
  }
  const { error } = await db.from("unit_notas").update({ retirada_en: new Date().toISOString(), retirada_por: profile!.id }).eq("id", notaId);
  if (error) return { error: "No se pudo retirar la nota." };
  return { success: true };
}
