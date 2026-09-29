"use client";

import { useState, useTransition } from "react";
import { crearCaseta, revocarCaseta } from "./settings-actions";

export interface CasetaFila {
  id: string;
  name: string;
  active: boolean;
  created_at: string;
  last_seen_at: string | null;
}

const campo =
  "h-10 min-w-0 flex-1 rounded-lg border border-border bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-cyan";

export function GuardStations({ casetas }: { casetas: CasetaFila[] }) {
  const [pending, start] = useTransition();
  const [enlace, setEnlace] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [error, setError] = useState("");
  const activas = casetas.filter((c) => c.active);

  return (
    <div className="space-y-4">
      <form
        action={(fd) =>
          start(async () => {
            setError("");
            setEnlace(null);
            const r = await crearCaseta(fd);
            if ("error" in r) setError(r.error);
            else setEnlace(r.enlace);
          })
        }
        className="flex flex-wrap gap-2"
      >
        <label htmlFor="nombre-caseta" className="sr-only">
          Nombre de la caseta
        </label>
        <input id="nombre-caseta" name="nombre" required maxLength={60} placeholder="Garita principal" className={campo} />
        <button
          type="submit"
          disabled={pending}
          className="h-10 rounded-lg bg-marine-deep px-4 text-sm font-medium text-frost disabled:opacity-50"
        >
          {pending ? "Creando…" : "Crear caseta"}
        </button>
      </form>

      {error && <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-2.5 text-sm text-destructive">{error}</p>}

      {enlace && (
        <div className="rounded-xl border border-cyan/40 bg-cyan/5 p-4 space-y-2">
          <p className="font-meta text-cyan-ink">ENLACE DE LA CASETA · SE MUESTRA UNA SOLA VEZ</p>
          <p className="text-[13px] text-marine-deep">
            Ábrelo en el teléfono o la tablet de la garita (por WhatsApp o escaneándolo). Ese dispositivo
            queda como caseta por seis meses. No lo compartas con nadie más: quien lo tenga puede
            registrar entradas.
          </p>
          <div className="flex gap-2">
            <input readOnly value={enlace} className={`${campo} font-mono text-[12px]`} onFocus={(e) => e.currentTarget.select()} />
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(enlace);
                  setCopiado(true);
                  setTimeout(() => setCopiado(false), 2000);
                } catch {
                  /* el input queda seleccionable a mano */
                }
              }}
              className="h-10 shrink-0 rounded-lg border border-border px-3 text-sm font-medium text-marine-deep"
            >
              {copiado ? "Copiado" : "Copiar"}
            </button>
          </div>
        </div>
      )}

      {activas.length === 0 ? (
        <p className="text-[13px] text-mute">
          Sin casetas, cualquiera que abra un pase puede marcar la entrada, incluso el propio visitante.
          Crea una para que solo la garita pueda hacerlo.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border">
          {activas.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="text-[14px] font-medium text-marine-deep">{c.name}</p>
                <p className="font-meta text-mute">
                  {c.last_seen_at
                    ? `ÚLTIMO USO ${new Date(c.last_seen_at).toLocaleString("es-VE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).toUpperCase()}`
                    : "TODAVÍA NO SE ABRIÓ"}
                </p>
              </div>
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  if (!confirm(`¿Revocar «${c.name}»? Ese dispositivo deja de poder registrar entradas.`)) return;
                  start(async () => {
                    const r = await revocarCaseta(c.id);
                    if ("error" in r) setError(r.error);
                    else window.location.reload();
                  });
                }}
                className="shrink-0 rounded-lg border border-red-200 px-3 py-1.5 text-[13px] font-medium text-red-600 hover:bg-red-50"
              >
                Revocar
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
