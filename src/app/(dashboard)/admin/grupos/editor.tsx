"use client";

import { useMemo, useState, useTransition } from "react";
import { archivarGrupo, crearGrupo, guardarMiembros } from "./actions";

interface Unidad {
  id: string;
  etiqueta: string;
  torre: string | null;
}
interface Grupo {
  id: string;
  name: string;
  description: string | null;
  weights: Record<string, number>;
}

const campo = "rounded-lg border border-border bg-background px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-cyan";

/** Crear grupos y marcar qué unidades pagan y con qué peso. */
export function EditorGrupos({ grupos, unidades }: { grupos: Grupo[]; unidades: Unidad[] }) {
  const [sel, setSel] = useState(grupos[0]?.id ?? "");
  const grupo = grupos.find((g) => g.id === sel);
  const [pesos, setPesos] = useState<Record<string, string>>(() =>
    Object.fromEntries(Object.entries(grupo?.weights ?? {}).map(([k, v]) => [k, String(v)])),
  );
  const [torre, setTorre] = useState("");
  const [aviso, setAviso] = useState<{ ok: boolean; msg: string } | null>(null);
  const [pending, start] = useTransition();

  const torres = useMemo(() => [...new Set(unidades.map((u) => u.torre ?? ""))], [unidades]);
  const visibles = unidades.filter((u) => !torre || (u.torre ?? "") === torre);
  const miembros = Object.entries(pesos).filter(([, v]) => Number(v) > 0);
  const suma = miembros.reduce((s, [, v]) => s + Number(v), 0);

  function elegir(id: string) {
    setSel(id);
    const g = grupos.find((x) => x.id === id);
    setPesos(Object.fromEntries(Object.entries(g?.weights ?? {}).map(([k, v]) => [k, String(v)])));
    setAviso(null);
  }

  return (
    <div className="space-y-6">
      <form
        action={(fd) =>
          start(async () => {
            const r = await crearGrupo(fd);
            if ("error" in r) setAviso({ ok: false, msg: r.error });
            else window.location.reload();
          })
        }
        className="flex flex-wrap gap-2"
      >
        <input name="name" required maxLength={60} placeholder="Nuevo grupo: Marina, Estacionamiento techado…" className={`${campo} min-w-[16rem] flex-1`} />
        <button type="submit" disabled={pending} className="rounded-lg bg-marine-deep px-4 py-2 text-sm font-medium text-frost disabled:opacity-50">
          Crear grupo
        </button>
      </form>

      {grupos.length === 0 ? (
        <p className="text-[14px] text-mute">Todavía no hay grupos.</p>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {grupos.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => elegir(g.id)}
                className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium ${sel === g.id ? "bg-marine-deep text-frost" : "border border-border text-marine-deep"}`}
              >
                {g.name}
              </button>
            ))}
          </div>

          {grupo && (
            <div className="space-y-3 rounded-2xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-[15px] font-semibold text-marine-deep">
                  {grupo.name} · {miembros.length} unidad{miembros.length !== 1 ? "es" : ""}
                </p>
                <p className="text-[13px] text-mute">
                  El peso es la proporción de cada unidad: puede ser su cuota de referencia, sus metros o un 1 para partes iguales.
                </p>
              </div>
              <div className="flex flex-wrap gap-1">
                {["", ...torres.filter(Boolean)].map((t) => (
                  <button
                    key={t || "todas"}
                    type="button"
                    onClick={() => setTorre(t)}
                    className={`rounded-full px-3 py-1 text-[12px] ${torre === t ? "bg-marine-deep text-frost" : "border border-border text-marine-deep/70"}`}
                  >
                    {t || "Todas"}
                  </button>
                ))}
              </div>
              <ul className="grid max-h-[28rem] gap-x-4 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
                {visibles.map((u) => {
                  const v = pesos[u.id] ?? "";
                  const activo = Number(v) > 0;
                  return (
                    <li key={u.id} className="flex items-center gap-2 border-b border-border py-1.5">
                      <input
                        type="checkbox"
                        checked={activo}
                        onChange={(e) => setPesos((p) => ({ ...p, [u.id]: e.target.checked ? p[u.id] && Number(p[u.id]) > 0 ? p[u.id] : "1" : "" }))}
                        className="h-4 w-4"
                        aria-label={`${u.etiqueta} en el grupo`}
                      />
                      <span className={`flex-1 text-[13px] ${activo ? "text-marine-deep" : "text-mute"}`}>{u.etiqueta}</span>
                      <input
                        inputMode="decimal"
                        value={v}
                        onChange={(e) => setPesos((p) => ({ ...p, [u.id]: e.target.value.replace(",", ".") }))}
                        placeholder="—"
                        className="w-20 rounded-md border border-border px-2 py-1 text-right text-[13px] tabular-nums"
                        aria-label={`Peso de ${u.etiqueta}`}
                      />
                    </li>
                  );
                })}
              </ul>
              {aviso && (
                <p className={`rounded-lg px-3 py-2 text-[13px] ${aviso.ok ? "bg-emerald-50 text-emerald-800" : "bg-destructive/5 text-destructive"}`}>{aviso.msg}</p>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    start(async () => {
                      const limpio = Object.fromEntries(miembros.map(([k, v]) => [k, Number(v)]));
                      const r = await guardarMiembros(grupo.id, JSON.stringify(limpio));
                      setAviso("error" in r ? { ok: false, msg: r.error } : { ok: true, msg: "Grupo guardado." });
                    })
                  }
                  className="rounded-lg bg-marine-deep px-4 py-2 text-sm font-medium text-frost disabled:opacity-50"
                >
                  {pending ? "Guardando…" : "Guardar miembros"}
                </button>
                <span className="text-[12px] text-mute tabular-nums">Suma de pesos: {suma.toLocaleString("es-VE", { maximumFractionDigits: 4 })}</span>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    if (!confirm(`¿Archivar el grupo «${grupo.name}»? Las cuotas ya emitidas no cambian.`)) return;
                    start(async () => {
                      const r = await archivarGrupo(grupo.id);
                      if ("error" in r) setAviso({ ok: false, msg: r.error });
                      else window.location.reload();
                    });
                  }}
                  className="ml-auto rounded-lg border border-red-200 px-3 py-2 text-[13px] text-red-600"
                >
                  Archivar grupo
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
