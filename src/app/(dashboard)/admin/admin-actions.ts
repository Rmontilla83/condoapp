"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/queries";
import { revalidatePath } from "next/cache";

export async function updateExchangeRate(rate: number) {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return { error: "No autorizado" };
  if (profile.role !== "admin" && profile.role !== "super_admin") {
    return { error: "Solo administradores" };
  }

  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];

  const { error } = await supabase.from("exchange_rates").upsert(
    {
      organization_id: profile.organization_id,
      rate,
      source: "bcv",
      effective_date: today,
    },
    { onConflict: "organization_id,effective_date,source" }
  );

  if (error) return { error: error.message };

  revalidatePath("/pagos");
  revalidatePath("/admin");
  return { success: true };
}
