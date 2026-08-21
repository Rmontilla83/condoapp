"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PAYMENT_METHOD_LABELS } from "@/lib/labels";
import { approvePayment, rejectPayment, REJECTION_REASONS } from "../pagos/actions";

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


const OTRO = "__otro__";

export function PaymentReviewer({ payments }: { payments: PendingPayment[] }) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");
  /** Id del comprobante cuyo panel de rechazo está abierto. */
  const [rechazando, setRechazando] = useState<string | null>(null);
  const [motivo, setMotivo] = useState<string>(REJECTION_REASONS[0]);
  const [motivoLibre, setMotivoLibre] = useState("");

  const motivoFinal = motivo === OTRO ? motivoLibre.trim() : motivo;

  async function handleApprove(id: string) {
    setLoading(id);
    setError("");
    const res = await approvePayment(id);
    setLoading(null);
    if (res.error) setError(res.error);
    else window.location.reload();
  }

  function abrirRechazo(id: string) {
    setRechazando(id);
    setMotivo(REJECTION_REASONS[0]);
    setMotivoLibre("");
    setError("");
  }

  async function confirmarRechazo(id: string) {
    if (motivoFinal.length < 4) {
      setError("Elige o escribe el motivo: el residente lo va a ver.");
      return;
    }
    setLoading(id);
    setError("");
    const res = await rejectPayment(id, motivoFinal);
    setLoading(null);
    if (res.error) setError(res.error);
    else window.location.reload();
  }

  if (payments.length === 0) {
    return <p className="py-4 text-center text-[13px] text-mute">No hay comprobantes pendientes.</p>;
  }

  return (
    <div className="space-y-3">
      {error && (
        <p
          role="alert"
          className="rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2 text-[13px] text-destructive mb-3"
        >
          {error}
        </p>
      )}

      {payments.map((p) => {
        const isLoading = loading === p.id;
        const abierto = rechazando === p.id;

        return (
          <div key={p.id} className="rounded-xl border p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold">
                  {p.invoices?.description ?? "Pago"} — Apto {p.invoices?.units?.unit_number ?? "?"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {PAYMENT_METHOD_LABELS[p.payment_method] ?? p.payment_method}
                  {p.reference ? ` — Ref: ${p.reference}` : " — sin referencia"}
                </p>
              </div>
              <span className="text-base font-bold tabular-nums shrink-0">
                ${Number(p.amount).toFixed(2)}
              </span>
            </div>

            {p.receipt_url ? (
              <a href={p.receipt_url} target="_blank" rel="noopener noreferrer" className="block">
                <div className="h-32 w-full rounded-lg overflow-hidden border bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.receipt_url}
                    alt={`Comprobante de ${p.invoices?.description ?? "pago"}`}
                    className="h-full w-full object-contain"
                  />
                </div>
              </a>
            ) : (
              <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-[12px] text-mute">
                Sin comprobante adjunto — verifica por la referencia.
              </p>
            )}

            {abierto ? (
              <div className="rounded-lg border border-red-200 bg-red-50/60 p-3 space-y-2.5">
                <p className="font-meta text-red-700">MOTIVO DEL RECHAZO</p>
                <p className="text-[12px] text-red-900/80">
                  El residente verá este texto en su pantalla de Pagos para saber qué corregir.
                </p>

                <label className="sr-only" htmlFor={`motivo-${p.id}`}>
                  Motivo del rechazo
                </label>
                <select
                  id={`motivo-${p.id}`}
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-base md:text-sm"
                >
                  {REJECTION_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                  <option value={OTRO}>Otro motivo…</option>
                </select>

                {motivo === OTRO && (
                  <>
                    <label className="sr-only" htmlFor={`motivo-libre-${p.id}`}>
                      Escribe el motivo
                    </label>
                    <input
                      id={`motivo-libre-${p.id}`}
                      value={motivoLibre}
                      onChange={(e) => setMotivoLibre(e.target.value)}
                      placeholder="Explícale qué pasó, en una línea"
                      className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-base md:text-sm"
                    />
                  </>
                )}

                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setRechazando(null)}
                    disabled={isLoading}
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 bg-red-600 hover:bg-red-700"
                    onClick={() => confirmarRechazo(p.id)}
                    disabled={isLoading || motivoFinal.length < 4}
                  >
                    {isLoading ? "Rechazando…" : "Confirmar rechazo"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleApprove(p.id)}
                  disabled={isLoading}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                >
                  {isLoading ? "Aprobando…" : "Aprobar"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => abrirRechazo(p.id)}
                  disabled={isLoading}
                  className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                >
                  Rechazar
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
