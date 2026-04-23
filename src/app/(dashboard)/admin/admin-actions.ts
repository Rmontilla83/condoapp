"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile, getCurrentRate } from "@/lib/queries";
import { isAdminRole } from "@/lib/permissions";
import { revalidatePath } from "next/cache";

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

export async function generateMonthlyInvoices(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return { error: "No autorizado" };
  if (!isAdminRole(profile)) return { error: "Solo administradores" };

  const month = formData.get("month") as string;
  const year = formData.get("year") as string;
  const amount = parseFloat(formData.get("amount") as string);
  const description =
    (formData.get("description") as string)?.trim() || `Cuota ${month}/${year}`;
  const dueDay = parseInt(formData.get("due_day") as string) || 15;

  if (!month || !year || !amount || amount <= 0) return { error: "Completa todos los campos" };

  const supabase = createAdminClient();

  // Get exchange rate
  const rateData = await getCurrentRate(profile.organization_id);
  const rate = Number(rateData.rate);

  const { data: units } = await supabase
    .from("units")
    .select("id")
    .eq("organization_id", profile.organization_id);

  if (!units || units.length === 0) return { error: "No hay unidades registradas" };

  const dueDate = `${year}-${month.padStart(2, "0")}-${dueDay.toString().padStart(2, "0")}`;

  const { data: existing } = await supabase
    .from("invoices")
    .select("id")
    .eq("organization_id", profile.organization_id)
    .eq("due_date", dueDate)
    .limit(1);

  if (existing && existing.length > 0) {
    return { error: `Ya existen cuotas para ${month}/${year}. Elimina las existentes primero.` };
  }

  const invoices = units.map((unit) => ({
    organization_id: profile.organization_id,
    unit_id: unit.id,
    amount,
    currency: "USD",
    description,
    due_date: dueDate,
    status: "pending",
    exchange_rate: rate || null,
    amount_bs: rate ? amount * rate : null,
  }));

  const { error } = await supabase.from("invoices").insert(invoices);
  if (error) return { error: error.message };

  revalidatePath("/pagos");
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { success: true, count: units.length };
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
      aliquot: 0,
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
