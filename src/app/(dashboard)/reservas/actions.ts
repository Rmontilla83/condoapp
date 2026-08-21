"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/queries";
import { canTenantAct } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { DEFAULT_TIME_ZONE, zonedToISO } from "@/lib/utils";

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

  if (startHour >= endHour) {
    return { error: "La hora de fin debe ser posterior a la de inicio" };
  }

  const supabase = await createClient();

  // La hora que eligió el residente es la hora del condominio, no la del
  // servidor. Sin convertirla, "de 2 a 4" se guardaba como 14:00 UTC y se leía
  // como 10:00 de la mañana en Venezuela.
  const { data: org } = await supabase
    .from("organizations")
    .select("timezone")
    .eq("id", profile.organization_id)
    .maybeSingle();
  const zona = org?.timezone || DEFAULT_TIME_ZONE;

  let startTime: string;
  let endTime: string;
  try {
    startTime = zonedToISO(date, startHour, zona);
    endTime = zonedToISO(date, endHour, zona);
  } catch {
    return { error: "La fecha o la hora no son válidas." };
  }

  // Cargar la amenidad con sus políticas de uso
  const { data: area } = await supabase
    .from("common_areas")
    .select(
      "id, max_reservations_per_week, max_duration_hours, min_advance_hours, max_advance_days",
    )
    .eq("id", areaId)
    .eq("organization_id", profile.organization_id)
    // Un área retirada desaparece del desplegable, pero sin este filtro la
    // acción seguía aceptándola: bastaba una pestaña vieja abierta.
    .eq("is_active", true)
    .maybeSingle();

  if (!area) {
    return { error: "Esa área ya no está disponible para reservar." };
  }

  const startDt = new Date(startTime);
  const endDt = new Date(endTime);
  const now = new Date();

  // Anticipación mínima
  if (area.min_advance_hours && area.min_advance_hours > 0) {
    if (startDt.getTime() - now.getTime() < area.min_advance_hours * 3_600_000) {
      return {
        error: `Esta amenidad requiere reservar con al menos ${area.min_advance_hours} h de anticipación.`,
      };
    }
  }

  // Anticipación máxima
  if (area.max_advance_days != null) {
    if (startDt.getTime() - now.getTime() > area.max_advance_days * 86_400_000) {
      return {
        error: `No puedes reservar con más de ${area.max_advance_days} días de anticipación.`,
      };
    }
  }

  // Duración máxima
  if (area.max_duration_hours != null) {
    const durationHours = (endDt.getTime() - startDt.getTime()) / 3_600_000;
    if (durationHours > Number(area.max_duration_hours) + 1e-6) {
      return {
        error: `La duración máxima para esta amenidad es ${area.max_duration_hours} h.`,
      };
    }
  }

  // Máximo de reservas por semana (lun-dom) del mismo residente
  if (area.max_reservations_per_week != null) {
    // La semana también es la del condominio: partimos del día elegido a
    // medianoche local y retrocedemos hasta el lunes, en días de calendario.
    const [anio, mes, dia] = date.split("-").map(Number);
    const soloFecha = new Date(Date.UTC(anio, mes - 1, dia));
    const sinceMonday = (soloFecha.getUTCDay() + 6) % 7; // 0=lunes
    soloFecha.setUTCDate(soloFecha.getUTCDate() - sinceMonday);
    const lunesISO = soloFecha.toISOString().slice(0, 10);
    soloFecha.setUTCDate(soloFecha.getUTCDate() + 7);
    const siguienteLunesISO = soloFecha.toISOString().slice(0, 10);

    const monday = new Date(zonedToISO(lunesISO, "00:00", zona));
    const nextMonday = new Date(zonedToISO(siguienteLunesISO, "00:00", zona));

    const { count } = await supabase
      .from("reservations")
      .select("id", { count: "exact", head: true })
      .eq("common_area_id", areaId)
      .eq("reserved_by", profile.id)
      .eq("status", "confirmed")
      .gte("start_time", monday.toISOString())
      .lt("start_time", nextMonday.toISOString());

    if ((count ?? 0) >= area.max_reservations_per_week) {
      return {
        error: `Ya alcanzaste el máximo de ${area.max_reservations_per_week} reserva(s) por semana para esta amenidad.`,
      };
    }
  }

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

  if (error) {
    // 23P01 = violación del rango de exclusión (migration 037). Es la carrera
    // que el SELECT de arriba no puede cerrar: dos personas tocando "Reservar"
    // a la vez pasaban las dos por el hueco entre el chequeo y el insert.
    if ((error as { code?: string }).code === "23P01") {
      return { error: "Alguien acaba de reservar ese horario. Elige otro." };
    }
    return { error: error.message };
  }

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
