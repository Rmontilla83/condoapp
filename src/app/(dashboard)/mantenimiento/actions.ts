"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, getUserUnitIds } from "@/lib/queries";
import { revalidatePath } from "next/cache";

export async function createMaintenanceRequest(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return { error: "No tienes organizacion asignada" };

  const unitIds = await getUserUnitIds(profile.id);
  const unitId = unitIds[0]; // Use first unit

  const title = formData.get("title") as string;
  const category = formData.get("category") as string;
  const description = formData.get("description") as string;
  const priority = (formData.get("priority") as string) || "medium";

  if (!title || !category || !description) {
    return { error: "Completa todos los campos requeridos" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("maintenance_requests").insert({
    organization_id: profile.organization_id,
    unit_id: unitId,
    reported_by: profile.id,
    title,
    category,
    description,
    priority,
  });

  if (error) return { error: error.message };

  revalidatePath("/mantenimiento");
  revalidatePath("/dashboard");
  return { success: true };
}
