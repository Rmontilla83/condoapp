"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/queries";
import { isAdminRole } from "@/lib/permissions";
import { revalidatePath } from "next/cache";

export async function submitPaymentReceipt(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "No autenticado" };

  const invoiceId = formData.get("invoice_id") as string;
  const reference = (formData.get("reference") as string)?.trim();
  const method = (formData.get("method") as string) || "transfer";
  const photo = formData.get("receipt") as File;

  if (!invoiceId) return { error: "Factura no especificada" };

  const supabase = await createClient();

  // Upload receipt photo
  let receiptUrl: string | null = null;
  if (photo && photo.size > 0) {
    const ext = photo.name.split(".").pop() ?? "jpg";
    const path = `${profile.organization_id}/${invoiceId}-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("payment-receipts")
      .upload(path, photo, { contentType: photo.type });

    if (!uploadError) {
      const { data } = supabase.storage.from("payment-receipts").getPublicUrl(path);
      receiptUrl = data.publicUrl;
    }
  }

  // Get invoice amount
  const { data: invoice } = await supabase
    .from("invoices")
    .select("amount, currency")
    .eq("id", invoiceId)
    .single();

  if (!invoice) return { error: "Factura no encontrada" };

  // Create transaction (pending approval)
  const { error } = await supabase.from("transactions").insert({
    invoice_id: invoiceId,
    amount: invoice.amount,
    currency: invoice.currency,
    payment_method: method,
    reference: reference || null,
    receipt_url: receiptUrl,
    paid_by: profile.id,
    status: "pending",
  });

  if (error) return { error: error.message };

  revalidatePath("/pagos");
  revalidatePath("/admin");
  return { success: true };
}

export async function approvePayment(transactionId: string) {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id || !isAdminRole(profile)) {
    return { error: "No autorizado" };
  }

  const supabase = createAdminClient();

  // Get transaction — verify it belongs to this org via invoice
  const { data: tx } = await supabase
    .from("transactions")
    .select("invoice_id, invoices!inner(organization_id)")
    .eq("id", transactionId)
    .eq("invoices.organization_id", profile.organization_id)
    .single();

  if (!tx) return { error: "Transacción no encontrada" };

  const { error: txError } = await supabase
    .from("transactions")
    .update({ status: "approved" })
    .eq("id", transactionId);

  if (txError) return { error: txError.message };

  const { error: invError } = await supabase
    .from("invoices")
    .update({ status: "paid" })
    .eq("id", tx.invoice_id);

  if (invError) return { error: invError.message };

  revalidatePath("/pagos");
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function rejectPayment(transactionId: string) {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id || !isAdminRole(profile)) {
    return { error: "No autorizado" };
  }

  const supabase = createAdminClient();

  const { data: check } = await supabase
    .from("transactions")
    .select("id, invoices!inner(organization_id)")
    .eq("id", transactionId)
    .eq("invoices.organization_id", profile.organization_id)
    .single();

  if (!check) return { error: "Transacción no encontrada" };

  const { error } = await supabase
    .from("transactions")
    .update({ status: "rejected" })
    .eq("id", transactionId);

  if (error) return { error: error.message };

  revalidatePath("/pagos");
  revalidatePath("/admin");
  return { success: true };
}
