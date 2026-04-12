"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function grantAccess(passId: string) {
  const supabase = await createClient();

  // Verify caller is authenticated
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Debes iniciar sesion para registrar acceso" };

  // Mark pass as used — RLS ensures only org members can update
  const { error: updateError, count } = await supabase
    .from("access_passes")
    .update({ status: "used", used_at: new Date().toISOString() })
    .eq("id", passId)
    .eq("status", "active");

  if (updateError) return { error: updateError.message };
  if (count === 0) return { error: "Pase no encontrado o ya fue utilizado" };

  // Log the access
  await supabase.from("access_logs").insert({
    pass_id: passId,
    action: "granted",
  });

  revalidatePath("/visitantes");
  return { success: true };
}
