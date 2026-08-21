"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/queries";
import { isAdminRole } from "@/lib/permissions";
import { revalidatePath } from "next/cache";

interface BudgetItemInput {
  id?: string;
  category_id: string;
  monthly_amount: number;
  monthly_overrides: Record<string, number> | null;
  notes?: string | null;
}

export async function saveBudget(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return { error: "No autenticado" };
  if (!isAdminRole(profile)) return { error: "Solo administradores" };

  const yearRaw = formData.get("year") as string;
  const year = parseInt(yearRaw, 10);
  if (!Number.isFinite(year) || year < 2020 || year > 2100) {
    return { error: "Año inválido" };
  }

  const itemsRaw = formData.get("items") as string;
  let items: BudgetItemInput[];
  try {
    const parsed = JSON.parse(itemsRaw);
    if (!Array.isArray(parsed)) throw new Error("not array");
    items = parsed as BudgetItemInput[];
  } catch {
    return { error: "Items inválidos (JSON)" };
  }

  const supabase = createAdminClient();

  // Upsert budget shell (status draft si no existe)
  const { data: existing } = await supabase
    .from("org_budgets")
    .select("id, status")
    .eq("organization_id", profile.organization_id)
    .eq("year", year)
    .maybeSingle();

  let budgetId: string;
  if (!existing) {
    const { data: created, error: cErr } = await supabase
      .from("org_budgets")
      .insert({
        organization_id: profile.organization_id,
        year,
        status: "draft",
      })
      .select("id")
      .single();
    if (cErr || !created) return { error: cErr?.message ?? "Error creando presupuesto" };
    budgetId = created.id as string;
  } else {
    budgetId = existing.id as string;
    // Si está archived no se puede editar
    if (existing.status === "archived") {
      return { error: "Presupuesto archivado, no editable" };
    }
  }

  // Reemplazo atómico de las partidas.
  //
  // Antes eran dos llamadas: DELETE de todo el año y después INSERT. Si el
  // INSERT fallaba —una categoría borrada mientras el admin editaba, un monto
  // fuera de rango, un corte de red— el DELETE ya había pasado y el
  // presupuesto del año entero quedaba vacío. El editor no recarga en el
  // camino de error, así que el admin seguía viendo en pantalla partidas que
  // en la base ya no existían.
  // Las categorías vienen del JSON del formulario. `expense_categories` no
  // tiene columna de organización en su FK, así que un category_id de otro
  // condominio pasaba el FK sin problema y quedaba escrito en este presupuesto:
  // la partida no se renderiza en /admin/budget (el editor arma las filas desde
  // las categorías propias) pero sí suma en /finanzas como "Sin categoría".
  // Su hermano `createExpense` ya valida esto; acá faltaba.
  const { data: categoriasPropias } = await supabase
    .from("expense_categories")
    .select("id")
    .eq("organization_id", profile.organization_id);

  const idsValidos = new Set((categoriasPropias ?? []).map((c) => c.id as string));
  const ajena = items.find((it) => !idsValidos.has(it.category_id));
  if (ajena) {
    return { error: "Una de las categorías no pertenece a este condominio." };
  }

  const itemRows = items.map((it) => ({
    category_id: it.category_id,
    monthly_amount: Number(it.monthly_amount) || 0,
    monthly_overrides: it.monthly_overrides ?? null,
    notes: it.notes ?? null,
  }));

  const { error: iErr } = await supabase.rpc("replace_budget_items", {
    p_org: profile.organization_id,
    p_budget_id: budgetId,
    p_items: itemRows,
  });
  if (iErr) return { error: iErr.message };

  revalidatePath("/admin/budget");
  revalidatePath("/finanzas");
  return { success: true, budgetId };
}

export async function approveBudget(budgetId: string, decisionId?: string) {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return { error: "No autenticado" };
  if (!isAdminRole(profile)) return { error: "Solo administradores" };

  const supabase = createAdminClient();

  const updates: Record<string, unknown> = {
    status: "approved",
    approved_at: new Date().toISOString(),
  };
  if (decisionId) updates.approved_by_decision_id = decisionId;

  const { error } = await supabase
    .from("org_budgets")
    .update(updates)
    .eq("id", budgetId)
    .eq("organization_id", profile.organization_id);

  if (error) return { error: error.message };

  revalidatePath("/admin/budget");
  revalidatePath("/finanzas");
  return { success: true };
}

export async function archiveBudget(budgetId: string) {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return { error: "No autenticado" };
  if (!isAdminRole(profile)) return { error: "Solo administradores" };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("org_budgets")
    .update({ status: "archived" })
    .eq("id", budgetId)
    .eq("organization_id", profile.organization_id);

  if (error) return { error: error.message };

  revalidatePath("/admin/budget");
  revalidatePath("/finanzas");
  return { success: true };
}
