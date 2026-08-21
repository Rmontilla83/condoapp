"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile, getCurrentRate } from "@/lib/queries";
import { isAdminRole, requireAdmin } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { enviarLote } from "@/lib/email/send";
import { cuotaEmitida } from "@/lib/email/templates";
import { emailsPorUnidad, nombreDeOrg } from "@/lib/email/recipients";
import { computeInvoiceAmounts } from "@/lib/cobranza/compute-invoices";
import type { ComputeUnit } from "@/lib/cobranza/compute-invoices";
import type { FeeMode, InvoiceKind, Organization } from "@/types/database";

export async function updateExchangeRate(rate: number) {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return { error: "No autorizado" };
  if (!isAdminRole(profile)) return { error: "Solo administradores" };

  const supabase = createAdminClient();
  const today = new Date().toISOString().split("T")[0];
  const { error } = await supabase.from("exchange_rates").upsert(
    {
      organization_id: profile.organization_id,
      rate,
      source: "manual",
      effective_date: today,
    },
    { onConflict: "organization_id,effective_date,source" },
  );
  if (error) return { error: error.message };
  revalidatePath("/pagos");
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { success: true };
}

/**
 * Genera cuotas (mensuales o derramas extraordinarias) según el modo de
 * cobranza configurado en la organización. Soporta 5 modos:
 * - flat: monto plano por unidad (formData: flat_amount o amount legacy)
 * - divide_total: reparte un costo total en partes iguales (formData: total_amount)
 * - by_aliquot: reparte el total proporcional a la alícuota (formData: base_amount)
 * - by_type: lookup en fee_type_amounts según unit.type
 * - manual: amounts por unit_id (formData: manual_amounts JSON)
 *
 * formData esperado:
 * - kind: "monthly" | "extraordinary" (default monthly)
 * - mode: FeeMode (default = org.fee_mode)
 * - description: string (obligatorio si extraordinary)
 * - due_date: ISO date (extraordinary) | month + year + due_day (monthly)
 * - flat_amount | base_amount | manual_amounts (según mode)
 * - amount: legacy compat — se trata como flat_amount con mode='flat'
 */
export async function generateMonthlyInvoices(formData: FormData) {
  const profile = await getCurrentProfile();
  const guard = requireAdmin(profile);
  if (guard) return guard;

  const supabase = createAdminClient();

  // Cargar org para defaults de modo + currency
  const { data: org } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", profile!.organization_id!)
    .single<Organization>();
  if (!org) return { error: "Organización no encontrada" };

  const kind: InvoiceKind =
    (formData.get("kind") as InvoiceKind) === "extraordinary" ? "extraordinary" : "monthly";

  const mode: FeeMode =
    (formData.get("mode") as FeeMode) || (org.fee_mode ?? "flat");

  // Resolver due_date
  let dueDate: string;
  if (kind === "extraordinary") {
    const raw = (formData.get("due_date") as string)?.trim();
    if (!raw || !raw.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return { error: "Fecha de vencimiento inválida" };
    }
    dueDate = raw;
  } else {
    const month = formData.get("month") as string;
    const year = formData.get("year") as string;
    const dueDay = parseInt(formData.get("due_day") as string) || 15;
    if (!month || !year) return { error: "Completa mes y año" };
    dueDate = `${year}-${month.padStart(2, "0")}-${String(dueDay).padStart(2, "0")}`;
  }

  // Description: obligatoria para extraordinary, default razonable para monthly
  const rawDesc = (formData.get("description") as string)?.trim();
  if (kind === "extraordinary" && !rawDesc) {
    return { error: "La descripción es obligatoria para derramas extraordinarias" };
  }
  const description =
    rawDesc || (kind === "monthly"
      ? `Cuota ${formData.get("month")}/${formData.get("year")}`
      : "Derrama extraordinaria");

  // Resolver inputs según modo
  let flat_amount: number | undefined;
  let divide_total_amount: number | undefined;
  let base_amount: number | undefined;
  let manual_amounts: Record<string, number> | undefined;
  let type_amounts: Record<string, number> | undefined;

  if (mode === "flat") {
    const raw =
      (formData.get("flat_amount") as string) ?? (formData.get("amount") as string);
    flat_amount = parseFloat(raw ?? "");
    if (Number.isNaN(flat_amount)) return { error: "Monto plano requerido" };
  } else if (mode === "divide_total") {
    const raw = formData.get("total_amount") as string;
    divide_total_amount = parseFloat(raw ?? "");
    if (Number.isNaN(divide_total_amount) || divide_total_amount <= 0) {
      return { error: "Costo total a repartir requerido (> 0)" };
    }
  } else if (mode === "by_aliquot") {
    const raw = (formData.get("base_amount") as string) ?? String(org.fee_base_amount ?? "");
    base_amount = parseFloat(raw);
    if (Number.isNaN(base_amount)) return { error: "Monto base requerido" };
  } else if (mode === "manual") {
    const raw = formData.get("manual_amounts") as string;
    if (!raw) return { error: "Faltan los montos por unidad" };
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") throw new Error("not object");
      manual_amounts = {};
      for (const [k, v] of Object.entries(parsed)) {
        const n = typeof v === "string" ? parseFloat(v) : Number(v);
        if (Number.isNaN(n)) return { error: `Monto inválido para unidad ${k}` };
        manual_amounts[k] = n;
      }
    } catch {
      return { error: "Formato de manual_amounts inválido" };
    }
  } else if (mode === "by_type") {
    const { data: rows } = await supabase
      .from("fee_type_amounts")
      .select("unit_type, amount")
      .eq("organization_id", profile!.organization_id!);
    type_amounts = Object.fromEntries(
      (rows ?? []).map((r) => [r.unit_type as string, Number(r.amount)]),
    );
  }

  // Cargar units (id, type, aliquot)
  const { data: rawUnits } = await supabase
    .from("units")
    .select("id, type, aliquot")
    .eq("organization_id", profile!.organization_id!);
  if (!rawUnits || rawUnits.length === 0) {
    return { error: "No hay unidades registradas" };
  }
  const units: ComputeUnit[] = rawUnits.map((u) => ({
    id: u.id as string,
    type: u.type as string,
    aliquot: u.aliquot === null || u.aliquot === undefined ? null : Number(u.aliquot),
  }));

  const rateData = await getCurrentRate(profile!.organization_id!);
  const exchange_rate = Number(rateData.rate) || null;

  const result = computeInvoiceAmounts({
    organization_id: profile!.organization_id!,
    fee_mode: mode,
    due_date: dueDate,
    description,
    kind,
    currency: org.currency || "USD",
    units,
    exchange_rate,
    flat_amount,
    divide_total_amount,
    base_amount,
    type_amounts,
    manual_amounts,
  });

  if (result.errors.length > 0) {
    return { error: result.errors.join(" · ") };
  }

  // Pre-check de duplicados (mejor mensaje que el 23505 de Postgres)
  const { data: existing } = await supabase
    .from("invoices")
    .select("id")
    .eq("organization_id", profile!.organization_id!)
    .eq("due_date", dueDate)
    .eq("kind", kind)
    .eq("description", description)
    .limit(1);

  if (existing && existing.length > 0) {
    return {
      error: `Ya existen cuotas para "${description}" el ${dueDate}. Cancela las anteriores antes de regenerar.`,
    };
  }

  const { error } = await supabase.from("invoices").insert(result.invoices);
  if (error) {
    if ((error as { code?: string }).code === "23505") {
      return {
        error: "Ya existen cuotas con esa fecha y descripción. Cancela las previas antes de regenerar.",
      };
    }
    return { error: error.message };
  }

  // Aviso de cuota nueva. Es el evento de MÁS volumen (una por unidad), así que
  // va con cuidado:
  //  - las cuotas en $0 no generan correo: no hay nada que pagar y avisarlo
  //    solo entrena a la gente a ignorar los correos de Atryum
  //  - un correo por unidad, no por persona repetida
  //  - si el envío falla, las cuotas ya están emitidas igual
  try {
    const condominio = await nombreDeOrg(profile!.organization_id!);
    const conMonto = result.invoices.filter((inv) => Number(inv.amount) > 0);

    const vencimiento = new Date(`${dueDate}T12:00:00Z`).toLocaleDateString("es", {
      day: "numeric",
      month: "long",
      timeZone: "UTC",
    });

    // Una consulta para todas las unidades y UN lote de envío, en vez de dos
    // viajes por unidad: con 40 unidades eran 80 awaits secuenciales dentro de
    // una server action, de sobra para agotar el tiempo de la función.
    const porUnidad = await emailsPorUnidad(conMonto.map((inv) => inv.unit_id));

    const mensajes = conMonto.flatMap((inv) => {
      const plantilla = cuotaEmitida({
        condominio,
        concepto: inv.description,
        monto: `${inv.currency} ${Number(inv.amount).toFixed(2)}`,
        vencimiento,
        // La tasa que se congeló al emitir la cuota, no la de hoy.
        equivalenteBs:
          inv.amount_bs && Number(inv.amount_bs) > 0
            ? `Bs ${Number(inv.amount_bs).toFixed(2)}`
            : null,
      });
      return (porUnidad.get(inv.unit_id) ?? []).map((para) => ({
        para,
        asunto: plantilla.asunto,
        html: plantilla.html,
      }));
    });

    await enviarLote(mensajes, "cuota_emitida");
  } catch (e) {
    console.error("[email] cuotas emitidas falló:", e instanceof Error ? e.message : e);
  }

  revalidatePath("/pagos");
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return {
    success: true as const,
    count: result.invoices.length,
    warnings: result.warnings,
  };
}

export async function addUnit(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) {
    console.error("[addUnit] no organization_id", { profile });
    return { error: "No tienes un condominio asignado. Como super_admin, primero usa 'Entrar como admin' desde /super-admin." };
  }
  if (!isAdminRole(profile)) {
    console.error("[addUnit] not admin role", { role: profile.role, viewAs: profile.view_as });
    return { error: "Solo administradores pueden agregar unidades" };
  }

  const unitNumber = (formData.get("unit_number") as string)?.trim();
  const floor = formData.get("floor") ? parseInt(formData.get("floor") as string) : null;
  const block = (formData.get("block") as string)?.trim() || null;
  const type = (formData.get("type") as string) || "apartment";

  if (!unitNumber) return { error: "Número de unidad es requerido" };

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("units")
    .insert({
      organization_id: profile.organization_id,
      unit_number: unitNumber,
      floor,
      block,
      type,
      // NULL = sin configurar. Antes se fijaba en 0, que era indistinguible de
      // "exenta a propósito" y dejaba el condominio descuadrado en silencio.
      aliquot: null,
    })
    .select("id, unit_number, organization_id")
    .single();

  if (error) {
    console.error("[addUnit] insert failed:", error);
    if (error.code === "23505") return { error: "Ya existe una unidad con ese número" };
    return { error: `No se pudo guardar: ${error.message}` };
  }

  console.log("[addUnit] inserted:", data);

  revalidatePath("/admin");
  revalidatePath("/admin/units");
  revalidatePath("/dashboard");
  return { success: true, unit: data };
}
