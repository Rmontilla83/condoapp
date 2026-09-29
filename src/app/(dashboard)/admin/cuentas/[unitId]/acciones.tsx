"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { usd } from "@/lib/format";
import { anularRecibo, cerrarConvenio, crearConvenio, registrarPagoRecibido } from "../actions";

const campo = "h-10 w-full rounded-lg border border-border bg-background px-3 text-[15px] md:text-[14px]";
const etiqueta = "text-[13px] font-medium text-marine-deep";

function Aviso({ error, ok }: { error?: string | null; ok?: string | null }) {
  if (error) return <p className="rounded-lg bg-destructive/5 px-3 py-2 text-[13px] text-destructive">{error}</p>;
  if (ok) return <p className="rounded-lg bg-emerald-50 px-3 py-2 text-[13px] text-emerald-800">{ok}</p>;
  return null;
}

export function AccionesCuenta({
  unitId,
  hoy,
  deudaVencida,
  tieneConvenio,
}: {
  unitId: string;
  hoy: string;
  deudaVencida: number;
  tieneConvenio: boolean;
}) {
  return (
    <>
      <RegistrarPago unitId={unitId} hoy={hoy} />
      {!tieneConvenio && deudaVencida > 0 && <NuevoConvenio unitId={unitId} hoy={hoy} deudaVencida={deudaVencida} />}
    </>
  );
}

function RegistrarPago({ unitId, hoy }: { unitId: string; hoy: string }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [metodo, setMetodo] = useState("transfer");

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setError(null); if (ok) window.location.reload(); } }}>
      <DialogTrigger render={<Button />}>Registrar pago recibido</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar pago recibido</DialogTitle>
          <DialogDescription>
            Un pago que llegó a la administración sin reporte del vecino. Se aplica a los recibos más antiguos; si sobra,
            queda como saldo a favor.
          </DialogDescription>
        </DialogHeader>
        {ok ? (
          <div className="space-y-4">
            <Aviso ok={ok} />
            <Button onClick={() => window.location.reload()}>Listo</Button>
          </div>
        ) : (
          <form
            className="space-y-3"
            action={(fd) => {
              fd.set("unit_id", unitId);
              setError(null);
              start(async () => {
                const r = await registrarPagoRecibido(fd);
                if ("error" in r) setError(r.error);
                else setOk(r.mensaje ?? "Pago registrado.");
              });
            }}
          >
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1">
                <span className={etiqueta}>Monto (USD)</span>
                <input name="monto" inputMode="decimal" required className={campo} placeholder="0,00" />
              </label>
              <label className="space-y-1">
                <span className={etiqueta}>Fecha del pago</span>
                <input name="fecha" type="date" required max={hoy} defaultValue={hoy} className={campo} />
              </label>
            </div>
            <label className="block space-y-1">
              <span className={etiqueta}>Método</span>
              <select name="metodo" value={metodo} onChange={(e) => setMetodo(e.target.value)} className={campo}>
                <option value="transfer">Transferencia</option>
                <option value="mobile_payment">Pago móvil</option>
                <option value="zelle">Zelle</option>
                <option value="cash">Efectivo</option>
                <option value="binance">Binance</option>
                <option value="other">Otro</option>
              </select>
            </label>
            <label className="block space-y-1">
              <span className={etiqueta}>Referencia {metodo === "cash" ? "(opcional)" : ""}</span>
              <input name="referencia" className={campo} placeholder="Número de la operación bancaria" />
            </label>
            <label className="block space-y-1">
              <span className={etiqueta}>Nota (opcional)</span>
              <input name="nota" className={campo} placeholder="Ej.: recibido en la oficina por la administradora" />
            </label>
            <Aviso error={error} />
            <Button type="submit" disabled={pending} className="w-full">
              {pending ? "Registrando…" : "Registrar y aplicar"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function NuevoConvenio({ unitId, hoy, deudaVencida }: { unitId: string; hoy: string; deudaVencida: number }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(deudaVencida.toFixed(2));
  const [cuotas, setCuotas] = useState(6);
  const primeraSugerida = (() => {
    const d = new Date(`${hoy}T12:00:00Z`);
    d.setUTCMonth(d.getUTCMonth() + 1, 1);
    return d.toISOString().slice(0, 10);
  })();
  const t = Number(total.replace(",", "."));

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setError(null); }}>
      <DialogTrigger render={<Button variant="outline" />}>Acordar convenio de pago</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Convenio de pago</DialogTitle>
          <DialogDescription>
            La deuda vencida se paga en cuotas mensuales. Los recibos no cambian: el convenio es un calendario, y mientras
            se cumpla la unidad figura al día y puede reservar.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-3"
          action={(fd) => {
            fd.set("unit_id", unitId);
            setError(null);
            start(async () => {
              const r = await crearConvenio(fd);
              if ("error" in r) setError(r.error);
              else window.location.reload();
            });
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1">
              <span className={etiqueta}>Total (USD)</span>
              <input name="total" inputMode="decimal" value={total} onChange={(e) => setTotal(e.target.value)} className={campo} />
            </label>
            <label className="space-y-1">
              <span className={etiqueta}>Cuotas mensuales</span>
              <input name="cuotas" type="number" min={2} max={36} value={cuotas} onChange={(e) => setCuotas(Number(e.target.value))} className={campo} />
            </label>
          </div>
          <label className="block space-y-1">
            <span className={etiqueta}>Primera cuota</span>
            <input name="primera" type="date" min={hoy} defaultValue={primeraSugerida} className={campo} />
          </label>
          <label className="block space-y-1">
            <span className={etiqueta}>Condiciones o referencia del acuerdo (opcional)</span>
            <textarea name="notas" rows={2} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[14px]" placeholder="Ej.: acordado con la junta el 29/09/2026" />
          </label>
          {t > 0 && cuotas >= 2 && (
            <p className="rounded-lg bg-frost px-3 py-2 text-[13px] text-marine-deep">
              {cuotas} cuotas de aproximadamente <strong>{usd(Math.round((t / cuotas) * 100) / 100)}</strong>.
            </p>
          )}
          <Aviso error={error} />
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Guardando…" : "Registrar convenio"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AnularRecibo({ invoiceId, numero }: { invoiceId: string; numero: string }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");
  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setError(null); }}>
      <DialogTrigger render={<button type="button" className="text-[12px] font-medium text-red-600 hover:underline" />}>
        Anular
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Anular el recibo {numero}</DialogTitle>
          <DialogDescription>
            Un recibo emitido no se borra ni se edita: se anula con una nota de crédito numerada que queda en el estado de
            cuenta. Si tenía saldo a favor aplicado, ese saldo vuelve a la unidad.
          </DialogDescription>
        </DialogHeader>
        <textarea
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          rows={3}
          placeholder="Motivo (queda escrito en la nota de crédito)"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[14px]"
        />
        <Aviso error={error} />
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Volver
          </Button>
          <Button
            disabled={pending || motivo.trim().length < 10}
            className="bg-red-600 hover:bg-red-700"
            onClick={() =>
              start(async () => {
                const r = await anularRecibo(invoiceId, motivo);
                if ("error" in r) setError(r.error);
                else window.location.reload();
              })
            }
          >
            {pending ? "Anulando…" : "Anular con nota de crédito"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function CerrarConvenio({ planId, completado }: { planId: string; completado: boolean }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col items-end gap-1" data-print-hide>
      <div className="flex gap-2">
        {completado && (
          <Button
            size="sm"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await cerrarConvenio(planId, "completed", "Convenio cumplido");
                if ("error" in r) setError(r.error);
                else window.location.reload();
              })
            }
          >
            Marcar cumplido
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => {
            const motivo = window.prompt("¿Por qué se deja sin efecto el convenio?");
            if (!motivo) return;
            start(async () => {
              const r = await cerrarConvenio(planId, "cancelled", motivo);
              if ("error" in r) setError(r.error);
              else window.location.reload();
            });
          }}
        >
          Dejar sin efecto
        </Button>
      </div>
      {error && <p className="text-[12px] text-destructive">{error}</p>}
    </div>
  );
}
