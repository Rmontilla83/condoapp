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

/** Convierte un valor de formulario a entero >= 0 o null (vacío). */
function toNullableInt(v: unknown): number | null | undefined {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "string" ? parseInt(v, 10) : Number(v);
  if (Number.isNaN(n) || n < 0) return undefined; // undefined => inválido
  return Math.floor(n);
}

function toNullableNumber(v: unknown): number | null | undefined {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "string" ? parseFloat(v) : Number(v);
  if (Number.isNaN(n) || n < 0) return undefined;
  return Math.round(n * 10) / 10;
}

/**
 * Actualiza las políticas de uso de cada amenidad (common_areas). Recibe un
 * JSON array de { id, max_reservations_per_week, max_duration_hours,
 * min_advance_hours, max_advance_days }. NULL = sin límite.
 */
export async function updateAmenityPolicies(formData: FormData): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  const guard = requireAdmin(profile);
  if (guard) return guard;

  const raw = formData.get("policies");
  if (typeof raw !== "string") return { error: "Faltan las políticas" };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { error: "Formato de políticas inválido (JSON)" };
  }
  if (!Array.isArray(parsed)) return { error: "Formato de políticas inválido" };

  const supabase = createAdminClient();

  for (const row of parsed as Array<Record<string, unknown>>) {
    const id = typeof row.id === "string" ? row.id : "";
    if (!id) return { error: "Amenidad sin id" };

    const maxPerWeek = toNullableInt(row.max_reservations_per_week);
    const maxDuration = toNullableNumber(row.max_duration_hours);
    const minAdvance = toNullableInt(row.min_advance_hours);
    const maxAdvance = toNullableInt(row.max_advance_days);

    if (maxPerWeek === undefined) return { error: "Máx reservas/semana inválido" };
    if (maxDuration === undefined) return { error: "Duración máxima inválida" };
    if (minAdvance === undefined) return { error: "Anticipación mínima inválida" };
    if (maxAdvance === undefined) return { error: "Anticipación máxima inválida" };

    const { error } = await supabase
      .from("common_areas")
      .update({
        max_reservations_per_week: maxPerWeek,
        max_duration_hours: maxDuration,
        min_advance_hours: minAdvance ?? 0,
        max_advance_days: maxAdvance,
      })
      .eq("id", id)
      .eq("organization_id", profile!.organization_id!);

    if (error) return { error: error.message };
  }

  revalidatePath("/admin/settings");
  revalidatePath("/reservas");
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


/* ═══════════════════════════════════════════════════════════════════
   Áreas comunes
   ═══════════════════════════════════════════════════════════════════

   `common_areas` no tenía NINGÚN camino de creación en la app: solo se leían y
   se editaban las políticas de las que ya existían. Un condominio nuevo tenía
   /reservas permanentemente vacía, igual que pasaba con las alícuotas.

   Escritura por admin client: la tabla solo tiene una policy de SELECT, así que
   ni un admin puede escribirla por RLS. La autorización real es requireAdmin().
   ═══════════════════════════════════════════════════════════════════ */

const MAX_COMMON_AREAS = 40;

function textoLimpio(v: FormDataEntryValue | null, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

export async function createCommonArea(formData: FormData): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  const guard = requireAdmin(profile);
  if (guard) return guard;

  const name = textoLimpio(formData.get("name"), 60);
  if (name.length < 2) return { error: "Ponle un nombre al área (mínimo 2 caracteres)." };

  const description = textoLimpio(formData.get("description"), 300) || null;
  const rules = textoLimpio(formData.get("rules"), 1000) || null;

  const capacityRaw = formData.get("capacity");
  const capacity = toNullableInt(capacityRaw);
  if (capacity === undefined) return { error: "Capacidad inválida." };
  if (capacity !== null && capacity < 0) return { error: "La capacidad no puede ser negativa." };

  const supabase = createAdminClient();

  // Sin UNIQUE en la tabla: dos "Salón de fiestas" en el mismo condominio son
  // indistinguibles para el residente al reservar.
  //
  // La comparación se hace en memoria y NO con .ilike(): en LIKE, `%` y `_` son
  // comodines, así que un área llamada "Piscina 100%" habría matcheado contra
  // cualquier nombre. Y .maybeSingle() revienta si ya existen dos duplicadas de
  // antes, que es justo el estado que esto viene a evitar.
  const { data: existentes } = await supabase
    .from("common_areas")
    .select("id, name")
    .eq("organization_id", profile!.organization_id!);

  const normalizar = (t: string) => t.trim().toLocaleLowerCase("es");
  if ((existentes ?? []).some((a) => normalizar(a.name as string) === normalizar(name))) {
    return { error: `Ya existe un área que se llama "${name}".` };
  }

  // Cota defensiva: ningún condominio tiene 40 amenidades, y sin límite un
  // script podría llenar la tabla.
  if ((existentes ?? []).length >= MAX_COMMON_AREAS) {
    return { error: `No puedes tener más de ${MAX_COMMON_AREAS} áreas comunes.` };
  }

  const { error } = await supabase.from("common_areas").insert({
    organization_id: profile!.organization_id!,
    name,
    description,
    capacity,
    rules,
    is_active: true,
  });

  if (error) return { error: error.message };

  revalidatePath("/admin/settings");
  revalidatePath("/reservas");
  return { success: true };
}

export async function updateCommonArea(formData: FormData): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  const guard = requireAdmin(profile);
  if (guard) return guard;

  const id = textoLimpio(formData.get("id"), 40);
  if (!id) return { error: "Falta el área a editar." };

  const name = textoLimpio(formData.get("name"), 60);
  if (name.length < 2) return { error: "Ponle un nombre al área (mínimo 2 caracteres)." };

  const capacity = toNullableInt(formData.get("capacity"));
  if (capacity === undefined) return { error: "Capacidad inválida." };
  if (capacity !== null && capacity < 0) return { error: "La capacidad no puede ser negativa." };

  const supabase = createAdminClient();

  // La guarda de nombre único también al renombrar: si no, se evadía editando.
  const { data: hermanas } = await supabase
    .from("common_areas")
    .select("id, name")
    .eq("organization_id", profile!.organization_id!);

  const norm = (t: string) => t.trim().toLocaleLowerCase("es");
  if ((hermanas ?? []).some((a) => a.id !== id && norm(a.name as string) === norm(name))) {
    return { error: `Ya existe otra área que se llama "${name}".` };
  }

  const { data, error } = await supabase
    .from("common_areas")
    .update({
      name,
      description: textoLimpio(formData.get("description"), 300) || null,
      rules: textoLimpio(formData.get("rules"), 1000) || null,
      capacity,
    })
    .eq("id", id)
    .eq("organization_id", profile!.organization_id!)
    .select("id");

  if (error) return { error: error.message };
  if (!data || data.length === 0) return { error: "Área no encontrada en este condominio." };

  revalidatePath("/admin/settings");
  revalidatePath("/reservas");
  return { success: true };
}

/**
 * Retira o reactiva un área.
 *
 * NO se borra: `reservations.common_area_id` es ON DELETE CASCADE, así que un
 * DELETE se llevaría por delante todo el historial de reservas del salón. Un
 * área retirada deja de aparecer para reservar y conserva su historia.
 */
export async function setCommonAreaActive(
  areaId: string,
  active: boolean,
  confirmado = false,
): Promise<ActionResult | { needsConfirm: true; futureReservations: number }> {
  const profile = await getCurrentProfile();
  const guard = requireAdmin(profile);
  if (guard) return guard;

  const supabase = createAdminClient();

  // Retirar un área con reservas futuras ya confirmadas deja a esos vecinos con
  // una reserva de un espacio que dejó de existir para el resto. No se bloquea
  // —el admin puede tener un buen motivo, como una reforma— pero tiene que
  // saberlo antes y avisarles.
  if (!active && !confirmado) {
    // Resolver el área DENTRO de la organización antes de contar: con el admin
    // client, contar por areaId a secas revelaría cuántas reservas futuras
    // tiene un área de otro condominio.
    const { data: propia } = await supabase
      .from("common_areas")
      .select("id")
      .eq("id", areaId)
      .eq("organization_id", profile!.organization_id!)
      .maybeSingle();

    if (!propia) return { error: "Área no encontrada en este condominio." };

    const { count } = await supabase
      .from("reservations")
      .select("id", { count: "exact", head: true })
      .eq("common_area_id", areaId)
      .eq("status", "confirmed")
      .gte("end_time", new Date().toISOString());

    if ((count ?? 0) > 0) {
      return { needsConfirm: true, futureReservations: count ?? 0 };
    }
  }

  const { data, error } = await supabase
    .from("common_areas")
    .update({ is_active: active })
    .eq("id", areaId)
    .eq("organization_id", profile!.organization_id!)
    .select("id");

  if (error) return { error: error.message };
  if (!data || data.length === 0) return { error: "Área no encontrada en este condominio." };

  revalidatePath("/admin/settings");
  revalidatePath("/reservas");
  return { success: true };
}
