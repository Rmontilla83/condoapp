"use client";

import { useState, useTransition } from "react";
import { registrarSaldo } from "./actions";

const campo =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-cyan";

export function SaldoForm({ unidades }: { unidades: { id: string; etiqueta: string }[] }) {
  const [pending, startTransition] = useTransition();
  const [aviso, setAviso] = useState<{ ok: boolean; msg: string } | null>(null);

  return (
    <form
      action={(fd) =>
        startTransition(async () => {
          const r = await registrarSaldo(fd);
          if ("error" in r) {
            setAviso({ ok: false, msg: r.error });
            return;
          }
          setAviso({
            ok: true,
            msg:
              r.aplicadas > 0
                ? `Registrado. Se aplicó a ${r.aplicadas} cuota${r.aplicadas !== 1 ? "s" : ""} pendiente${r.aplicadas !== 1 ? "s" : ""}.`
                : "Registrado.",
          });
          window.location.reload();
        })
      }
      className="space-y-4"
    >
      {aviso && (
        <div
          className={`rounded-lg border p-2.5 text-sm ${
            aviso.ok
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-destructive/30 bg-destructive/5 text-destructive"
          }`}
        >
          {aviso.msg}
        </div>
      )}
      <label className="block space-y-1.5 text-sm">
        <span className="font-semibold">Unidad</span>
        <select name="unit_id" required defaultValue="" className={campo}>
          <option value="" disabled>
            Elige una unidad
          </option>
          {unidades.map((u) => (
            <option key={u.id} value={u.id}>
              {u.etiqueta}
            </option>
          ))}
        </select>
      </label>
      <fieldset className="space-y-1.5 text-sm">
        <legend className="font-semibold mb-1.5">Movimiento</legend>
        <div className="flex gap-4">
          <label className="flex items-center gap-2">
            <input type="radio" name="tipo" value="deposito" defaultChecked /> Saldo a favor
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="tipo" value="correccion" /> Corregir (restar)
          </label>
        </div>
      </fieldset>
      <label className="block space-y-1.5 text-sm">
        <span className="font-semibold">Monto (USD)</span>
        <input name="monto" inputMode="decimal" required placeholder="0,00" className={campo} />
      </label>
      <label className="block space-y-1.5 text-sm">
        <span className="font-semibold">Motivo</span>
        <input
          name="nota"
          required
          minLength={4}
          maxLength={300}
          placeholder="Pagó de más en agosto · Saldo de apertura"
          className={campo}
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-marine-deep text-frost px-4 py-2 text-sm font-medium disabled:opacity-50"
      >
        {pending ? "Guardando…" : "Registrar"}
      </button>
    </form>
  );
}
