"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile, getCurrentRate } from "@/lib/queries";
import { isAdminRole } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import {
  MIN_REASON_LENGTH,
  normalizeRejectionReason,
} from "@/lib/rejection-reasons";

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

  // La misma regla que aplica el diálogo, pero acá, que es donde vale: el
  // cliente puede tener el bundle viejo, o alguien puede llamar la acción
  // directamente. Sin comprobante ni referencia el admin no tiene con qué
  // confirmar el pago, y la cuota igual desaparecía del saldo accionable.
  if (!reference && (!photo || photo.size === 0)) {
    return {
      error:
        "Necesitamos la captura o el número de referencia para que el administrador pueda confirmar tu pago.",
    };
  }

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
    // Guardamos la referencia `bucket/path`, no una URL pública: desde la
    // migration 030 el bucket es privado y se firma al momento de mostrarla.
    receiptUrl = `payment-receipts/${path}`;
  }

  const groupId = invoices.length > 1 ? crypto.randomUUID() : null;

  // Tasa del día, congelada en la transacción.
  //
  // Las columnas `amount_bs` y `currency_paid` existen desde la migration 007 y
  // nunca las escribió nadie: de un pago hecho en bolívares no quedaba ningún
  // rastro de a qué tasa se hizo. Sin eso no hay constancia que valga: seis
  // meses después nadie puede reconstruir cuánto se transfirió realmente.
  const rateData = await getCurrentRate(profile.organization_id as string);
  const tasa = Number(rateData?.rate) || 0;
  const pagadoEnBs = method === "transfer" || method === "mobile_payment";

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
    amount_bs: tasa > 0 ? Math.round(Number(inv.amount) * tasa * 100) / 100 : null,
    currency_paid: pagadoEnBs && tasa > 0 ? "VES" : (inv.currency as string),
    exchange_rate: tasa > 0 ? tasa : null,
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
    .select("invoice_id, status, invoices!inner(organization_id)")
    .eq("id", transactionId)
    .eq("invoices.organization_id", profile.organization_id)
    .single();

  if (!tx) return { error: "Transacción no encontrada" };
  // Doble clic, doble pestaña o reintento tras un error de red: sin este corte
  // se podía rechazar un pago ya aprobado y dejar la cuota en 'paid' con la
  // transacción en 'rejected'.
  if (tx.status !== "pending") {
    return { error: "Este comprobante ya fue revisado." };
  }

  const { error: txError } = await supabase
    .from("transactions")
    .update({
      status: "approved",
      reviewed_at: new Date().toISOString(),
      reviewed_by: profile.id,
      // rejection_reason NO se borra: si un admin rechazó y otro aprobó la misma
      // transacción, el motivo del primer rechazo es justo la traza que hay que
      // conservar. El residente no lo ve igual, porque
      // getLatestRejectionsByInvoice solo reporta si la ÚLTIMA quedó rechazada.
    })
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

export async function rejectPayment(transactionId: string, reason: string) {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id || !isAdminRole(profile)) {
    return { error: "No autorizado" };
  }

  const motivo = normalizeRejectionReason(reason);
  if (motivo.length < MIN_REASON_LENGTH) {
    return {
      error:
        "Escribe el motivo del rechazo. El residente lo va a ver y necesita saber qué corregir.",
    };
  }

  const supabase = createAdminClient();

  const { data: check } = await supabase
    .from("transactions")
    .select("id, status, invoices!inner(organization_id)")
    .eq("id", transactionId)
    .eq("invoices.organization_id", profile.organization_id)
    .single();

  if (!check) return { error: "Transacción no encontrada" };
  if (check.status !== "pending") {
    return { error: "Este comprobante ya fue revisado." };
  }

  const { error } = await supabase
    .from("transactions")
    .update({
      status: "rejected",
      rejection_reason: motivo,
      reviewed_at: new Date().toISOString(),
      reviewed_by: profile.id,
    })
    .eq("id", transactionId);

  if (error) return { error: error.message };

  revalidatePath("/pagos");
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { success: true };
}
