"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { submitPaymentReceipt } from "./actions";

export function PayDialog({ invoiceId, amount, description }: { invoiceId: string; amount: number; description: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    formData.set("invoice_id", invoiceId);
    const res = await submitPaymentReceipt(formData);

    if (res.error) {
      setError(res.error);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
    router.refresh();
  }

  function handleClose() {
    setOpen(false);
    setSuccess(false);
    setError("");
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else setOpen(true); }}>
      <DialogTrigger render={<Button size="sm" />}>
        Reportar pago
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {success ? (
          <>
            <DialogHeader>
              <DialogTitle>Comprobante enviado</DialogTitle>
              <DialogDescription>
                Tu comprobante esta siendo revisado por el administrador.
              </DialogDescription>
            </DialogHeader>
            <div className="py-6 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
                <svg className="h-7 w-7 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <p className="text-sm text-muted-foreground">
                Recibiras una notificacion cuando sea aprobado.
              </p>
              <Button onClick={handleClose} className="mt-4">Entendido</Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Reportar pago</DialogTitle>
              <DialogDescription>
                {description} — ${amount.toFixed(2)} USD
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="method">Metodo de pago</Label>
                <select
                  id="method"
                  name="method"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  defaultValue="transfer"
                >
                  <option value="transfer">Transferencia bancaria</option>
                  <option value="mobile_payment">Pago movil</option>
                  <option value="zelle">Zelle</option>
                  <option value="cash">Efectivo</option>
                  <option value="other">Otro</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reference">Numero de referencia</Label>
                <Input id="reference" name="reference" placeholder="Ej: REF-00123456" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="receipt">Foto del comprobante</Label>
                <Input
                  id="receipt"
                  name="receipt"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="text-sm"
                />
                <p className="text-xs text-muted-foreground">Sube una captura o foto del comprobante de pago</p>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={handleClose} disabled={loading}>
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1" disabled={loading}>
                  {loading ? "Enviando..." : "Enviar comprobante"}
                </Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
