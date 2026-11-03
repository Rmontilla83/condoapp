"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/queries";
import { requireAdmin } from "@/lib/permissions";

type Resultado = { error: string } | { success: true };

const DUPLICADO = "Ya existe un centro de costo con ese nombre.";

function limpiar(nombre: string): string | null {
  const n = nombre.trim().replace(/\s+/g, " ").slice(0, 60);
  return n.length >= 2 ? n : null;
}

function refrescar() {
  revalidatePath("/admin/settings");
  revalidatePath("/finanzas");
  revalidatePath("/admin/informes/relacion-de-gastos");
}

export async function crearCentroDeCosto(nombre: string): Promise<Resultado> {
  const profile = await getCurrentProfile();
  const guard = requireAdmin(profile);
  if (guard) return guard;
  const name = limpiar(nombre);
  if (!name) return { error: "Ponle nombre al centro de costo: Piscina, Marina, Torre A…" };
  const db = createAdminClient();
  const orgId = profile!.organization_id!;
  const { count } = await db.from("cost_centers").select("id", { count: "exact", head: true }).eq("organization_id", orgId);
  const { error } = await db.from("cost_centers").insert({ organization_id: orgId, name, position: count ?? 0 });
  if (error) return { error: error.code === "23505" ? DUPLICADO : error.message };
  refrescar();
  return { success: true };
}

export async function renombrarCentroDeCosto(id: string, nombre: string): Promise<Resultado> {
  const profile = await getCurrentProfile();
  const guard = requireAdmin(profile);
  if (guard) return guard;
  const name = limpiar(nombre);
  if (!name) return { error: "El nombre necesita al menos 2 letras." };
  const { error } = await createAdminClient()
    .from("cost_centers")
    .update({ name })
    .eq("id", id)
    .eq("organization_id", profile!.organization_id!);
  if (error) return { error: error.code === "23505" ? DUPLICADO : error.message };
  refrescar();
  return { success: true };
}

/** Un centro no se borra: retirado deja de ofrecerse y conserva sus gastos. */
export async function cambiarEstadoCentroDeCosto(id: string, activo: boolean): Promise<Resultado> {
  const profile = await getCurrentProfile();
  const guard = requireAdmin(profile);
  if (guard) return guard;
  const { error } = await createAdminClient()
    .from("cost_centers")
    .update({ active: activo })
    .eq("id", id)
    .eq("organization_id", profile!.organization_id!);
  if (error) return { error: error.message };
  refrescar();
  return { success: true };
}
