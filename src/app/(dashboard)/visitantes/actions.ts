"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, getUserUnitIds } from "@/lib/queries";
import { revalidatePath } from "next/cache";

export async function createAccessPass(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return { error: "No tienes organizacion asignada" };

  const unitIds = await getUserUnitIds(profile.id);

  const visitorName = (formData.get("visitor_name") as string)?.trim();
  const visitorId = (formData.get("visitor_id") as string)?.trim();

  if (!visitorName) return { error: "Nombre del visitante es requerido" };
  if (!visitorId) return { error: "Cedula del visitante es requerida" };

  const supabase = await createClient();
  const qrCode = crypto.randomUUID();
  const validFrom = new Date();
  const validUntil = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h default. PR #3 lo dinamiza por kind.

  const { data, error } = await supabase
    .from("access_passes")
    .insert({
      organization_id: profile.organization_id,
      created_by: profile.id,
      visitor_name: visitorName,
      visitor_id_number: visitorId,
      qr_code: qrCode,
      unit_id: unitIds[0] ?? null,
      status: "active",
      valid_from: validFrom.toISOString(),
      valid_until: validUntil.toISOString(),
    })
    .select("id, qr_code")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/visitantes");
  return { success: true, qrCode: data.qr_code, passId: data.id };
}

export async function cancelPass(passId: string) {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "No autenticado" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("access_passes")
    .update({ status: "cancelled" })
    .eq("id", passId)
    .eq("created_by", profile.id);

  if (error) return { error: error.message };
  revalidatePath("/visitantes");
  revalidatePath("/dashboard");
  return { success: true };
}
