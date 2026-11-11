"use client";

import { useState, useTransition } from "react";
import { archivarTarea, guardarTarea } from "./actions";

const campo = "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-cyan";

export interface TareaEditable {
  id: string;
  titulo: string;
  detalle: string | null;
  estado: string;
  responsable: string | null;
  fecha_objetivo: string | null;
  visible_vecinos: boolean;
}

export function FormularioTarea({ tarea, alTerminar }: { tarea?: TareaEditable; alTerminar?: () => void }) {
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  return (
    <form
      action={(fd) =>
        start(async () => {
          setError("");
          const r = await guardarTarea(fd);
          if ("error" in r) setError(r.error);
          else window.location.reload();
        })
      }
      className="space-y-3"
    >
      {tarea && <input type="hidden" name="id" value={tarea.id} />}
      <label className="block text-[13px] text-marine-deep">
        Tarea u objetivo
        <input name="titulo" required minLength={3} maxLength={150} defaultValue={tarea?.titulo ?? ""} placeholder="Registrar el acta de la asamblea de octubre" className={`${campo} mt-1`} />
      </label>
      <label className="block text-[13px] text-marine-deep">
        Detalle (opcional)
        <textarea name="detalle" maxLength={1000} rows={2} defaultValue={tarea?.detalle ?? ""} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
      </label>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-[13px] text-marine-deep">
          Estado
          <select name="estado" defaultValue={tarea?.estado ?? "pendiente"} className={`${campo} mt-1`}>
            <option value="pendiente">Pendiente</option>
            <option value="en_curso">En curso</option>
            <option value="hecha">Hecha</option>
          </select>
        </label>
        <label className="text-[13px] text-marine-deep">
          Responsable (opcional)
          <input name="responsable" maxLength={120} defaultValue={tarea?.responsable ?? ""} className={`${campo} mt-1`} />
        </label>
        <label className="text-[13px] text-marine-deep">
          Fecha objetivo (opcional)
          <input name="fecha_objetivo" type="date" defaultValue={tarea?.fecha_objetivo ?? ""} className={`${campo} mt-1`} />
        </label>
      </div>
      <label className="flex cursor-pointer items-start gap-2 text-[14px] text-marine-deep">
        <input type="checkbox" name="visible_vecinos" defaultChecked={tarea?.visible_vecinos ?? false} className="mt-0.5 h-4 w-4 cursor-pointer" />
        <span>
          Mostrarla a los vecinos
          <span className="block text-[12px] text-mute">Aparece en la sección Documentos de cada vecino, con su estado. Sin marcar, solo la ve la administración.</span>
        </span>
      </label>
      {error && <p className="text-[13px] text-destructive">{error}</p>}
      <div className="flex gap-3">
        <button type="submit" disabled={pending} className="rounded-lg bg-marine-deep px-4 py-2 text-sm font-medium text-frost disabled:opacity-50">
          {pending ? "Guardando…" : tarea ? "Guardar cambios" : "Agregar"}
        </button>
        {alTerminar && (
          <button type="button" onClick={alTerminar} className="text-[13px] text-mute">
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}

export function EditarTarea({ tarea }: { tarea: TareaEditable }) {
  const [abierto, setAbierto] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  if (abierto) {
    return (
      <div className="mt-3 rounded-xl border border-border p-3">
        <FormularioTarea tarea={tarea} alTerminar={() => setAbierto(false)} />
      </div>
    );
  }
  return (
    <div className="mt-2 flex gap-4 text-[13px]">
      <button type="button" onClick={() => setAbierto(true)} className="font-medium text-cyan-ink hover:underline">
        Editar
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await archivarTarea(tarea.id);
            if ("error" in r) setError(r.error);
            else window.location.reload();
          })
        }
        className="text-mute hover:text-destructive hover:underline disabled:opacity-50"
      >
        Archivar
      </button>
      {error && <span className="text-destructive">{error}</span>}
    </div>
  );
}
