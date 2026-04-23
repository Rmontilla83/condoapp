"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { addUnit } from "./admin-actions";

export function AddUnitDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(null);
    const form = e.currentTarget;
    try {
      const res = await addUnit(new FormData(form));
      if ("error" in res && res.error) {
        setError(res.error);
        setLoading(false);
        return;
      }
      const unitNumber =
        "unit" in res && res.unit
          ? (res.unit as { unit_number: string }).unit_number
          : "nueva";
      setSuccess(`Unidad "${unitNumber}" guardada.`);
      setLoading(false);
      form.reset();
      window.location.reload();
      // Cerrar dialog 1.5s después para que vea el éxito
      setTimeout(() => {
        setOpen(false);
        setSuccess(null);
      }, 1500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      setError(`Excepción: ${msg}`);
      setLoading(false);
    }
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
          {error && (
            <p className="rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2 text-[13px] text-destructive">
              {error}
            </p>
          )}
          {success && (
            <p className="rounded-md bg-cyan/10 border border-cyan/30 px-3 py-2 text-[13px] text-cyan">
              ✓ {success}
            </p>
          )}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)} disabled={loading}>Cancelar</Button>
            <Button type="submit" className="flex-1" disabled={loading}>{loading ? "Agregando..." : "Agregar"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
