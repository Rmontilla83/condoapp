"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function grantAccess(passId: string) {
  const supabase = await createClient();

  // Mark pass as used
  const { error: updateError } = await supabase
    .from("access_passes")
    .update({ status: "used", used_at: new Date().toISOString() })
    .eq("id", passId)
    .eq("status", "active");

  if (updateError) return { error: updateError.message };

  // Log the access
  const { error: logError } = await supabase.from("access_logs").insert({
    pass_id: passId,
    action: "granted",
  });

  if (logError) return { error: logError.message };

  revalidatePath("/visitantes");
  return { success: true };
}
