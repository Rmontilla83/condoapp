"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/queries";
import { isAdminRole } from "@/lib/permissions";
import { validateVoidReason } from "@/lib/schemas/finance";
import { revalidatePath } from "next/cache";
import { resumenFondo } from "@/lib/contabilidad/fondo-reserva";
import { gastoEnUsd, hayTasaPara, saldosPorPagar, serieDeTasas, type TipoContable } from "@/lib/contabilidad/gastos";
import { usd } from "@/lib/format";

const TIPOS_CONTABLES: TipoContable[] = ["gasto", "provision", "pago_provision", "entero_retencion"];

export async function createExpense(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return { error: "No tienes organización asignada" };
  if (!isAdminRole(profile)) {
    return { error: "Solo administradores pueden registrar gastos" };
  }

  const categoryId = (formData.get("category_id") as string)?.trim();
  const description = (formData.get("description") as string)?.trim();
  const amount = parseFloat(formData.get("amount") as string);
  const expenseDate =
    (formData.get("expense_date") as string) || new Date().toISOString().split("T")[0];
  const photo = formData.get("receipt") as File;

  const costCenterId = (formData.get("cost_center_id") as string)?.trim() || null;
  const tipoEntrada = formData.get("tipo_contable") as TipoContable;
  const tipo: TipoContable = TIPOS_CONTABLES.includes(tipoEntrada) ? tipoEntrada : "gasto";
  // Solo un gasto común puede salir del fondo o llevar retención.
  const conFondo = tipo === "gasto" && formData.get("paid_from_reserve") === "on";
  const actaFondo = (formData.get("reserve_acta") as string)?.trim().slice(0, 200) || null;
  const moneda = formData.get("currency") === "USD" ? "USD" : "VES";
  const retencion = tipo === "gasto" ? parseFloat((formData.get("retencion_islr") as string) || "0") || 0 : 0;

  // Vendor: id existente OR quick-create por nombre
  const vendorIdRaw = (formData.get("vendor_id") as string)?.trim();
  const vendorNewName = (formData.get("vendor_new_name") as string)?.trim();

  if (!categoryId || !description || !amount || amount <= 0) {
    return { error: "Completa todos los campos requeridos" };
  }
  if (retencion < 0 || retencion >= amount) return { error: "La retención debe ser menor que el monto" };

  const supabase = createAdminClient();

  // El libro valora cada gasto a la tasa BCV de su fecha, en las dos monedas.
  const tasas = await serieDeTasas(supabase, profile.organization_id);
  if (!hayTasaPara(tasas, expenseDate)) return { error: "No hay tasa BCV registrada para esa fecha. Cárgala primero." };

  if (tipo === "pago_provision" || tipo === "entero_retencion") {
    const { provisiones, retenciones } = await saldosPorPagar(supabase, profile.organization_id);
    if (tipo === "pago_provision" && provisiones <= 0) return { error: "No hay provisiones por pagar." };
    if (tipo === "entero_retencion" && retenciones <= 0) return { error: "No hay retenciones por enterar." };
  }

  // Validar categoría pertenece a la org
  const { data: cat } = await supabase
    .from("expense_categories")
    .select("id")
    .eq("id", categoryId)
    .eq("organization_id", profile.organization_id)
    .single();
  if (!cat) return { error: "Categoría inválida" };

  // Si el condominio usa centros de costo, cada gasto debe decir el suyo.
  const { data: centros } = await supabase
    .from("cost_centers")
    .select("id")
    .eq("organization_id", profile.organization_id)
    .eq("active", true);
  if ((centros ?? []).length > 0 && !costCenterId) return { error: "Elige el centro de costo" };
  if (costCenterId && !(centros ?? []).some((c) => c.id === costCenterId)) {
    return { error: "Centro de costo inválido" };
  }

  if (conFondo) {
    if (!actaFondo || actaFondo.length < 5) return { error: "Indica el acta o acuerdo que aprueba usar el fondo de reserva" };
    const { saldo } = await resumenFondo(supabase, profile.organization_id);
    const enUsd = gastoEnUsd({ amount, currency: moneda, expense_date: expenseDate }, tasas);
    if (enUsd > saldo) return { error: `El fondo de reserva tiene ${usd(saldo)}: no alcanza para este gasto` };
  }

  // Resolver vendor_id: id existente o quick-create
  let vendorId: string | null = vendorIdRaw || null;
  if (!vendorId && vendorNewName) {
    // Buscar duplicado por lower(name)
    const { data: existing } = await supabase
      .from("vendors")
      .select("id")
      .eq("organization_id", profile.organization_id)
      .ilike("name", vendorNewName)
      .maybeSingle();
    if (existing) {
      vendorId = existing.id as string;
    } else {
      const { data: newVendor, error: vendorErr } = await supabase
        .from("vendors")
        .insert({
          organization_id: profile.organization_id,
          name: vendorNewName,
        })
        .select("id")
        .single();
      if (vendorErr) return { error: `Error creando proveedor: ${vendorErr.message}` };
      vendorId = newVendor.id as string;
    }
  }

  // Upload receipt si aplica
  let receiptUrl: string | null = null;
  if (photo && photo.size > 0) {
    const ext = photo.name.split(".").pop() ?? "jpg";
    const path = `expenses/${profile.organization_id}/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("maintenance-photos")
      .upload(path, photo, { contentType: photo.type });
    if (!uploadError) {
      // Referencia `bucket/path`: el bucket es privado desde la migration 030.
      receiptUrl = `maintenance-photos/${path}`;
    }
  }

  const { error } = await supabase.from("expense_records").insert({
    organization_id: profile.organization_id,
    category_id: categoryId,
    vendor_id: vendorId,
    cost_center_id: costCenterId,
    paid_from_reserve: conFondo,
    reserve_acta: conFondo ? actaFondo : null,
    description,
    amount,
    currency: moneda,
    tipo_contable: tipo,
    retencion_islr: retencion,
    receipt_url: receiptUrl,
    expense_date: expenseDate,
    recorded_by: profile.id,
  });

  if (error) return { error: error.message };

  revalidatePath("/finanzas");
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function voidExpense(expenseId: string, reason: string) {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return { error: "No autenticado" };
  if (!isAdminRole(profile)) return { error: "Solo administradores pueden anular gastos" };

  const reasonCheck = validateVoidReason(reason);
  if (!reasonCheck.ok || !reasonCheck.reason) {
    return { error: reasonCheck.error ?? "Razón inválida" };
  }

  const supabase = createAdminClient();

  // Verificar que existe y pertenece a la org y NO está ya anulado
  const { data: expense } = await supabase
    .from("expense_records")
    .select("id, organization_id, voided_at")
    .eq("id", expenseId)
    .eq("organization_id", profile.organization_id)
    .single();
  if (!expense) return { error: "Gasto no encontrado" };
  if (expense.voided_at) return { error: "Este gasto ya está anulado" };

  const { error } = await supabase
    .from("expense_records")
    .update({
      voided_at: new Date().toISOString(),
      voided_reason: reasonCheck.reason,
    })
    .eq("id", expenseId)
    .eq("organization_id", profile.organization_id);

  if (error) return { error: error.message };

  revalidatePath("/finanzas");
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { success: true };
}

/** Dinero que entra sin ser el pago de una cuota (migration 059). */
export async function createOtherIncome(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return { error: "No tienes organización asignada" };
  if (!isAdminRole(profile)) return { error: "Solo administradores pueden registrar ingresos" };

  const description = (formData.get("description") as string)?.trim().slice(0, 200);
  const source = (formData.get("source") as string)?.trim().slice(0, 120) || null;
  const amount = parseFloat(formData.get("amount") as string);
  const incomeDate = formData.get("income_date") as string;
  const method = formData.get("payment_method") === "cash" ? "cash" : "bank";
  const costCenterId = (formData.get("cost_center_id") as string)?.trim() || null;
  const photo = formData.get("receipt") as File | null;

  if (!description || description.length < 3) return { error: "Escribe el concepto" };
  if (!amount || amount <= 0) return { error: "Indica un monto mayor que cero" };
  if (!incomeDate || !/^\d{4}-\d{2}-\d{2}$/.test(incomeDate)) return { error: "Indica la fecha" };

  const supabase = createAdminClient();
  if (costCenterId) {
    const { data: centro } = await supabase
      .from("cost_centers")
      .select("id")
      .eq("id", costCenterId)
      .eq("organization_id", profile.organization_id)
      .maybeSingle();
    if (!centro) return { error: "Centro de costo inválido" };
  }

  let receiptUrl: string | null = null;
  if (photo && photo.size > 0) {
    const ext = photo.name.split(".").pop() ?? "jpg";
    const path = `incomes/${profile.organization_id}/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("maintenance-photos")
      .upload(path, photo, { contentType: photo.type });
    if (!uploadError) receiptUrl = `maintenance-photos/${path}`;
  }

  const { error } = await supabase.from("other_incomes").insert({
    organization_id: profile.organization_id,
    income_date: incomeDate,
    description,
    source,
    amount,
    payment_method: method,
    receipt_url: receiptUrl,
    cost_center_id: costCenterId,
    recorded_by: profile.id,
  });
  if (error) return { error: error.message };

  revalidatePath("/finanzas");
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function voidOtherIncome(id: string, reason: string) {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return { error: "No autenticado" };
  if (!isAdminRole(profile)) return { error: "Solo administradores pueden anular ingresos" };

  const check = validateVoidReason(reason);
  if (!check.ok || !check.reason) return { error: check.error ?? "Razón inválida" };

  const { data, error } = await createAdminClient()
    .from("other_incomes")
    .update({ voided_at: new Date().toISOString(), voided_reason: check.reason })
    .eq("id", id)
    .eq("organization_id", profile.organization_id)
    .is("voided_at", null)
    .select("id");
  if (error) return { error: error.message };
  if (!data?.length) return { error: "Ese ingreso no existe o ya está anulado" };

  revalidatePath("/finanzas");
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { success: true };
}
