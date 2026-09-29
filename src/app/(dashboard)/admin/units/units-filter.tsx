"use client";

import { useMemo, useState, type ReactNode } from "react";

export interface FilaUnidad {
  id: string;
  torre: string | null;
  /** Texto en minúsculas con apartamento, propietario e inquilino, para buscar. */
  busqueda: string;
  fila: ReactNode;
}

const TODAS = "__todas__";

/**
 * Filtro de la lista de unidades. Las filas las arma el servidor (con el diálogo
 * de gestión adentro); acá solo se decide cuáles se muestran.
 */
export function UnitsFilter({ filas }: { filas: FilaUnidad[] }) {
  const [torre, setTorre] = useState(TODAS);
  const [q, setQ] = useState("");

  const torres = useMemo(
    () => [...new Set(filas.map((f) => f.torre).filter(Boolean) as string[])],
    [filas],
  );

  const visibles = useMemo(() => {
    const t = q.trim().toLowerCase();
    return filas.filter(
      (f) => (torre === TODAS || f.torre === torre) && (!t || f.busqueda.includes(t)),
    );
  }, [filas, torre, q]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {torres.length > 1 && (
          <div className="flex flex-wrap gap-1" role="group" aria-label="Filtrar por torre">
            {[TODAS, ...torres].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTorre(t)}
                aria-pressed={torre === t}
                className={`rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors ${
                  torre === t
                    ? "bg-marine-deep text-frost"
                    : "border border-border text-marine-deep/70 hover:border-marine/40"
                }`}
              >
                {t === TODAS ? `Todas · ${filas.length}` : t}
              </button>
            ))}
          </div>
        )}
        <label className="sr-only" htmlFor="buscar-unidad">
          Buscar por apartamento o nombre
        </label>
        <input
          id="buscar-unidad"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar apto, propietario o inquilino…"
          className="h-9 min-w-[12rem] flex-1 rounded-lg border border-border bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-cyan"
        />
      </div>

      <p className="text-[12px] text-mute" aria-live="polite">
        {visibles.length === filas.length
          ? `${filas.length} unidades`
          : `${visibles.length} de ${filas.length} unidades`}
      </p>

      {visibles.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card py-10 text-center text-[14px] text-mute">
          Ninguna unidad coincide con la búsqueda.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
          {visibles.map((f) => (
            <li key={f.id}>{f.fila}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
