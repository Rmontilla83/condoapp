"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { voidExpense } from "./actions";

interface Props {
  expenseId: string;
  expenseDescription: string;
  expenseAmount: number;
}

export function VoidExpenseDialog({ expenseId, expenseDescription, expenseAmount }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const minLengthOk = reason.trim().length >= 10;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!minLengthOk) {
      setError("La razón debe tener al menos 10 caracteres");
      return;
    }
    setLoading(true);
    setError("");
    const res = await voidExpense(expenseId, reason);
    if ("error" in res && res.error) {
      setError(res.error);
      setLoading(false);
      return;
    }
    setLoading(false);
    setOpen(false);
    window.location.reload();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) {
          setReason("");
          setError("");
        }
      }}
    >
      <DialogTrigger render={<Button size="sm" variant="ghost" />}>
        <span className="font-meta text-destructive hover:underline">ANULAR</span>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Anular gasto</DialogTitle>
          <DialogDescription>
            Vas a anular: <strong>{expenseDescription}</strong> por ${expenseAmount.toFixed(2)}.
            La razón queda en el histórico — el gasto NO se borra, solo se marca como anulado.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="void_reason">
              Razón de la anulación <span className="text-destructive">*</span>
            </Label>
            <textarea
              id="void_reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              maxLength={500}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-base md:text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Ej: Pago duplicado, ya reembolsado por el proveedor"
              autoFocus
            />
            <p
              className={`text-[12px] ${
                reason.length > 0 && reason.length < 10 ? "text-destructive" : "text-mute"
              }`}
            >
              {reason.length} / 500 caracteres · mínimo 10
            </p>
          </div>
          {error && (
            <p className="text-sm text-destructive bg-destructive/5 border border-destructive/30 rounded p-2">
              {error}
            </p>
          )}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="destructive"
              className="flex-1"
              disabled={loading || !minLengthOk}
            >
              {loading ? "Anulando…" : "Anular gasto"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
