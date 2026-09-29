"use client";

import { useEffect, useState, useTransition } from "react";
import { createMaintenanceRequest } from "../mantenimiento/actions";
import { MAINTENANCE_CATEGORY_LABELS } from "@/lib/labels";
import type { PropuestaAveria } from "@/lib/conserje/averia";

interface Lugares {
  unidades: { id: string; etiqueta: string }[];
  areas: { id: string; name: string }[];
}

const campo =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-[14px] focus-visible:outline-2 focus-visible:outline-cyan";

/**
 * El reporte que propone el conserje. Nada se envía hasta que el vecino toca
 * "Enviar reporte": usa la misma acción, y las mismas validaciones, que la
 * sección Mantenimiento.
 */
export function ReporteAveria({
  propuesta,
  alEnviar,
}: {
  propuesta: PropuestaAveria;
  alEnviar: (titulo: string) => void;
}) {
  const [lugares, setLugares] = useState<Lugares | null>(null);
  const [error, setError] = useState("");
  const [descartado, setDescartado] = useState(false);
  const [pending, start] = useTransition();

  useEffect(() => {
    let vivo = true;
    fetch("/api/conserje/lugares")
      .then((r) => r.json())
      .then((d: Lugares) => vivo && setLugares(d))
      .catch(() => vivo && setLugares({ unidades: [], areas: [] }));
    return () => {
      vivo = false;
    };
  }, []);

  if (descartado) return null;

  const lugarInicial =
    propuesta.lugar === "area_comun" ? "general" : lugares?.unidades[0] ? `u:${lugares.unidades[0].id}` : "general";

  return (
    <form
      action={(fd) =>
        start(async () => {
          setError("");
          const lugar = String(fd.get("lugar") ?? "general");
          fd.delete("lugar");
          if (lugar.startsWith("u:")) fd.set("unit_id", lugar.slice(2));
          else if (lugar.startsWith("a:")) fd.set("common_area_id", lugar.slice(2));
          else fd.set("general", "1");
          fd.set("priority", "medium");
          const r = await createMaintenanceRequest(fd);
          if ("error" in r && r.error) {
            setError(r.error);
            return;
          }
          alEnviar(String(fd.get("title") ?? propuesta.titulo));
        })
      }
      className="ml-0 mr-6 space-y-2.5 rounded-2xl border border-cyan/40 bg-cyan/5 p-3.5"
    >
      <p className="text-[13px] font-semibold text-marine-deep">Reporte para la administración</p>
      <label className="block space-y-1 text-[12px] text-mute">
        Qué pasa
        <input name="title" required maxLength={80} defaultValue={propuesta.titulo} className={campo} />
      </label>
      <label className="block space-y-1 text-[12px] text-mute">
        Detalle
        <textarea name="description" required rows={2} maxLength={1000} defaultValue={propuesta.descripcion} className={campo} />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="block space-y-1 text-[12px] text-mute">
          Tipo
          <select name="category" defaultValue={propuesta.categoria} className={campo}>
            {Object.entries(MAINTENANCE_CATEGORY_LABELS).map(([id, n]) => (
              <option key={id} value={id}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1 text-[12px] text-mute">
          Dónde
          {lugares ? (
            <select name="lugar" defaultValue={lugarInicial} className={campo}>
              {lugares.unidades.map((u) => (
                <option key={u.id} value={`u:${u.id}`}>
                  {u.etiqueta}
                </option>
              ))}
              <option value="general">Área común (pasillo, ascensor…)</option>
              {lugares.areas.map((a) => (
                <option key={a.id} value={`a:${a.id}`}>
                  {a.name}
                </option>
              ))}
            </select>
          ) : (
            <span className="block py-2 text-[13px]">Cargando…</span>
          )}
        </label>
      </div>
      <label className="block space-y-1 text-[12px] text-mute">
        Foto (opcional)
        <input name="photos" type="file" accept="image/*" capture="environment" className="block w-full text-[12px]" />
      </label>
      {error && <p className="text-[13px] text-destructive">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending || !lugares}
          className="rounded-lg bg-marine-deep px-3.5 py-2 text-[13px] font-medium text-frost disabled:opacity-50"
        >
          {pending ? "Enviando…" : "Enviar reporte"}
        </button>
        <button
          type="button"
          onClick={() => setDescartado(true)}
          className="rounded-lg border border-border px-3.5 py-2 text-[13px] text-marine-deep"
        >
          No hace falta
        </button>
      </div>
    </form>
  );
}
