"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/queries";
import { isAdminRole } from "@/lib/permissions";
import { revalidatePath } from "next/cache";

/**
 * Sube 1 comprobante que cubre N invoices (n>=1). Crea N transactions
 * vinculadas con el mismo payment_group_id. Bloquea currency mismatch.
 *
 * formData: invoice_ids (JSON string array), method, reference?, receipt (File)
 */
export async function submitPaymentForMultipleInvoices(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "No autenticado" };

  const idsRaw = formData.get("invoice_ids");
  if (typeof idsRaw !== "string") return { error: "Falta selección de cuotas" };

  let invoiceIds: string[];
  try {
    const parsed = JSON.parse(idsRaw);
    if (!Array.isArray(parsed) || parsed.some((id) => typeof id !== "string")) {
      return { error: "Selección inválida" };
    }
    invoiceIds = parsed as string[];
  } catch {
    return { error: "Selección inválida (JSON)" };
  }
  if (invoiceIds.length === 0) return { error: "Selecciona al menos una cuota" };

  const reference = (formData.get("reference") as string)?.trim();
  const method = (formData.get("method") as string) || "transfer";
  const photo = formData.get("receipt") as File;

  const supabase = await createClient();

  // Validar todas las invoices existen y están pending/overdue
  const { data: invoices } = await supabase
    .from("invoices")
    .select("id, amount, currency, status")
    .in("id", invoiceIds);

  if (!invoices || invoices.length !== invoiceIds.length) {
    return { error: "Una o más cuotas no son válidas" };
  }

  const allPayable = invoices.every(
    (i) => i.status === "pending" || i.status === "overdue",
  );
  if (!allPayable) {
    return { error: "Hay cuotas que ya no están pendientes" };
  }

  // Currency mismatch
  const currencies = new Set(invoices.map((i) => i.currency as string));
  if (currencies.size > 1) {
    return { error: "No puedes pagar cuotas de distintas monedas con un solo comprobante" };
  }

  // Upload comprobante 1 sola vez
  let receiptUrl: string | null = null;
  if (photo && photo.size > 0) {
    if (photo.size > 5 * 1024 * 1024) {
      return { error: "El comprobante no puede pesar más de 5MB" };
    }
    const ext = (photo.name.split(".").pop() ?? "jpg").toLowerCase();
    const path = `${profile.organization_id}/group-${Date.now()}-${profile.id.slice(0, 8)}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("payment-receipts")
      .upload(path, photo, { contentType: photo.type });
    if (uploadError) return { error: `Error subiendo comprobante: ${uploadError.message}` };
    const { data } = supabase.storage.from("payment-receipts").getPublicUrl(path);
    receiptUrl = data.publicUrl;
  }

  const groupId = invoices.length > 1 ? crypto.randomUUID() : null;

  const txInserts = invoices.map((inv) => ({
    invoice_id: inv.id as string,
    amount: Number(inv.amount),
    currency: inv.currency as string,
    payment_method: method,
    reference: reference || null,
    receipt_url: receiptUrl,
    paid_by: profile.id,
    status: "pending" as const,
    payment_group_id: groupId,
  }));

  const { error } = await supabase.from("transactions").insert(txInserts);
  if (error) return { error: error.message };

  revalidatePath("/pagos");
  revalidatePath("/admin");
  return {
    success: true as const,
    count: invoices.length,
    group_id: groupId,
  };
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
