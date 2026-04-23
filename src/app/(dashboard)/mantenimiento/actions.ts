"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, getUserUnitIds } from "@/lib/queries";
import { revalidatePath } from "next/cache";

export async function createMaintenanceRequest(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return { error: "No tienes organizacion asignada" };

  const unitIds = await getUserUnitIds(profile.id);
  // unit_id es nullable en el schema — admins/super_admins sin unidad asignada
  // pueden reportar igual (ej. problema de área común).
  const unitId = unitIds[0] ?? null;

  const title = formData.get("title") as string;
  const category = formData.get("category") as string;
  const description = formData.get("description") as string;
  const priority = (formData.get("priority") as string) || "medium";

  if (!title || !category || !description) {
    return { error: "Completa todos los campos requeridos" };
  }

  const supabase = await createClient();

  // Upload photos if any
  const photoUrls: string[] = [];
  const photos = formData.getAll("photos") as File[];
  const photoErrors: string[] = [];

  for (const photo of photos) {
    if (!photo.size || photo.size === 0) continue;
    const ext = photo.name.split(".").pop() ?? "jpg";
    const path = `${profile.organization_id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("maintenance-photos")
      .upload(path, photo, { contentType: photo.type });

    if (uploadError) {
      photoErrors.push(`${photo.name}: ${uploadError.message}`);
      continue;
    }

    const { data: urlData } = supabase.storage
      .from("maintenance-photos")
      .getPublicUrl(path);
    photoUrls.push(urlData.publicUrl);
  }

  const { error } = await supabase.from("maintenance_requests").insert({
    organization_id: profile.organization_id,
    unit_id: unitId,
    reported_by: profile.id,
    title,
    category,
    description,
    priority,
    photo_urls: photoUrls,
  });

  if (error) return { error: `No se pudo guardar el reporte: ${error.message}` };

  if (photoErrors.length > 0) {
    // Se guardó el reporte pero falló alguna foto — avisar sin bloquear.
    console.warn("Maintenance photo upload errors:", photoErrors);
  }

  revalidatePath("/mantenimiento");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateRequestStatus(
  requestId: string,
  status: string,
  assignedTo?: string
) {
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

  // Log status change
  await supabase.from("maintenance_status_log").insert({
    request_id: requestId,
    new_status: status,
    changed_by: profile.id,
  });

  revalidatePath("/mantenimiento");
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { success: true };
}
