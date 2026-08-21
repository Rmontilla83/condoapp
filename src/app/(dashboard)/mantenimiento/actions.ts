"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile, getUserUnitIds } from "@/lib/queries";
import { isAdminRole } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { enviarEmail } from "@/lib/email/send";
import { mantenimientoActualizado } from "@/lib/email/templates";
import { emailDePerfil, nombreDeOrg } from "@/lib/email/recipients";
import { MAINTENANCE_STATUS_LABELS } from "@/lib/labels";

export type CreateMaintenanceResult =
  | { success: true; requestId: string; photosUploaded: number; photosFailed: number }
  | { error: string };

export async function createMaintenanceRequest(
  formData: FormData,
): Promise<CreateMaintenanceResult> {
  try {
    const profile = await getCurrentProfile();
    if (!profile?.organization_id) {
      return { error: "No tienes organización asignada." };
    }

    const title = (formData.get("title") as string | null)?.trim() ?? "";
    const category = (formData.get("category") as string | null) ?? "";
    const description = (formData.get("description") as string | null)?.trim() ?? "";
    const priority = (formData.get("priority") as string | null) ?? "medium";

    if (!title || !category || !description) {
      return { error: "Completa todos los campos requeridos." };
    }

    // Ubicación: el dialog manda unit_id O common_area_id (mutuamente excluyentes).
    // Fallback legacy: si no manda nada, usar la primera unit del residente.
    const explicitUnitId = (formData.get("unit_id") as string | null)?.trim() || null;
    const commonAreaId = (formData.get("common_area_id") as string | null)?.trim() || null;

    let unitId: string | null = explicitUnitId;
    if (!unitId && !commonAreaId) {
      const unitIds = await getUserUnitIds(profile.id);
      unitId = unitIds[0] ?? null;
    }

    const supabase = await createClient();

    // 1) Insert primero — si falla, no intentamos subir fotos huérfanas.
    const { data: inserted, error: insertError } = await supabase
      .from("maintenance_requests")
      .insert({
        organization_id: profile.organization_id,
        unit_id: commonAreaId ? null : unitId,
        common_area_id: commonAreaId,
        reported_by: profile.id,
        title,
        category,
        description,
        priority,
        photo_urls: [],
      })
      .select("id")
      .single();

    if (insertError || !inserted) {
      console.error("[maintenance] insert failed:", insertError);
      return { error: `No se pudo guardar el reporte: ${insertError?.message ?? "error desconocido"}` };
    }

    const requestId = inserted.id as string;

    // 2) Upload de fotos, si las hay. No bloquea el éxito del reporte.
    const photos = (formData.getAll("photos") as File[]).filter(
      (p) => p && p.size && p.size > 0,
    );

    let photosUploaded = 0;
    let photosFailed = 0;
    const photoUrls: string[] = [];

    for (const photo of photos) {
      const ext = (photo.name.split(".").pop() ?? "jpg").toLowerCase();
      const path = `${profile.organization_id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("maintenance-photos")
        .upload(path, photo, { contentType: photo.type });

      if (uploadError) {
        console.error("[maintenance] photo upload failed:", uploadError.message);
        photosFailed++;
        continue;
      }

      // Referencia `bucket/path`: el bucket es privado desde la migration 030
      // y se firma al momento de renderizar.
      photoUrls.push(`maintenance-photos/${path}`);
      photosUploaded++;
    }

    // 3) Si se subieron fotos, actualizar el registro con las URLs.
    if (photoUrls.length > 0) {
      const { error: updateError } = await supabase
        .from("maintenance_requests")
        .update({ photo_urls: photoUrls })
        .eq("id", requestId);

      if (updateError) {
        console.error("[maintenance] photo_urls update failed:", updateError.message);
        // El reporte existe sin fotos; no rollback.
      }
    }

    revalidatePath("/mantenimiento");
    revalidatePath("/dashboard");
    revalidatePath("/admin");

    return { success: true, requestId, photosUploaded, photosFailed };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error inesperado";
    console.error("[maintenance] uncaught:", err);
    return { error: `Error inesperado: ${message}` };
  }
}

export async function updateRequestStatus(
  requestId: string,
  status: string,
  assignedTo?: string,
) {
  try {
    const profile = await getCurrentProfile();
    if (!profile?.organization_id) return { error: "No autorizado" };
    if (!isAdminRole(profile)) {
      return { error: "Solo administradores pueden cambiar el estado" };
    }

    // Admin client bypasea RLS — el rol ya lo validamos arriba.
    // RLS de maintenance_requests requiere auth.user_role() que falla con view_as.
    const supabase = createAdminClient();

    const updates: Record<string, unknown> = { status };
    if (assignedTo !== undefined) updates.assigned_to = assignedTo || null;
    if (status === "resolved") updates.resolved_at = new Date().toISOString();

    // .select() para saber a quién avisarle: sin esto el residente reportaba
    // una fuga y no volvía a saber nada nunca más.
    const { data: actualizado, error } = await supabase
      .from("maintenance_requests")
      .update(updates)
      .eq("id", requestId)
      .eq("organization_id", profile.organization_id)
      .select("id, title, reported_by")
      .maybeSingle();

    if (error) return { error: error.message };
    if (!actualizado) return { error: "Reporte no encontrado" };

    await supabase.from("maintenance_status_log").insert({
      request_id: requestId,
      new_status: status,
      changed_by: profile.id,
    });

    // No se le avisa a quien hizo el propio cambio.
    if (actualizado.reported_by && actualizado.reported_by !== profile.id) {
      try {
        const [para, condominio] = await Promise.all([
          emailDePerfil(actualizado.reported_by as string),
          nombreDeOrg(profile.organization_id),
        ]);
        const plantilla = mantenimientoActualizado({
          condominio,
          titulo: (actualizado.title as string) ?? "tu reporte",
          estado: MAINTENANCE_STATUS_LABELS[status] ?? status,
        });
        await enviarEmail({
          para,
          asunto: plantilla.asunto,
          html: plantilla.html,
          evento: "mantenimiento_actualizado",
        });
      } catch (e) {
        console.error("[email] mantenimiento falló:", e instanceof Error ? e.message : e);
      }
    }

    revalidatePath("/mantenimiento");
    revalidatePath("/admin");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error inesperado";
    console.error("[maintenance updateStatus] uncaught:", err);
    return { error: message };
  }
}
