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

  // Upsert items
  const itemRows = items.map((it) => ({
    budget_id: budgetId,
    category_id: it.category_id,
    monthly_amount: Number(it.monthly_amount) || 0,
    monthly_overrides: it.monthly_overrides ?? null,
    notes: it.notes ?? null,
  }));

  // Borrar y reinsertar (más simple que upsert por composite)
  await supabase.from("org_budget_items").delete().eq("budget_id", budgetId);
  if (itemRows.length > 0) {
    const { error: iErr } = await supabase.from("org_budget_items").insert(itemRows);
    if (iErr) return { error: iErr.message };
  }

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
