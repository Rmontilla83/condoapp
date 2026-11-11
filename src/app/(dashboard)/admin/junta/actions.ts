"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/queries";
import { requireAdmin } from "@/lib/permissions";
import { registrarEvento } from "@/lib/historial";

type Resultado = { error: string } | { success: true };
const ESTADOS = ["pendiente", "en_curso", "hecha"] as const;

function refrescar() {
  revalidatePath("/admin/junta");
  revalidatePath("/documentos");
}

/** Crea o edita una tarea u objetivo de la Junta (migration 071). */
export async function guardarTarea(fd: FormData): Promise<Resultado> {
  const profile = await getCurrentProfile();
  const guard = requireAdmin(profile, "decidir");
  if (guard) return guard;
  const orgId = profile!.organization_id!;

  const id = String(fd.get("id") ?? "") || null;
  const titulo = String(fd.get("titulo") ?? "").trim().slice(0, 150);
  if (titulo.length < 3) return { error: "Escribe el título de la tarea." };
  const estadoCrudo = String(fd.get("estado") ?? "pendiente");
  const estado = (ESTADOS as readonly string[]).includes(estadoCrudo) ? estadoCrudo : "pendiente";
  const fecha = String(fd.get("fecha_objetivo") ?? "");
  const fila = {
    titulo,
    detalle: String(fd.get("detalle") ?? "").trim().slice(0, 1000) || null,
    responsable: String(fd.get("responsable") ?? "").trim().slice(0, 120) || null,
    fecha_objetivo: /^\d{4}-\d{2}-\d{2}$/.test(fecha) ? fecha : null,
    visible_vecinos: fd.get("visible_vecinos") === "on",
    estado,
    completada_en: estado === "hecha" ? new Date().toISOString() : null,
    actualizado_en: new Date().toISOString(),
  };

  const db = createAdminClient();
  if (id) {
    const { data: previa } = await db.from("junta_tareas").select("estado, completada_en").eq("id", id).eq("organization_id", orgId).maybeSingle();
    if (!previa) return { error: "Esa tarea no existe." };
    // La fecha en que se terminó no se mueve al editar otra cosa.
    if (estado === "hecha" && previa.estado === "hecha") fila.completada_en = previa.completada_en as string;
    const { error } = await db.from("junta_tareas").update(fila).eq("id", id).eq("organization_id", orgId);
    if (error) return { error: error.message };
  } else {
    const { error } = await db.from("junta_tareas").insert({ ...fila, organization_id: orgId, creado_por: profile!.id });
    if (error) return { error: error.message };
  }
  await registrarEvento({
    orgId,
    actorId: profile!.id,
    evento: "junta_task_saved",
    datos: { titulo, estado: estado === "hecha" ? "Hecha" : estado === "en_curso" ? "En curso" : "Pendiente", visible: fila.visible_vecinos ? "los vecinos" : "solo la administración" },
  });
  refrescar();
  return { success: true };
}

/** Archivar no borra: la tarea sale del panel y queda en la base. */
export async function archivarTarea(id: string): Promise<Resultado> {
  const profile = await getCurrentProfile();
  const guard = requireAdmin(profile, "decidir");
  if (guard) return guard;
  const { data, error } = await createAdminClient()
    .from("junta_tareas")
    .update({ archivada_en: new Date().toISOString() })
    .eq("id", id)
    .eq("organization_id", profile!.organization_id!)
    .is("archivada_en", null)
    .select("titulo");
  if (error) return { error: error.message };
  if (!data?.length) return { error: "Esa tarea no existe." };
  await registrarEvento({ orgId: profile!.organization_id!, actorId: profile!.id, evento: "junta_task_saved", datos: { titulo: data[0].titulo, estado: "Archivada" } });
  refrescar();
  return { success: true };
}
