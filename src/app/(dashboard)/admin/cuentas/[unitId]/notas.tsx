"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { agregarNota, retirarNota } from "./notas-actions";

export interface NotaDeUnidad {
  id: string;
  texto: string;
  autor: string;
  fecha: string;
  puedeRetirar: boolean;
}

/** Notas internas: lo que la administración necesita recordar de la unidad. El vecino nunca las ve. */
export function NotasDeLaUnidad({ unitId, notas, puedeEscribir }: { unitId: string; notas: NotaDeUnidad[]; puedeEscribir: boolean }) {
  const [texto, setTexto] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const guardar = () =>
    start(async () => {
      setError(null);
      const r = await agregarNota(unitId, texto);
      if ("error" in r) setError(r.error);
      else window.location.reload();
    });

  const retirar = (id: string) => {
    if (!confirm("¿Retirar esta nota? Deja de verse en la ficha.")) return;
    start(async () => {
      setError(null);
      const r = await retirarNota(id);
      if ("error" in r) setError(r.error);
      else window.location.reload();
    });
  };

  return (
    <div className="space-y-4">
      {puedeEscribir && (
        <div className="space-y-2">
          <label htmlFor="nota-nueva" className="sr-only">
            Nota nueva
          </label>
          <textarea
            id="nota-nueva"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            maxLength={2000}
            rows={3}
            placeholder="Por ejemplo: paga siempre los días 15; el dueño vive fuera y atiende su hija."
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[15px] md:text-[14px]"
          />
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm" onClick={guardar} disabled={pending || texto.trim().length < 2}>
              {pending ? "Guardando..." : "Guardar nota"}
            </Button>
            {error && <p className="text-[13px] text-destructive">{error}</p>}
          </div>
        </div>
      )}

      {notas.length === 0 ? (
        <p className="text-[14px] text-mute">Todavía no hay notas sobre esta unidad.</p>
      ) : (
        <ul className="divide-y divide-border">
          {notas.map((n) => (
            <li key={n.id} className="py-3 first:pt-0 last:pb-0">
              <p className="whitespace-pre-line text-[14px] text-marine-deep">{n.texto}</p>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 text-[12px] text-mute">
                <span>
                  {n.autor}, {n.fecha}
                </span>
                {n.puedeRetirar && (
                  <button type="button" onClick={() => retirar(n.id)} disabled={pending} className="font-medium text-cyan-ink hover:underline disabled:opacity-50">
                    Retirar
                  </button>
                )}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
