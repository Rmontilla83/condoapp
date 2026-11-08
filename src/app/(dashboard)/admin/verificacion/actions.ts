"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/queries";
import { requireAdmin } from "@/lib/permissions";

type Resultado = { error: string } | { success: true };

function notaValida(nota: string): string | null {
  const limpia = nota.trim();
  return limpia.length >= 5 ? limpia.slice(0, 1000) : null;
}

async function registrar(orgId: string, actorId: string, event: string, payload: Record<string, unknown>) {
  await createAdminClient().from("auth_events").insert({ organization_id: orgId, actor_id: actorId, event, payload });
}

export async function aclararDato(id: string, nota: string): Promise<Resultado> {
  const profile = await getCurrentProfile();
  const guard = requireAdmin(profile);
  if (guard) return guard;
  const aclaracion = notaValida(nota);
  if (!aclaracion) return { error: "Escribe qué se aclaró." };
  const orgId = profile!.organization_id!;

  const { data, error } = await createAdminClient()
    .from("verificacion_carga")
    .update({
      aclaracion,
      aclarado_por: profile!.id,
      aclarado_en: new Date().toISOString(),
      actualizado_en: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("organization_id", orgId)
    .is("aclarado_en", null)
    .neq("estado", "verde")
    .select("id, unit_id, campo");
  if (error) return { error: error.message };
  if (!data?.length) return { error: "Este dato ya no está pendiente." };

  await registrar(orgId, profile!.id, "verificacion_aclarada", { id, unit_id: data[0].unit_id, campo: data[0].campo, nota: aclaracion });
  revalidatePath("/admin/verificacion");
  return { success: true };
}

/** Aclara de una vez todas las unidades que comparten una misma causa. */
export async function aclararHallazgo(titulo: string, nota: string): Promise<Resultado> {
  const profile = await getCurrentProfile();
  const guard = requireAdmin(profile);
  if (guard) return guard;
  const aclaracion = notaValida(nota);
  if (!aclaracion) return { error: "Escribe qué se aclaró." };
  const orgId = profile!.organization_id!;

  const { data, error } = await createAdminClient()
    .from("verificacion_carga")
    .update({
      aclaracion,
      aclarado_por: profile!.id,
      aclarado_en: new Date().toISOString(),
      actualizado_en: new Date().toISOString(),
    })
    .eq("organization_id", orgId)
    .eq("hallazgo", titulo)
    .is("aclarado_en", null)
    .neq("estado", "verde")
    .select("id");
  if (error) return { error: error.message };
  if (!data?.length) return { error: "No quedan datos pendientes en este hallazgo." };

  await registrar(orgId, profile!.id, "verificacion_hallazgo_aclarado", { hallazgo: titulo, filas: data.length, nota: aclaracion });
  revalidatePath("/admin/verificacion");
  return { success: true };
}

export async function reabrirDato(id: string): Promise<Resultado> {
  const profile = await getCurrentProfile();
  const guard = requireAdmin(profile);
  if (guard) return guard;
  const orgId = profile!.organization_id!;

  const { data, error } = await createAdminClient()
    .from("verificacion_carga")
    .update({ aclaracion: null, aclarado_por: null, aclarado_en: null, actualizado_en: new Date().toISOString() })
    .eq("id", id)
    .eq("organization_id", orgId)
    .not("aclarado_en", "is", null)
    .select("id, unit_id, campo");
  if (error) return { error: error.message };
  if (!data?.length) return { error: "Este dato no estaba aclarado." };

  await registrar(orgId, profile!.id, "verificacion_reabierta", { id, unit_id: data[0].unit_id, campo: data[0].campo });
  revalidatePath("/admin/verificacion");
  return { success: true };
}
