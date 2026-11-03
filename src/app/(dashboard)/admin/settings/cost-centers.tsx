"use client";

import { useState, useTransition } from "react";
import { cambiarEstadoCentroDeCosto, crearCentroDeCosto, renombrarCentroDeCosto } from "./cost-centers-actions";

export interface CentroFila {
  id: string;
  name: string;
  active: boolean;
}

const campo =
  "h-10 min-w-0 flex-1 rounded-lg border border-border bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-cyan";

export function CostCenters({ centros }: { centros: CentroFila[] }) {
  const [nuevo, setNuevo] = useState("");
  const [editando, setEditando] = useState<string | null>(null);
  const [texto, setTexto] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function correr(accion: () => Promise<{ error: string } | { success: true }>) {
    start(async () => {
      setError("");
      const r = await accion();
      if ("error" in r) setError(r.error);
      else window.location.reload();
    });
  }

  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          correr(() => crearCentroDeCosto(nuevo));
        }}
        className="flex flex-wrap gap-2"
      >
        <input
          value={nuevo}
          onChange={(e) => setNuevo(e.target.value)}
          maxLength={60}
          placeholder="Nuevo centro: Piscina, Marina, Torre A…"
          aria-label="Nombre del nuevo centro de costo"
          className={campo}
        />
        <button type="submit" disabled={pending} className="rounded-lg bg-marine-deep px-4 py-2 text-sm font-medium text-frost disabled:opacity-50">
          Agregar
        </button>
      </form>

      {error && <p className="text-[13px] text-destructive">{error}</p>}

      {centros.length === 0 ? (
        <p className="text-[14px] text-mute">Todavía no hay centros de costo. Mientras no agregues ninguno, los gastos no lo piden.</p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border">
          {centros.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center gap-2 px-3 py-2">
              {editando === c.id ? (
                <>
                  <input value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={60} aria-label={`Nuevo nombre de ${c.name}`} className={campo} autoFocus />
                  <button type="button" disabled={pending} onClick={() => correr(() => renombrarCentroDeCosto(c.id, texto))} className="text-[13px] font-medium text-marine-deep disabled:opacity-50">
                    Guardar
                  </button>
                  <button type="button" onClick={() => setEditando(null)} className="text-[13px] text-mute">
                    Cancelar
                  </button>
                </>
              ) : (
                <>
                  <span className={`flex-1 text-[14px] ${c.active ? "text-marine-deep" : "text-mute line-through"}`}>{c.name}</span>
                  {!c.active && <span className="font-meta text-mute">RETIRADO</span>}
                  <button
                    type="button"
                    onClick={() => {
                      setEditando(c.id);
                      setTexto(c.name);
                    }}
                    className="text-[13px] text-cyan-ink hover:underline"
                  >
                    Cambiar nombre
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => correr(() => cambiarEstadoCentroDeCosto(c.id, !c.active))}
                    className="text-[13px] text-mute hover:underline disabled:opacity-50"
                  >
                    {c.active ? "Retirar" : "Reactivar"}
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
