"use client";

import { useState, useTransition } from "react";
import { entregarPaquete, registrarPaquete } from "./actions";

export interface PaqueteEnGarita {
  id: string;
  description: string;
  carrier: string | null;
  recipient_name: string | null;
  destino: string;
  recibido: string;
}

const campo =
  "h-12 w-full rounded-xl border border-border bg-background px-3 text-base focus-visible:outline-2 focus-visible:outline-cyan";

/** Paquetes en la garita: registrar al llegar, entregar al retirar. */
export function Paquetes({
  paquetes,
  unidades,
}: {
  paquetes: PaqueteEnGarita[];
  unidades: { id: string; etiqueta: string; torre: string | null }[];
}) {
  const [abierto, setAbierto] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [entregando, setEntregando] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const torres = [...new Set(unidades.map((u) => u.torre ?? ""))];

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="font-meta text-mute">PAQUETES POR ENTREGAR · {paquetes.length}</p>
        {!abierto && (
          <button
            type="button"
            onClick={() => {
              setAbierto(true);
              setOk("");
            }}
            className="rounded-xl bg-marine-deep px-4 py-2.5 text-[15px] font-medium text-frost"
          >
            Registrar paquete
          </button>
        )}
      </div>

      {ok && <p className="rounded-xl bg-emerald-50 px-4 py-3 text-[15px] font-medium text-emerald-700">{ok}</p>}

      {abierto && (
        <form
          action={(fd) =>
            start(async () => {
              setError("");
              const r = await registrarPaquete(fd);
              if ("error" in r) {
                setError(r.error);
                return;
              }
              setAbierto(false);
              setOk("Paquete registrado. Ya le avisamos a la unidad.");
            })
          }
          className="space-y-3 rounded-2xl border border-border bg-card p-4"
        >
          <label className="block space-y-1 text-[14px] font-medium text-marine-deep">
            Para qué unidad
            <select name="unit_id" required defaultValue="" className={campo}>
              <option value="" disabled>
                Elige la unidad
              </option>
              {torres.map((t) => (
                <optgroup key={t} label={t || "Unidades"}>
                  {unidades
                    .filter((u) => (u.torre ?? "") === t)
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.etiqueta}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          </label>
          <label className="block space-y-1 text-[14px] font-medium text-marine-deep">
            Qué es
            <input name="description" required maxLength={120} placeholder="Caja de Amazon, sobre, bolsa…" className={campo} />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block space-y-1 text-[14px] font-medium text-marine-deep">
              Empresa (opcional)
              <input name="carrier" maxLength={60} placeholder="MRW, Zoom…" className={campo} />
            </label>
            <label className="block space-y-1 text-[14px] font-medium text-marine-deep">
              A nombre de (opcional)
              <input name="recipient_name" maxLength={80} className={campo} />
            </label>
          </div>
          {error && <p className="text-[14px] text-destructive">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={pending} className="h-12 flex-1 rounded-xl bg-emerald-600 text-[15px] font-semibold text-white disabled:opacity-60">
              {pending ? "Registrando…" : "Registrar y avisar"}
            </button>
            <button type="button" onClick={() => setAbierto(false)} className="h-12 rounded-xl border border-border px-4 text-[15px] text-marine-deep">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {paquetes.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card p-5 text-center text-[14px] text-mute">No hay paquetes esperando.</p>
      ) : (
        <ul className="space-y-2">
          {paquetes.map((p) => (
            <li key={p.id} className="rounded-2xl border border-border bg-card p-4">
              <p className="text-[16px] font-semibold text-marine-deep">{p.destino}</p>
              <p className="text-[14px] text-marine-deep">
                {p.description}
                {p.carrier ? ` · ${p.carrier}` : ""}
                {p.recipient_name ? ` · para ${p.recipient_name}` : ""}
              </p>
              <p className="font-meta text-mute">LLEGÓ {p.recibido.toUpperCase()}</p>
              {entregando === p.id ? (
                <form
                  action={(fd) =>
                    start(async () => {
                      setError("");
                      fd.set("id", p.id);
                      const r = await entregarPaquete(fd);
                      if ("error" in r) setError(r.error);
                      else setEntregando(null);
                    })
                  }
                  className="mt-3 flex gap-2"
                >
                  <input name="delivered_to" required maxLength={80} placeholder="¿Quién lo retira?" className={campo} autoFocus />
                  <button type="submit" disabled={pending} className="h-12 shrink-0 rounded-xl bg-emerald-600 px-4 text-[15px] font-semibold text-white disabled:opacity-60">
                    Entregar
                  </button>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setEntregando(p.id)}
                  className="mt-3 h-12 w-full rounded-xl border border-emerald-600 text-[15px] font-semibold text-emerald-700"
                >
                  Lo vinieron a buscar
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
