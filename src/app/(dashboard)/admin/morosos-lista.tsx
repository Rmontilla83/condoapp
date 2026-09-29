"use client";

import { useState, useTransition } from "react";
import { usd } from "@/lib/format";
import { enlaceWhatsApp } from "@/lib/servicios";
import { recordarMorosos } from "./recordatorios-actions";

export interface Moroso {
  id: string;
  unit: string;
  total: number;
  count: number;
  oldest: string;
  nombre: string | null;
  telefono: string | null;
}

/**
 * Morosos con sus recordatorios. WhatsApp abre el chat con el mensaje escrito:
 * lo envía la administración desde su teléfono (sin la API de WhatsApp
 * Business no se puede automatizar). "Avisar" deja el recordatorio en la
 * campana del vecino y le escribe al correo si lo tiene.
 */
export function MorososLista({ morosos, condominio }: { morosos: Moroso[]; condominio: string }) {
  const [pending, start] = useTransition();
  const [aviso, setAviso] = useState<string | null>(null);
  const [avisadas, setAvisadas] = useState<Set<string>>(new Set());

  function mensaje(m: Moroso) {
    const nombre = m.nombre?.split(" ")[0];
    return (
      `Hola${nombre ? ` ${nombre}` : ""}, te escribe la administración de ${condominio}. ` +
      `El Apto ${m.unit} tiene ${m.count === 1 ? "una cuota pendiente" : `${m.count} cuotas pendientes`} por ${usd(m.total)}. ` +
      `Puedes ver el detalle y reportar tu pago en https://portal.atryum.net/pagos. Si ya pagaste, ignora este mensaje. ¡Gracias!`
    );
  }

  function avisar(unitId?: string) {
    start(async () => {
      setAviso(null);
      const r = await recordarMorosos(unitId);
      if ("error" in r) {
        setAviso(r.error);
        return;
      }
      setAvisadas((prev) => new Set([...prev, ...(unitId ? [unitId] : morosos.map((m) => m.id))]));
      setAviso(
        r.avisados === 0
          ? "Ya tenían el recordatorio de hoy."
          : `Recordatorio enviado a ${r.avisados} persona${r.avisados !== 1 ? "s" : ""} de ${r.unidades} unidad${r.unidades !== 1 ? "es" : ""}.`,
      );
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13px] text-mute">
          {morosos.length} unidad{morosos.length !== 1 ? "es" : ""} con cuotas vencidas
        </p>
        <button
          type="button"
          onClick={() => avisar()}
          disabled={pending}
          className="rounded-lg bg-marine-deep px-3.5 py-2 text-[13px] font-medium text-frost disabled:opacity-50"
        >
          {pending ? "Enviando…" : "Recordar a todos"}
        </button>
      </div>
      {aviso && <p className="rounded-lg bg-cyan/10 px-3 py-2 text-[13px] text-cyan-ink">{aviso}</p>}

      <div className="max-h-[34rem] overflow-y-auto pr-1">
        {morosos.map((m) => {
          const wa = enlaceWhatsApp(m.telefono);
          return (
            <div key={m.id} className="border-b border-border py-3 last:border-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[14px] font-medium text-marine-deep">Apto {m.unit}</p>
                  <p className="truncate text-[12px] text-mute">
                    {m.nombre ?? "Sin propietario cargado"} · {m.count} cuota{m.count > 1 ? "s" : ""} desde{" "}
                    {new Date(`${m.oldest}T12:00:00Z`).toLocaleDateString("es-VE", { month: "short", year: "numeric", timeZone: "UTC" })}
                  </p>
                </div>
                <span className="shrink-0 text-[14px] font-medium tabular-nums text-destructive">{usd(m.total)}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {wa ? (
                  <a
                    href={`${wa}?text=${encodeURIComponent(mensaje(m))}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-[12px] font-medium text-white hover:bg-emerald-700"
                  >
                    WhatsApp
                  </a>
                ) : (
                  <span className="rounded-lg border border-border px-3 py-1.5 text-[12px] text-mute" title="Carga el teléfono del propietario en Unidades">
                    Sin teléfono
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => avisar(m.id)}
                  disabled={pending || avisadas.has(m.id)}
                  className="rounded-lg border border-border px-3 py-1.5 text-[12px] font-medium text-marine-deep disabled:opacity-50"
                >
                  {avisadas.has(m.id) ? "Avisado" : "Avisar en la app"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between border-t border-border pt-4">
        <span className="font-meta text-mute">TOTAL POR COBRAR</span>
        <span className="font-display text-[20px] tabular-nums text-destructive">
          {usd(morosos.reduce((s, m) => s + m.total, 0))}
        </span>
      </div>
    </div>
  );
}
