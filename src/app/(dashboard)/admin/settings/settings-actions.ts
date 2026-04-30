"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/queries";
import { requireAdmin } from "@/lib/permissions";
import { validateBankAccountList } from "@/lib/schemas/bank-account";
import {
  validateFeeConfig,
  validateFeeTypeAmounts,
  validateFeeBreakdownItems,
} from "@/lib/schemas/fee-config";
import { revalidatePath } from "next/cache";

type ActionResult = { error: string } | { success: true };

export async function updateBankAccounts(formData: FormData): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  const guard = requireAdmin(profile);
  if (guard) return guard;

  const raw = formData.get("accounts");
  if (typeof raw !== "string") return { error: "Falta el listado de cuentas" };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { error: "Formato de cuentas inválido (JSON)" };
  }

  const result = validateBankAccountList(parsed);
  if (!result.ok || !result.accounts) return { error: result.error ?? "Cuentas inválidas" };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("organizations")
    .update({ bank_accounts: result.accounts })
    .eq("id", profile!.organization_id!);

  if (error) return { error: error.message };

  revalidatePath("/admin/settings");
  revalidatePath("/pagos");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateFeeConfig(formData: FormData): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  const guard = requireAdmin(profile);
  if (guard) return guard;

  const cfgRaw = formData.get("config");
  const typeAmountsRaw = formData.get("type_amounts");

  if (typeof cfgRaw !== "string") return { error: "Falta configuración" };

  let cfgParsed: unknown;
  try {
    cfgParsed = JSON.parse(cfgRaw);
  } catch {
    return { error: "Configuración inválida (JSON)" };
  }

  const cfg = validateFeeConfig(cfgParsed);
  if (!cfg.ok || !cfg.config) return { error: cfg.error ?? "Configuración inválida" };

  const supabase = createAdminClient();

  const { error: orgError } = await supabase
    .from("organizations")
    .update({
      fee_mode: cfg.config.fee_mode,
      fee_base_amount: cfg.config.fee_base_amount,
      late_fee_pct: cfg.config.late_fee_pct,
    })
    .eq("id", profile!.organization_id!);

  if (orgError) return { error: orgError.message };

  // type_amounts es opcional (solo aplica si fee_mode='by_type')
  if (typeof typeAmountsRaw === "string" && typeAmountsRaw.length > 0) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(typeAmountsRaw);
    } catch {
      return { error: "Montos por tipo inválidos (JSON)" };
    }
    const ta = validateFeeTypeAmounts(parsed);
    if (!ta.ok || !ta.rows) return { error: ta.error ?? "Montos por tipo inválidos" };

    if (ta.rows.length > 0) {
      const upsertRows = ta.rows.map((r) => ({
        organization_id: profile!.organization_id!,
        unit_type: r.unit_type,
        amount: r.amount,
      }));
      const { error: typeErr } = await supabase
        .from("fee_type_amounts")
        .upsert(upsertRows, { onConflict: "organization_id,unit_type" });
      if (typeErr) return { error: typeErr.message };

      // Borrar tipos que el admin removió
      const keepTypes = ta.rows.map((r) => r.unit_type);
      const { error: delErr } = await supabase
        .from("fee_type_amounts")
        .delete()
        .eq("organization_id", profile!.organization_id!)
        .not("unit_type", "in", `(${keepTypes.map((t) => `"${t}"`).join(",")})`);
      if (delErr) return { error: delErr.message };
    } else {
      // Lista vacía → borrar todos los amounts existentes
      const { error: delErr } = await supabase
        .from("fee_type_amounts")
        .delete()
        .eq("organization_id", profile!.organization_id!);
      if (delErr) return { error: delErr.message };
    }
  }

  revalidatePath("/admin/settings");
  revalidatePath("/admin");
  revalidatePath("/pagos");
  return { success: true };
}

export async function upsertFeeBreakdownItems(formData: FormData): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  const guard = requireAdmin(profile);
  if (guard) return guard;

  const raw = formData.get("items");
  if (typeof raw !== "string") return { error: "Falta el listado de conceptos" };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { error: "Formato inválido (JSON)" };
  }

  const result = validateFeeBreakdownItems(parsed);
  if (!result.ok || !result.items) return { error: result.error ?? "Items inválidos" };

  const supabase = createAdminClient();

  // Cargar ids existentes para detectar borrados
  const { data: existing } = await supabase
    .from("fee_breakdown")
    .select("id")
    .eq("organization_id", profile!.organization_id!);

  const existingIds = new Set((existing ?? []).map((r) => r.id as string));
  const incomingIds = new Set(
    result.items.filter((i) => i.id).map((i) => i.id as string),
  );
  const toDeactivateIds = [...existingIds].filter((id) => !incomingIds.has(id));

  // Soft-delete: marcar como is_active=false los que el admin removió
  if (toDeactivateIds.length > 0) {
    const { error: deactErr } = await supabase
      .from("fee_breakdown")
      .update({ is_active: false })
      .in("id", toDeactivateIds);
    if (deactErr) return { error: deactErr.message };
  }

  // Upsert: insert nuevos + update existentes
  const newItems = result.items.filter((i) => !i.id);
  const updItems = result.items.filter((i) => i.id);

  if (newItems.length > 0) {
    const inserts = newItems.map((i) => ({
      organization_id: profile!.organization_id!,
      concept: i.concept,
      amount: i.amount,
      is_active: i.is_active,
    }));
    const { error: insErr } = await supabase.from("fee_breakdown").insert(inserts);
    if (insErr) return { error: insErr.message };
  }

  for (const i of updItems) {
    const { error: updErr } = await supabase
      .from("fee_breakdown")
      .update({ concept: i.concept, amount: i.amount, is_active: i.is_active })
      .eq("id", i.id!)
      .eq("organization_id", profile!.organization_id!);
    if (updErr) return { error: updErr.message };
  }

  revalidatePath("/admin/settings");
  revalidatePath("/pagos");
  return { success: true };
}
