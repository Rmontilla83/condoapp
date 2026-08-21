"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { submitPaymentForMultipleInvoices } from "./actions";
import type { Invoice } from "@/types/database";

const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;

interface PaymentTarget {
  invoices: Invoice[]; // las cuotas que se van a pagar
}

interface Props {
  target: PaymentTarget | null;
  rate: number;
  onClose: () => void;
}

export function MultiPayDialog({ target, rate, onClose }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [receiptName, setReceiptName] = useState("");

  useEffect(() => {
    if (target) {
      setOpen(true);
      setError("");
      setSuccess(false);
      setReceiptName("");
    }
  }, [target]);

  function handleClose() {
    setOpen(false);
    setTimeout(() => {
      onClose();
      setSuccess(false);
      setError("");
      setReceiptName("");
    }, 200);
    if (success) {
      window.location.reload();
    }
  }

  if (!target) return null;

  const total = target.invoices.reduce((s, i) => s + Number(i.amount), 0);
  const currency = target.invoices[0]?.currency ?? "USD";
  const mixedCurrency = new Set(target.invoices.map((i) => i.currency)).size > 1;
  const totalBs = rate > 0 ? total * rate : 0;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (mixedCurrency) {
      setError("No puedes pagar cuotas de distintas monedas con un solo comprobante");
      return;
    }
    setLoading(true);
    setError("");

    const formEl = e.currentTarget;
    const formData = new FormData(formEl);
    formData.set("invoice_ids", JSON.stringify(target!.invoices.map((i) => i.id)));

    const photo = formData.get("receipt") as File | null;
    if (photo && photo.size > MAX_RECEIPT_BYTES) {
      setError("El comprobante no puede pesar más de 5MB");
      setLoading(false);
      return;
    }

    const res = await submitPaymentForMultipleInvoices(formData);
    if ("error" in res && res.error) {
      setError(res.error);
      setLoading(false);
      return;
    }
    setSuccess(true);
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        {success ? (
          <>
            <DialogHeader>
              <DialogTitle>Comprobante enviado</DialogTitle>
              <DialogDescription>
                {target.invoices.length === 1
                  ? "Tu comprobante está siendo revisado por el administrador."
                  : `Tu comprobante cubre ${target.invoices.length} cuotas y está siendo revisado por el administrador.`}
              </DialogDescription>
            </DialogHeader>
            <div className="py-6 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
                <svg className="h-7 w-7 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <p className="text-sm text-muted-foreground">
                Tu comprobante quedó registrado. El estado se actualiza en
                <span className="font-medium text-marine-deep"> Pagos</span> en
                cuanto el administrador lo revise.
              </p>
              <Button onClick={handleClose} className="mt-4">Entendido</Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>
                {target.invoices.length === 1 ? "Subir comprobante" : `Pagar ${target.invoices.length} cuotas`}
              </DialogTitle>
              <DialogDescription>
                Total: ${total.toFixed(2)} {currency}
                {totalBs > 0 ? ` · Bs ${totalBs.toFixed(2)}` : ""}
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-lg border border-border bg-cloud/40 p-3 max-h-[140px] overflow-y-auto">
              <ul className="space-y-1.5 text-[13px]">
                {target.invoices.map((inv) => (
                  <li key={inv.id} className="flex items-center justify-between gap-3">
                    <span className="truncate">{inv.description}</span>
                    <span className="font-mono text-mute shrink-0">
                      ${Number(inv.amount).toFixed(2)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {mixedCurrency && (
              <p className="text-sm text-destructive border border-destructive/30 bg-destructive/5 rounded p-2">
                Has seleccionado cuotas en distintas monedas. Sepáralas para pagar con comprobantes distintos.
              </p>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="method">Método de pago</Label>
                <select
                  id="method"
                  name="method"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  defaultValue="transfer"
                >
                  <option value="transfer">Transferencia bancaria</option>
                  <option value="mobile_payment">Pago móvil</option>
                  <option value="zelle">Zelle</option>
                  <option value="paypal">PayPal</option>
                  <option value="binance">Binance</option>
                  <option value="cash">Efectivo</option>
                  <option value="other">Otro</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reference">Número de referencia</Label>
                <Input id="reference" name="reference" placeholder="Ej: REF-00123456" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="receipt">Comprobante (foto/captura)</Label>
                <Input
                  id="receipt"
                  name="receipt"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="text-sm"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      if (f.size > MAX_RECEIPT_BYTES) {
                        setError("El comprobante no puede pesar más de 5MB");
                        e.target.value = "";
                        setReceiptName("");
                        return;
                      }
                      setError("");
                      setReceiptName(f.name);
                    } else {
                      setReceiptName("");
                    }
                  }}
                />
                {receiptName && (
                  <p className="text-[12px] text-mute truncate">📎 {receiptName}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  JPG/PNG/WebP, hasta 5MB. Asegúrate de que se vea claro el monto y la referencia.
                </p>
              </div>
              {error && (
                <p className="text-sm text-destructive border border-destructive/30 bg-destructive/5 rounded p-2">
                  {error}
                </p>
              )}
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={handleClose} disabled={loading}>
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1" disabled={loading || mixedCurrency}>
                  {loading ? "Enviando…" : "Subir comprobante"}
                </Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
