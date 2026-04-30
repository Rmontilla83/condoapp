"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, getUserUnitIds } from "@/lib/queries";
import { revalidatePath } from "next/cache";
import { normalizeVisitorKind, resolveDurationHours } from "./visitor-kinds";

export async function createAccessPass(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return { error: "No tienes organizacion asignada" };

  const unitIds = await getUserUnitIds(profile.id);

  const visitorName = (formData.get("visitor_name") as string)?.trim();
  const visitorId = (formData.get("visitor_id") as string)?.trim();
  const kind = normalizeVisitorKind(formData.get("kind"));
  const vehiclePlateRaw = (formData.get("vehicle_plate") as string)?.trim() ?? "";
  const vehiclePlate = vehiclePlateRaw.length > 0 ? vehiclePlateRaw.toUpperCase().slice(0, 16) : null;
  const customHoursRaw = formData.get("custom_hours");
  const customHours =
    typeof customHoursRaw === "string" && customHoursRaw.length > 0
      ? Number.parseFloat(customHoursRaw)
      : null;

  if (!visitorName) return { error: "Nombre del visitante es requerido" };
  if (!visitorId) return { error: "Cedula del visitante es requerida" };

  const supabase = await createClient();
  const qrCode = crypto.randomUUID();
  const validFrom = new Date();
  const hours = resolveDurationHours(kind, customHours);
  const validUntil = new Date(Date.now() + hours * 60 * 60 * 1000);

  const { data, error } = await supabase
    .from("access_passes")
    .insert({
      organization_id: profile.organization_id,
      created_by: profile.id,
      visitor_name: visitorName,
      visitor_id_number: visitorId,
      qr_code: qrCode,
      unit_id: unitIds[0] ?? null,
      visitor_kind: kind,
      vehicle_plate: vehiclePlate,
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
