"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, getUserUnitIds } from "@/lib/queries";
import { revalidatePath } from "next/cache";

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

    const unitIds = await getUserUnitIds(profile.id);
    const unitId = unitIds[0] ?? null;

    const supabase = await createClient();

    // 1) Insert primero — si falla, no intentamos subir fotos huérfanas.
    const { data: inserted, error: insertError } = await supabase
      .from("maintenance_requests")
      .insert({
        organization_id: profile.organization_id,
        unit_id: unitId,
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

      const { data: urlData } = supabase.storage
        .from("maintenance-photos")
        .getPublicUrl(path);
      photoUrls.push(urlData.publicUrl);
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
    if (profile.role !== "admin" && profile.role !== "super_admin") {
      return { error: "Solo administradores pueden cambiar el estado" };
    }

    const supabase = await createClient();

    const updates: Record<string, unknown> = { status };
    if (assignedTo !== undefined) updates.assigned_to = assignedTo || null;
    if (status === "resolved") updates.resolved_at = new Date().toISOString();

    const { error } = await supabase
      .from("maintenance_requests")
      .update(updates)
      .eq("id", requestId)
      .eq("organization_id", profile.organization_id);

    if (error) return { error: error.message };

    await supabase.from("maintenance_status_log").insert({
      request_id: requestId,
      new_status: status,
      changed_by: profile.id,
    });

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
