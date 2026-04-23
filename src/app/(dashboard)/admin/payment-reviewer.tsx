"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { approvePayment, rejectPayment } from "../pagos/actions";

interface PendingPayment {
  id: string;
  amount: number;
  currency: string;
  payment_method: string;
  reference: string | null;
  receipt_url: string | null;
  paid_at: string;
  status: string;
  invoices: { description: string; units: { unit_number: string } | null } | null;
}

export function PaymentReviewer({ payments }: { payments: PendingPayment[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function handleApprove(id: string) {
    setLoading(id);
    setError("");
    const res = await approvePayment(id);
    setLoading(null);
    if (res.error) setError(res.error);
    else router.refresh();
  }

  async function handleReject(id: string) {
    setLoading(id);
    setError("");
    const res = await rejectPayment(id);
    setLoading(null);
    if (res.error) setError(res.error);
    else router.refresh();
  }

  if (payments.length === 0) {
    return <p className="py-4 text-center text-[13px] text-mute">No hay comprobantes pendientes.</p>;
  }
  const errorBanner = error ? (
    <p className="rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2 text-[13px] text-destructive mb-3">
      {error}
    </p>
  ) : null;

  const methodLabels: Record<string, string> = {
    transfer: "Transferencia",
    mobile_payment: "Pago movil",
    zelle: "Zelle",
    cash: "Efectivo",
    other: "Otro",
  };

  return (
    <div className="space-y-3">
      {errorBanner}
      {payments.map((p) => {
        const isLoading = loading === p.id;
        return (
          <div key={p.id} className="rounded-xl border p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold">
                  {p.invoices?.description ?? "Pago"} — Apto {p.invoices?.units?.unit_number ?? "?"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {methodLabels[p.payment_method] ?? p.payment_method}
                  {p.reference ? ` — Ref: ${p.reference}` : ""}
                </p>
              </div>
              <span className="text-base font-bold">${Number(p.amount).toFixed(2)}</span>
            </div>

            {p.receipt_url && (
              <a href={p.receipt_url} target="_blank" rel="noopener noreferrer" className="block">
                <div className="h-32 w-full rounded-lg overflow-hidden border bg-muted">
                  <img src={p.receipt_url} alt="Comprobante" className="h-full w-full object-contain" />
                </div>
              </a>
            )}

            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => handleApprove(p.id)}
                disabled={isLoading}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              >
                {isLoading ? "..." : "Aprobar"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleReject(p.id)}
                disabled={isLoading}
                className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
              >
                Rechazar
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
