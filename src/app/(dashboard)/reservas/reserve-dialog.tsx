"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { createReservation } from "./actions";

interface Area {
  id: string;
  name: string;
  capacity: number | null;
}

export function ReserveDialog({ areas }: { areas: Area[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const res = await createReservation(formData);

    if (res.error) {
      setError(res.error);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
    window.location.reload();
  }

  function handleClose() {
    setOpen(false);
    setSuccess(false);
    setError("");
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else setOpen(true); }}>
      <DialogTrigger render={<Button />}>
        <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Nueva reserva
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {success ? (
          <>
            <DialogHeader>
              <DialogTitle>Reserva confirmada</DialogTitle>
            </DialogHeader>
            <div className="py-6 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
                <svg className="h-7 w-7 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <p className="text-sm text-muted-foreground">Tu reserva ha sido registrada.</p>
              <Button onClick={handleClose} className="mt-4">Entendido</Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Reservar area comun</DialogTitle>
              <DialogDescription>Selecciona el espacio, fecha y horario.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="area_id">Espacio</Label>
                <select id="area_id" name="area_id" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required>
                  <option value="">Selecciona</option>
                  {areas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}{a.capacity ? ` (cap. ${a.capacity})` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Fecha</Label>
                <Input id="date" name="date" type="date" min={tomorrow} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="start_hour">Desde</Label>
                  <select id="start_hour" name="start_hour" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required>
                    {Array.from({ length: 15 }, (_, i) => i + 7).map((h) => (
                      <option key={h} value={`${h.toString().padStart(2, "0")}:00`}>
                        {h > 12 ? `${h - 12}:00 PM` : h === 12 ? "12:00 PM" : `${h}:00 AM`}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_hour">Hasta</Label>
                  <select id="end_hour" name="end_hour" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required>
                    {Array.from({ length: 15 }, (_, i) => i + 8).map((h) => (
                      <option key={h} value={`${h.toString().padStart(2, "0")}:00`}>
                        {h > 12 ? `${h - 12}:00 PM` : h === 12 ? "12:00 PM" : `${h}:00 AM`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notas (opcional)</Label>
                <Input id="notes" name="notes" placeholder="Ej: Cumpleanos, reunion de vecinos..." />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={handleClose} disabled={loading}>
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1" disabled={loading}>
                  {loading ? "Reservando..." : "Confirmar reserva"}
                </Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
