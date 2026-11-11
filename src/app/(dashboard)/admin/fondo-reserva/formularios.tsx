"use client";

import { useState, useTransition } from "react";
import { anularMovimientoFondo, guardarConfigFondo, registrarMovimientoFondo } from "./actions";

const campo =
  "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-cyan";
const boton = "rounded-lg bg-marine-deep px-4 py-2 text-sm font-medium text-frost disabled:opacity-50";

export function ConfigFondo({ fondo, pct, acta }: { fondo: string; pct: number | null; acta: string | null }) {
  const [valor, setValor] = useState(pct === null ? "" : String(pct).replace(".", ","));
  const [texto, setTexto] = useState(acta ?? "");
  const [aviso, setAviso] = useState<{ ok: boolean; msg: string } | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const limpio = valor.trim().replace(",", ".");
        const n = limpio === "" ? null : Number(limpio);
        if (n !== null && !Number.isFinite(n)) return setAviso({ ok: false, msg: "Escribe un número, por ejemplo 10." });
        start(async () => {
          const r = await guardarConfigFondo(fondo, n, texto);
          setAviso("error" in r ? { ok: false, msg: r.error } : { ok: true, msg: "Guardado." });
        });
      }}
      className="space-y-3"
    >
      <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
        <label className="text-[13px] text-marine-deep">
          Aporte sobre la cuota (%)
          <input value={valor} onChange={(e) => setValor(e.target.value)} inputMode="decimal" placeholder="10" className={`${campo} mt-1 text-right tabular-nums`} />
        </label>
        <label className="text-[13px] text-marine-deep">
          Acta o artículo que lo aprueba
          <input value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={200} placeholder="Asamblea del 15/03/2026" className={`${campo} mt-1`} />
        </label>
      </div>
      <p className="text-[12px] text-mute">
        Al emitir una cuota mensual, este porcentaje se suma al monto y queda separado en el recibo. No cambia las cuotas ya emitidas. Déjalo vacío si el condominio no aporta por cuota.
      </p>
      {aviso && <p className={`text-[13px] ${aviso.ok ? "text-emerald-700" : "text-destructive"}`}>{aviso.msg}</p>}
      <button type="submit" disabled={pending} className={boton}>
        {pending ? "Guardando…" : "Guardar"}
      </button>
    </form>
  );
}

export function NuevoMovimiento({ fondo, hoy, tieneInicial }: { fondo: string; hoy: string; tieneInicial: boolean }) {
  const [kind, setKind] = useState(tieneInicial ? "contribution" : "opening");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const ayuda: Record<string, string> = {
    opening: "Lo que había en el fondo el día de corte, al empezar con Atryum. Se carga una sola vez.",
    contribution: "Dinero que entra al fondo sin venir de una cuota, como intereses del banco.",
    adjustment: "Corrige el saldo sin que entre ni salga dinero. Usa un monto negativo para restar.",
  };

  return (
    <form
      action={(fd) =>
        start(async () => {
          setError("");
          const r = await registrarMovimientoFondo(fd);
          if ("error" in r) setError(r.error);
          else window.location.reload();
        })
      }
      className="space-y-3"
    >
      <input type="hidden" name="fund" value={fondo} />
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-[13px] text-marine-deep">
          Tipo
          <select name="kind" value={kind} onChange={(e) => setKind(e.target.value)} className={`${campo} mt-1`}>
            {!tieneInicial && <option value="opening">Saldo inicial</option>}
            <option value="contribution">Aporte adicional</option>
            <option value="adjustment">Ajuste</option>
          </select>
        </label>
        <label className="text-[13px] text-marine-deep">
          Fecha
          <input name="movement_date" type="date" required max={hoy} defaultValue={hoy} className={`${campo} mt-1`} />
        </label>
        <label className="text-[13px] text-marine-deep">
          Monto (USD)
          <input name="amount" inputMode="decimal" required placeholder="0,00" className={`${campo} mt-1 text-right tabular-nums`} />
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-[13px] text-marine-deep">
          Concepto
          <input name="concept" required maxLength={200} defaultValue="" placeholder={kind === "opening" ? "Saldo del fondo al día de corte" : "Intereses del banco de octubre"} className={`${campo} mt-1`} />
        </label>
        <label className="text-[13px] text-marine-deep">
          Soporte o acta (opcional)
          <input name="reference" maxLength={200} className={`${campo} mt-1`} />
        </label>
      </div>
      <p className="text-[12px] text-mute">{ayuda[kind]}</p>
      {error && <p className="text-[13px] text-destructive">{error}</p>}
      <button type="submit" disabled={pending} className={boton}>
        {pending ? "Guardando…" : "Registrar"}
      </button>
    </form>
  );
}

export function AnularMovimiento({ id }: { id: string }) {
  const [abierto, setAbierto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  if (!abierto) {
    return (
      <button type="button" onClick={() => setAbierto(true)} className="text-[12px] text-destructive hover:underline">
        Anular
      </button>
    );
  }
  return (
    <div className="mt-2 space-y-2">
      <input
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
        placeholder="Motivo de la anulación"
        className="h-9 w-full rounded-lg border border-border bg-background px-2 text-[13px]"
        aria-label="Motivo de la anulación"
      />
      {error && <p className="text-[12px] text-destructive">{error}</p>}
      <div className="flex gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await anularMovimientoFondo(id, motivo);
              if ("error" in r) setError(r.error);
              else window.location.reload();
            })
          }
          className="text-[12px] font-medium text-destructive disabled:opacity-50"
        >
          {pending ? "Anulando…" : "Confirmar anulación"}
        </button>
        <button type="button" onClick={() => setAbierto(false)} className="text-[12px] text-mute">
          Cancelar
        </button>
      </div>
    </div>
  );
}
