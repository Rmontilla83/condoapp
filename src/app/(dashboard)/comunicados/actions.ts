"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/queries";
import { isAdminRole } from "@/lib/permissions";
import { revalidatePath } from "next/cache";

export async function createAnnouncement(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return { error: "No tienes organización" };
  if (!isAdminRole(profile)) {
    return { error: "Solo administradores pueden crear comunicados" };
  }

  const title = (formData.get("title") as string)?.trim();
  const content = (formData.get("content") as string)?.trim();
  const priority = (formData.get("priority") as string) || "normal";

  if (!title || !content) return { error: "Título y contenido son requeridos" };

  // Admin client bypasses RLS — el rol ya lo validamos arriba con isAdminRole.
  // RLS de announcements mira auth.user_role() que resulta stale con view_as.
  const supabase = createAdminClient();
  const { error } = await supabase.from("announcements").insert({
    organization_id: profile.organization_id,
    author_id: profile.id,
    title,
    content,
    priority,
    target_audience: "all",
  });

  if (error) return { error: error.message };

  revalidatePath("/comunicados");
  revalidatePath("/dashboard");
  return { success: true };
}
