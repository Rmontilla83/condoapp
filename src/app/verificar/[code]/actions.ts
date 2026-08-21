"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

/**
 * Registra la entrada de un visitante desde /verificar/[code].
 *
 * Quien escanea es el vigilante del condominio, que normalmente **no tiene
 * cuenta**. La credencial es el `qr_code`: un UUID secreto e inadivinable que
 * solo está impreso en el pase que compartió el residente. Por eso la acción
 * recibe el código, no el id del pase, y resuelve todo del lado del servidor.
 *
 * Antes esto no funcionaba por partida doble:
 *  - exigía `auth.getUser()`, y el vigilante no está logueado;
 *  - la única policy de UPDATE sobre access_passes es `created_by = auth.uid()`,
 *    así que el UPDATE afectaba 0 filas;
 *  - y el guard `if (count === 0)` era código muerto: `count` solo se llena si
 *    se le pasa `{ count: 'exact' }` a `.update()`, así que siempre era null.
 * Resultado: la pantalla decía "Acceso registrado", el pase quedaba `active`
 * para siempre y el QR se podía reutilizar indefinidamente. `access_logs` llevaba
 * 0 filas en producción.
 */
export async function grantAccess(qrCode: string) {
  if (!qrCode) return { error: "Código inválido" };

  const supabase = createAdminClient();

  const ahora = new Date().toISOString();

  // `.select()` devuelve las filas realmente afectadas, que es la única forma
  // fiable de saber si el UPDATE hizo algo. Las condiciones van en el propio
  // UPDATE para que sea atómico: dos vigilantes escaneando a la vez no pueden
  // registrar la misma entrada dos veces.
  const { data, error } = await supabase
    .from("access_passes")
    .update({ status: "used", used_at: ahora })
    .eq("qr_code", qrCode)
    .eq("status", "active")
    .gt("valid_until", ahora)
    .select("id, organization_id");

  if (error) {
    console.error("[grantAccess] update falló:", error.message);
    return { error: "No pudimos registrar el acceso. Intenta de nuevo." };
  }

  if (!data || data.length === 0) {
    // El pase existe (la página lo mostró) pero ya no es utilizable.
    return { error: "Este pase ya fue utilizado, está vencido o fue cancelado." };
  }

  const pass = data[0];

  const { error: logError } = await supabase.from("access_logs").insert({
    pass_id: pass.id,
    action: "granted",
  });
  // La bitácora es importante pero no debe tumbar el registro de la entrada:
  // el visitante ya está en la puerta.
  if (logError) {
    console.error("[grantAccess] no se pudo escribir access_logs:", logError.message);
  }

  revalidatePath("/visitantes");
  revalidatePath(`/verificar/${qrCode}`);
  return { success: true };
}
