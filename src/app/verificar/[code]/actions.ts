"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { casetaActual, puedeRegistrarEntrada } from "@/lib/caseta";
import { revalidatePath } from "next/cache";

/**
 * Registra la entrada de un visitante desde /verificar/[code].
 *
 * Quien escanea es el vigilante, que normalmente **no tiene cuenta**. La
 * credencial del pase es el `qr_code`: un UUID secreto que solo está en el pase
 * que compartió el residente. Por eso la acción recibe el código, no el id.
 *
 * Desde la migration 044, si el condominio tiene casetas, solo una caseta de ese
 * condominio registra entradas: antes el propio visitante podía abrir su enlace
 * y marcarse la entrada antes de llegar a la puerta.
 *
 * Historia: la versión original exigía sesión (el vigilante no la tiene), la
 * policy de UPDATE era `created_by = auth.uid()` (0 filas) y el guard de `count`
 * era código muerto. La pantalla decía "Acceso registrado", el pase quedaba
 * `active` para siempre y `access_logs` tenía 0 filas en producción.
 */
export async function grantAccess(qrCode: string) {
  if (!qrCode) return { error: "Código inválido" };

  const db = createAdminClient();
  const { data: pase } = await db
    .from("access_passes")
    .select("id, organization_id")
    .eq("qr_code", qrCode)
    .maybeSingle();
  if (!pase) return { error: "Código inválido" };

  const { permitido, caseta } = await puedeRegistrarEntrada(pase.organization_id as string);
  if (!permitido) {
    return { error: "Solo la caseta de vigilancia puede registrar la entrada." };
  }
  return registrar(pase.id as string, caseta?.id ?? null, qrCode);
}

/**
 * Registra la entrada desde el panel de la caseta (lista de esperados), sin QR:
 * para cuando el visitante no tiene el pase a mano pero su nombre está en la
 * lista. Exige ser caseta del mismo condominio del pase.
 */
export async function grantAccessFromStation(passId: string) {
  if (!passId) return { error: "Pase inválido" };
  const caseta = await casetaActual();
  if (!caseta) return { error: "Este dispositivo no es una caseta." };

  const { data: pase } = await createAdminClient()
    .from("access_passes")
    .select("id, organization_id, qr_code")
    .eq("id", passId)
    .maybeSingle();
  if (!pase || pase.organization_id !== caseta.organization_id) return { error: "Pase no encontrado" };

  const res = await registrar(pase.id as string, caseta.id, pase.qr_code as string);
  revalidatePath("/caseta");
  return res;
}

async function registrar(passId: string, stationId: string | null, qrCode: string) {
  const db = createAdminClient();
  const ahora = new Date().toISOString();

  // `.select()` devuelve las filas realmente afectadas, la única forma fiable de
  // saber si el UPDATE hizo algo. Las condiciones van en el propio UPDATE: dos
  // vigilantes escaneando a la vez no registran la misma entrada dos veces.
  const { data, error } = await db
    .from("access_passes")
    .update({ status: "used", used_at: ahora })
    .eq("id", passId)
    .eq("status", "active")
    .lte("valid_from", ahora)
    .gt("valid_until", ahora)
    .select("id");

  if (error) {
    console.error("[grantAccess] update falló:", error.message);
    return { error: "No pudimos registrar el acceso. Intenta de nuevo." };
  }
  if (!data || data.length === 0) {
    return { error: "Este pase ya fue utilizado, todavía no es válido, está vencido o fue cancelado." };
  }

  const { error: logError } = await db
    .from("access_logs")
    .insert({ pass_id: passId, action: "granted", station_id: stationId });
  // La bitácora no debe tumbar el registro: el visitante ya está en la puerta.
  if (logError) console.error("[grantAccess] no se pudo escribir access_logs:", logError.message);

  revalidatePath("/visitantes");
  revalidatePath(`/verificar/${qrCode}`);
  return { success: true as const };
}
