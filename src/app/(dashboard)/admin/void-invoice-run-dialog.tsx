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
} from "@/components/ui/dialog";
import { voidInvoiceRun } from "./admin-actions";

/** Igual que la guarda del servidor en `voidInvoiceRun`. */
const MIN_MOTIVO = 10;

export interface InvoiceRun {
  dueDate: string;
  kind: string;
  description: string;
  total: number;
  currency: string;
  cuotas: number;
  pagadas: number;
  anuladas: number;
}

/**
 * Anular una tanda de cuotas mal emitida.
 *
 * generateMonthlyInvoices decía "Anúlalas antes de regenerar" desde el primer
 * día y no existía ninguna forma de hacerlo: `status='cancelled'` no lo escribía
 * nadie en toda la app. Emitir mal el mes o el monto era irreversible, y la
 * única salida era editar la base a mano.
 */
/**
 * `due_date` llega de PostgREST como "2026-09-01". Era el único punto de la app
 * donde una fecha de cuota salía sin localizar, justo en el diálogo que decide
 * qué tanda se anula — y con dos tandas del mismo concepto la fecha es lo único
 * que las distingue.
 *
 * El mediodía UTC evita que la conversión salte de día en zonas al oeste.
 */
function formatearVencimiento(iso: string): string {
  return new Date(`${iso}T12:00:00Z`)
    .toLocaleDateString("es", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    })
    .toUpperCase();
}

export function VoidInvoiceRunDialog({ runs }: { runs: InvoiceRun[] }) {
  const [open, setOpen] = useState(false);
  const [elegida, setElegida] = useState<InvoiceRun | null>(null);
  const [motivo, setMotivo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const anulables = runs.filter((r) => r.cuotas > r.pagadas + r.anuladas);

  function abrir() {
    setElegida(null);
    setMotivo("");
    setError("");
    setOpen(true);
  }

  async function anular() {
    if (!elegida) return;
    setLoading(true);
    setError("");
    const res = await voidInvoiceRun({
      dueDate: elegida.dueDate,
      kind: elegida.kind,
      description: elegida.description,
      reason: motivo,
    });
    setLoading(false);
    if ("error" in res && res.error) {
      setError(res.error);
      return;
    }
    window.location.reload();
  }

  if (anulables.length === 0) return null;

  return (
    <>
      <Button type="button" variant="outline" onClick={abrir}>
        Anular una tanda de cuotas
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Anular cuotas</DialogTitle>
            <DialogDescription>
              Para cuando emitiste una tanda con el monto o el mes equivocado. Las cuotas ya
              pagadas no se tocan.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 max-h-[40vh] overflow-y-auto">
            {anulables.map((r) => {
              const activa =
                elegida?.description === r.description && elegida?.dueDate === r.dueDate;
              const pendientes = r.cuotas - r.pagadas - r.anuladas;
              return (
                <button
                  key={`${r.dueDate}-${r.kind}-${r.description}`}
                  type="button"
                  onClick={() => {
                    setElegida(r);
                    setError("");
                  }}
                  className={`w-full text-left rounded-xl border p-3 transition ${
                    activa ? "border-destructive bg-destructive/5" : "border-border hover:bg-cloud/40"
                  }`}
                >
                  <p className="text-[14px] font-medium text-marine-deep">{r.description}</p>
                  <p className="mt-1 font-meta text-mute">
                    VENCE {formatearVencimiento(r.dueDate)} · {pendientes} POR ANULAR
                    {r.pagadas > 0 ? ` · ${r.pagadas} YA PAGADA${r.pagadas !== 1 ? "S" : ""}` : ""}
                  </p>
                </button>
              );
            })}
          </div>

          {elegida && (
            <div className="space-y-2">
              <Label htmlFor="motivo-anular">Por qué la anulas</Label>
              <Input
                id="motivo-anular"
                value={motivo}
                onChange={(e) => {
                  setMotivo(e.target.value);
                  setError("");
                }}
                placeholder="Ej: el monto base estaba equivocado"
                className="h-11"
              />
              <p
                className={`text-[12px] ${
                  motivo.trim().length > 0 && motivo.trim().length < MIN_MOTIVO
                    ? "text-ember-ink"
                    : "text-mute"
                }`}
              >
                Mínimo {MIN_MOTIVO} caracteres
                {motivo.trim().length > 0 && motivo.trim().length < MIN_MOTIVO
                  ? ` — te faltan ${MIN_MOTIVO - motivo.trim().length}.`
                  : "."}{" "}
                Queda registrado con tu nombre. Los residentes van a ver desaparecer esa deuda, y
                los comprobantes que estuvieran en revisión se rechazan con este motivo.
              </p>
            </div>
          )}

          {error && (
            <p
              role="alert"
              className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-[13px] text-destructive"
            >
              {error}
            </p>
          )}

          <div className="flex gap-3">
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
              type="button"
              variant="destructive"
              className="flex-1"
              onClick={anular}
              disabled={loading || !elegida || motivo.trim().length < MIN_MOTIVO}
            >
              {loading ? "Anulando…" : "Anular tanda"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
