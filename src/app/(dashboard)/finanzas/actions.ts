"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/queries";
import { isAdminRole } from "@/lib/permissions";
import { validateVoidReason } from "@/lib/schemas/finance";
import { revalidatePath } from "next/cache";

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

  // Vendor: id existente OR quick-create por nombre
  const vendorIdRaw = (formData.get("vendor_id") as string)?.trim();
  const vendorNewName = (formData.get("vendor_new_name") as string)?.trim();

  if (!categoryId || !description || !amount || amount <= 0) {
    return { error: "Completa todos los campos requeridos" };
  }

  const supabase = createAdminClient();

  // Validar categoría pertenece a la org
  const { data: cat } = await supabase
    .from("expense_categories")
    .select("id")
    .eq("id", categoryId)
    .eq("organization_id", profile.organization_id)
    .single();
  if (!cat) return { error: "Categoría inválida" };

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
      const { data } = supabase.storage.from("maintenance-photos").getPublicUrl(path);
      receiptUrl = data.publicUrl;
    }
  }

  const { error } = await supabase.from("expense_records").insert({
    organization_id: profile.organization_id,
    category_id: categoryId,
    vendor_id: vendorId,
    description,
    amount,
    currency: "USD",
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
