"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/queries";
import { VERSION_CONDICIONES } from "@/lib/legal";

/** Deja constancia de quién aceptó, qué versión y cuándo. */
export async function aceptarCondiciones(): Promise<{ error: string } | { success: true }> {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Tu sesión terminó. Vuelve a entrar." };
  const { error } = await createAdminClient()
    .from("profiles")
    .update({ terms_version: VERSION_CONDICIONES, terms_accepted_at: new Date().toISOString() })
    .eq("id", profile.id);
  if (error) return { error: error.message };
  return { success: true };
}
