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
  /** Las reglas que escribe el admin. Se guardaban y no se mostraban en ningún
   *  lado: el formulario de Ajustes prometía algo que no ocurría. */
  rules?: string | null;
  max_reservations_per_week: number | null;
  max_duration_hours: number | null;
  min_advance_hours: number;
  max_advance_days: number | null;
}

function policyHints(a: Area): string[] {
  const hints: string[] = [];
  if (a.max_reservations_per_week != null)
    hints.push(`Máx ${a.max_reservations_per_week} reserva(s) por semana`);
  if (a.max_duration_hours != null) hints.push(`Hasta ${a.max_duration_hours} h por reserva`);
  if (a.min_advance_hours > 0) hints.push(`Anticipación mínima ${a.min_advance_hours} h`);
  if (a.max_advance_days != null) hints.push(`Hasta ${a.max_advance_days} días de anticipación`);
  return hints;
}

export function ReserveDialog({
  areas,
  manana,
}: {
  areas: Area[];
  /**
   * Primer día reservable, `YYYY-MM-DD`, calculado en la zona del condominio.
   *
   * Antes salía de `new Date(Date.now() + 86400000)` en el navegador: un
   * residente conectado desde Madrid a las 03:00 veía bloqueado un día que en
   * Venezuela todavía es reservable, y uno en México podía elegir un día que el
   * servidor rechazaba. La hora del condominio es la única que manda acá.
   */
  manana: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [selectedAreaId, setSelectedAreaId] = useState("");

  const selectedArea = areas.find((a) => a.id === selectedAreaId);
  const hints = selectedArea ? policyHints(selectedArea) : [];

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
                <select
                  id="area_id"
                  name="area_id"
                  value={selectedAreaId}
                  onChange={(e) => setSelectedAreaId(e.target.value)}
                  className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base md:text-sm"
                  required
                >
                  <option value="">Selecciona</option>
                  {areas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}{a.capacity ? ` (cap. ${a.capacity})` : ""}
                    </option>
                  ))}
                </select>
                {hints.length > 0 && (
                  <ul className="mt-1 space-y-0.5 text-[12px] text-mute">
                    {hints.map((h, i) => (
                      <li key={i}>· {h}</li>
                    ))}
                  </ul>
                )}
                {selectedArea?.rules && (
                  <div className="mt-2 rounded-md border border-border bg-cloud/40 p-2.5">
                    <p className="font-meta text-mute">REGLAS DE USO</p>
                    <p className="mt-1 text-[12px] text-marine-deep whitespace-pre-line">
                      {selectedArea.rules}
                    </p>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Fecha</Label>
                <Input id="date" name="date" type="date" min={manana} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="start_hour">Desde</Label>
                  <select id="start_hour" name="start_hour" className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base md:text-sm" required>
                    {Array.from({ length: 15 }, (_, i) => i + 7).map((h) => (
                      <option key={h} value={`${h.toString().padStart(2, "0")}:00`}>
                        {h > 12 ? `${h - 12}:00 PM` : h === 12 ? "12:00 PM" : `${h}:00 AM`}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_hour">Hasta</Label>
                  <select id="end_hour" name="end_hour" className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base md:text-sm" required>
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
