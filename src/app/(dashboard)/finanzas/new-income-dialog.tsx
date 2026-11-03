"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createOtherIncome, voidOtherIncome } from "./actions";

const selector = "flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base md:text-sm";

export function NewIncomeDialog({ centros, hoy }: { centros: { id: string; name: string }[]; hoy: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await createOtherIncome(new FormData(e.currentTarget));
    if ("error" in res && res.error) {
      setError(res.error);
      setLoading(false);
      return;
    }
    window.location.reload();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" />}>Registrar ingreso</DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar otro ingreso</DialogTitle>
          <DialogDescription>
            Dinero que entra sin ser el pago de una cuota: un alquiler, el uso de un espacio, intereses del banco. Queda visible para todos los residentes.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="income-description">Concepto</Label>
            <Input id="income-description" name="description" required minLength={3} maxLength={200} placeholder="Ej: Alquiler del local de la planta baja" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="income-source">De quién (opcional)</Label>
            <Input id="income-source" name="source" maxLength={120} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="income-amount">Monto (USD)</Label>
              <Input id="income-amount" name="amount" type="number" step="0.01" min="0.01" required placeholder="0.00" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="income-date">Fecha</Label>
              <Input id="income-date" name="income_date" type="date" required max={hoy} defaultValue={hoy} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="income-method">Dónde entró</Label>
            <select id="income-method" name="payment_method" defaultValue="bank" className={selector}>
              <option value="bank">Banco</option>
              <option value="cash">Efectivo</option>
            </select>
          </div>
          {centros.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="income-center">Centro de costo (opcional)</Label>
              <select id="income-center" name="cost_center_id" defaultValue="" className={selector}>
                <option value="">Sin centro</option>
                {centros.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="income-receipt">Soporte (foto, opcional)</Label>
            <Input id="income-receipt" name="receipt" type="file" accept="image/jpeg,image/png,image/webp" className="text-sm" />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? "Guardando…" : "Registrar ingreso"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function VoidIncome({ id }: { id: string }) {
  const [abierto, setAbierto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!abierto) {
    return (
      <button type="button" onClick={() => setAbierto(true)} className="text-[12px] text-destructive hover:underline">
        Anular
      </button>
    );
  }
  return (
    <div className="mt-2 w-full space-y-2">
      <input
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
        placeholder="Motivo de la anulación"
        aria-label="Motivo de la anulación"
        className="h-9 w-full rounded-lg border border-border bg-background px-2 text-[13px]"
      />
      {error && <p className="text-[12px] text-destructive">{error}</p>}
      <div className="flex gap-3">
        <button
          type="button"
          disabled={loading}
          onClick={async () => {
            setLoading(true);
            const r = await voidOtherIncome(id, motivo);
            if ("error" in r && r.error) {
              setError(r.error);
              setLoading(false);
            } else window.location.reload();
          }}
          className="text-[12px] font-medium text-destructive disabled:opacity-50"
        >
          {loading ? "Anulando…" : "Confirmar anulación"}
        </button>
        <button type="button" onClick={() => setAbierto(false)} className="text-[12px] text-mute">
          Cancelar
        </button>
      </div>
    </div>
  );
}
