"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { addUnit } from "./admin-actions";

export function AddUnitDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await addUnit(new FormData(e.currentTarget));
    if (res.error) { setError(res.error); setLoading(false); return; }
    setOpen(false);
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setError(""); }}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <svg className="mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Agregar unidad
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Agregar unidad</DialogTitle>
          <DialogDescription>Nuevo apartamento, casa o local del condominio.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="unit_number">Numero / Identificador</Label>
            <Input id="unit_number" name="unit_number" placeholder="Ej: 5-A, PH-B, L-3" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="floor">Piso</Label>
              <Input id="floor" name="floor" type="number" placeholder="Ej: 5" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="block">Bloque/Torre</Label>
              <Input id="block" name="block" placeholder="Ej: A" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="type">Tipo</Label>
            <select id="type" name="type" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" defaultValue="apartment">
              <option value="apartment">Apartamento</option>
              <option value="house">Casa</option>
              <option value="penthouse">Penthouse</option>
              <option value="local">Local comercial</option>
              <option value="office">Oficina</option>
            </select>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)} disabled={loading}>Cancelar</Button>
            <Button type="submit" className="flex-1" disabled={loading}>{loading ? "Agregando..." : "Agregar"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
