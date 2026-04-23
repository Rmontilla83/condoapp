"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/queries";
import { canTenantAct } from "@/lib/permissions";
import { revalidatePath } from "next/cache";

export async function createReservation(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return { error: "No tienes organización asignada" };

  // Policy V2: inquilinos solo pueden reservar si el condominio lo permite.
  // Owners y admins siempre pueden.
  const gate = await canTenantAct(profile, "tenant_can_reserve");
  if (!gate.allowed) {
    return { error: gate.reason ?? "No puedes reservar en este condominio." };
  }

  const areaId = formData.get("area_id") as string;
  const date = formData.get("date") as string;
  const startHour = formData.get("start_hour") as string;
  const endHour = formData.get("end_hour") as string;
  const notes = (formData.get("notes") as string)?.trim() || null;

  if (!areaId || !date || !startHour || !endHour) {
    return { error: "Completa todos los campos" };
  }

  const startTime = `${date}T${startHour}:00`;
  const endTime = `${date}T${endHour}:00`;

  if (startHour >= endHour) {
    return { error: "La hora de fin debe ser posterior a la de inicio" };
  }

  const supabase = await createClient();

  // Check for conflicts
  const { data: conflicts } = await supabase
    .from("reservations")
    .select("id")
    .eq("common_area_id", areaId)
    .eq("status", "confirmed")
    .lt("start_time", endTime)
    .gt("end_time", startTime);

  if (conflicts && conflicts.length > 0) {
    return { error: "Ese horario ya está reservado. Elige otro." };
  }

  const { error } = await supabase.from("reservations").insert({
    common_area_id: areaId,
    reserved_by: profile.id,
    start_time: startTime,
    end_time: endTime,
    status: "confirmed",
    notes,
  });

  if (error) return { error: error.message };

  revalidatePath("/reservas");
  return { success: true };
}

export async function cancelReservation(reservationId: string) {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "No autenticado" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("reservations")
    .update({ status: "cancelled" })
    .eq("id", reservationId)
    .eq("reserved_by", profile.id);

  if (error) return { error: error.message };
  revalidatePath("/reservas");
  return { success: true };
}
