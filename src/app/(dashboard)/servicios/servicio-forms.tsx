"use client";

import { useState, useTransition } from "react";
import { CATEGORIAS_SERVICIO } from "@/lib/servicios";
import { agregarServicio, retirarServicio } from "./actions";

const campo =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-cyan";

export function AgregarServicio() {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");

  return (
    <form
      action={(fd) =>
        start(async () => {
          setError("");
          const r = await agregarServicio(fd);
          if ("error" in r) setError(r.error);
          else window.location.reload();
        })
      }
      className="grid gap-3 md:grid-cols-2"
    >
      <label className="space-y-1.5 text-sm">
        <span className="font-semibold">Categoría</span>
        <select name="category" required defaultValue="" className={campo}>
          <option value="" disabled>
            Elige una
          </option>
          {CATEGORIAS_SERVICIO.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-1.5 text-sm">
        <span className="font-semibold">Nombre</span>
        <input name="name" required maxLength={80} placeholder="Frío Oriente, José Rodríguez…" className={campo} />
      </label>
      <label className="space-y-1.5 text-sm">
        <span className="font-semibold">Teléfono</span>
        <input name="phone" inputMode="tel" maxLength={40} placeholder="0414-000-0000" className={campo} />
      </label>
      <label className="space-y-1.5 text-sm">
        <span className="font-semibold">WhatsApp (si es otro número)</span>
        <input name="whatsapp" inputMode="tel" maxLength={40} className={campo} />
      </label>
      <label className="space-y-1.5 text-sm md:col-span-2">
        <span className="font-semibold">Qué hace bien</span>
        <input name="notes" maxLength={300} placeholder="Mantenimiento de splits, responde el mismo día" className={campo} />
      </label>
      <label className="space-y-1.5 text-sm">
        <span className="font-semibold">Recomendado por</span>
        <input name="recommended_by" maxLength={80} placeholder="Administración · Vecino de Torre B" className={campo} />
      </label>
      <div className="flex items-end">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-marine-deep px-4 py-2 text-sm font-medium text-frost disabled:opacity-50"
        >
          {pending ? "Agregando…" : "Agregar al directorio"}
        </button>
      </div>
      {error && <p className="md:col-span-2 text-sm text-destructive">{error}</p>}
    </form>
  );
}

export function RetirarServicio({ id, nombre }: { id: string; nombre: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm(`¿Quitar a «${nombre}» del directorio?`)) return;
        start(async () => {
          const r = await retirarServicio(id);
          if (!("error" in r)) window.location.reload();
        });
      }}
      className="rounded-lg border border-red-200 px-3 py-2 text-[13px] font-medium text-red-600 hover:bg-red-50"
    >
      {pending ? "Quitando…" : "Quitar"}
    </button>
  );
}
