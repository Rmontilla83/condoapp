"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/queries";
import { isAdminRole } from "@/lib/permissions";
import { revalidatePath } from "next/cache";

/** Convierte un label a un code slug (lowercase, sin acentos, a-z0-9_). */
function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}

function revalidate() {
  revalidatePath("/admin/budget");
  revalidatePath("/finanzas");
}

export async function createExpenseCategory(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return { error: "No autenticado" };
  if (!isAdminRole(profile)) return { error: "Solo administradores" };

  const label = (formData.get("label") as string)?.trim();
  const icon = (formData.get("icon") as string)?.trim() || "·";
  if (!label) return { error: "El nombre de la categoría es requerido" };

  const code = slugify(label);
  if (!code) return { error: "El nombre debe tener al menos una letra o número" };

  const supabase = createAdminClient();

  // position = siguiente al máximo actual
  const { data: maxRow } = await supabase
    .from("expense_categories")
    .select("position")
    .eq("organization_id", profile.organization_id)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextPosition = (maxRow?.position ?? -1) + 1;

  const { error } = await supabase.from("expense_categories").insert({
    organization_id: profile.organization_id,
    code,
    label: label.slice(0, 60),
    icon: icon.slice(0, 8),
    is_system: false,
    position: nextPosition,
    is_active: true,
  });

  if (error) {
    if (error.code === "23505") return { error: "Ya existe una categoría con ese nombre" };
    return { error: error.message };
  }

  revalidate();
  return { success: true };
}

export async function updateExpenseCategory(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return { error: "No autenticado" };
  if (!isAdminRole(profile)) return { error: "Solo administradores" };

  const id = (formData.get("id") as string)?.trim();
  const label = (formData.get("label") as string)?.trim();
  const icon = (formData.get("icon") as string)?.trim() || "·";
  if (!id) return { error: "Falta el id de la categoría" };
  if (!label) return { error: "El nombre de la categoría es requerido" };

  const supabase = createAdminClient();
  // Renombrar label/icon es seguro (el code y los gastos asociados no cambian).
  const { error } = await supabase
    .from("expense_categories")
    .update({ label: label.slice(0, 60), icon: icon.slice(0, 8) })
    .eq("id", id)
    .eq("organization_id", profile.organization_id);

  if (error) return { error: error.message };
  revalidate();
  return { success: true };
}

export async function deactivateExpenseCategory(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return { error: "No autenticado" };
  if (!isAdminRole(profile)) return { error: "Solo administradores" };

  const id = (formData.get("id") as string)?.trim();
  if (!id) return { error: "Falta el id de la categoría" };

  const supabase = createAdminClient();

  // Solo categorías custom (no del sistema) se pueden quitar.
  const { data: cat } = await supabase
    .from("expense_categories")
    .select("id, is_system")
    .eq("id", id)
    .eq("organization_id", profile.organization_id)
    .single<{ id: string; is_system: boolean }>();

  if (!cat) return { error: "Categoría no encontrada" };
  if (cat.is_system) {
    return { error: "Las categorías del sistema no se pueden eliminar, pero puedes renombrarlas." };
  }

  // Soft-delete: is_active=false (preserva los gastos históricos que la usan).
  const { error } = await supabase
    .from("expense_categories")
    .update({ is_active: false })
    .eq("id", id)
    .eq("organization_id", profile.organization_id);

  if (error) return { error: error.message };
  revalidate();
  return { success: true };
}
