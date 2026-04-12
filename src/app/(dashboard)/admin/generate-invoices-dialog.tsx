"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { generateMonthlyInvoices } from "./admin-actions";

export function GenerateInvoicesDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<string | null>(null);

  const now = new Date();
  const nextMonth = now.getMonth() + 2;
  const defaultMonth = nextMonth > 12 ? "1" : nextMonth.toString();
  const defaultYear = nextMonth > 12 ? (now.getFullYear() + 1).toString() : now.getFullYear().toString();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    const res = await generateMonthlyInvoices(new FormData(e.currentTarget));
    if (res.error) { setError(res.error); setLoading(false); return; }
    setResult(`${res.count} cuotas generadas exitosamente`);
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setError(""); setResult(null); } }}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <svg className="mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Generar cuotas
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Generar cuotas mensuales</DialogTitle>
          <DialogDescription>Se creara una cuota para cada unidad del condominio.</DialogDescription>
        </DialogHeader>
        {result ? (
          <div className="py-6 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
              <svg className="h-7 w-7 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <p className="text-sm font-semibold">{result}</p>
            <Button onClick={() => setOpen(false)} className="mt-4">Entendido</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="month">Mes</Label>
                <select id="month" name="month" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" defaultValue={defaultMonth}>
                  {["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"].map((m, i) => (
                    <option key={i} value={(i + 1).toString()}>{m}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="year">Ano</Label>
                <Input id="year" name="year" type="number" defaultValue={defaultYear} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="amount">Monto por unidad (USD)</Label>
                <Input id="amount" name="amount" type="number" step="0.01" placeholder="85.00" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="due_day">Dia de vencimiento</Label>
                <Input id="due_day" name="due_day" type="number" min="1" max="28" defaultValue="15" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descripcion</Label>
              <Input id="description" name="description" placeholder="Ej: Cuota mayo 2026" />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)} disabled={loading}>Cancelar</Button>
              <Button type="submit" className="flex-1" disabled={loading}>{loading ? "Generando..." : "Generar cuotas"}</Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
