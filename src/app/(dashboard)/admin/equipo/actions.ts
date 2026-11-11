"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/queries";
import { FUNCIONES, funcionDe, type FuncionAdmin } from "@/lib/permissions";
import { registrarEvento } from "@/lib/historial";

/**
 * Cambia la función de una cuenta de administración (migration 069).
 *
 * Solo la administración completa: quien reparte las funciones no puede ser
 * alguien a quien una función le recorta el alcance. Nadie cambia la suya.
 */
export async function cambiarFuncion(profileId: string, funcion: string): Promise<{ error: string } | { success: true }> {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return { error: "No autenticado" };
  if (funcionDe(profile) !== "completa") return { error: "Solo la administración completa reparte las funciones." };
  if (!(funcion in FUNCIONES)) return { error: "Función desconocida." };
  if (profileId === profile.id) return { error: "No puedes cambiar tu propia función. Pídeselo a otra cuenta de administración completa." };

  const db = createAdminClient();
  const { data: cuenta } = await db
    .from("profiles")
    .select("id, full_name, email, role, admin_funcion")
    .eq("id", profileId)
    .eq("organization_id", profile.organization_id)
    .maybeSingle();
  if (!cuenta || cuenta.role !== "admin") return { error: "Esa cuenta no es de la administración de este condominio." };

  const nueva = funcion === "completa" ? null : (funcion as Exclude<FuncionAdmin, "completa">);
  const { error } = await db.from("profiles").update({ admin_funcion: nueva }).eq("id", profileId);
  if (error) return { error: error.message };

  await registrarEvento({
    orgId: profile.organization_id,
    actorId: profile.id,
    evento: "admin_funcion_cambiada",
    datos: {
      cuenta: (cuenta.full_name as string) || (cuenta.email as string),
      antes: FUNCIONES[((cuenta.admin_funcion as FuncionAdmin | null) ?? "completa")].nombre,
      funcion: FUNCIONES[funcion as FuncionAdmin].nombre,
    },
  });
  revalidatePath("/admin/equipo");
  return { success: true };
}
