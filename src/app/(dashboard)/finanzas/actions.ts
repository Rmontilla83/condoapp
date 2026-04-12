"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/queries";
import { revalidatePath } from "next/cache";

export async function createExpense(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return { error: "No tienes organizacion asignada" };
  if (profile.role !== "admin" && profile.role !== "super_admin") {
    return { error: "Solo administradores pueden registrar gastos" };
  }

  const category = formData.get("category") as string;
  const description = formData.get("description") as string;
  const amount = parseFloat(formData.get("amount") as string);
  const expenseDate = (formData.get("expense_date") as string) || new Date().toISOString().split("T")[0];
  const photo = formData.get("receipt") as File;

  if (!category || !description || !amount || amount <= 0) {
    return { error: "Completa todos los campos" };
  }

  const supabase = await createClient();

  // Upload receipt photo if provided
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
    category,
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
