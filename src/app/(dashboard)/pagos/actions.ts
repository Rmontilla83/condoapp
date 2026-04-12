"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/queries";
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
  if (!profile || (profile.role !== "admin" && profile.role !== "super_admin")) {
    return { error: "No autorizado" };
  }

  const supabase = await createClient();

  // Get transaction to find invoice
  const { data: tx } = await supabase
    .from("transactions")
    .select("invoice_id")
    .eq("id", transactionId)
    .single();

  if (!tx) return { error: "Transaccion no encontrada" };

  // Approve transaction
  const { error: txError } = await supabase
    .from("transactions")
    .update({ status: "approved" })
    .eq("id", transactionId);

  if (txError) return { error: txError.message };

  // Mark invoice as paid
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
  if (!profile || (profile.role !== "admin" && profile.role !== "super_admin")) {
    return { error: "No autorizado" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("transactions")
    .update({ status: "rejected" })
    .eq("id", transactionId);

  if (error) return { error: error.message };

  revalidatePath("/pagos");
  revalidatePath("/admin");
  return { success: true };
}
