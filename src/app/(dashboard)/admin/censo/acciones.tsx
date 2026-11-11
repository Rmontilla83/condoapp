"use client";

import { useState, useTransition } from "react";
import { aprobarDocumentacion, guardarVisibilidadCenso, marcarRecepcion, validarDocumentacion } from "./actions";

const boton = "rounded-lg px-3 py-1.5 text-[13px] font-medium disabled:opacity-50";

export function AccionesCenso({
  unitId,
  estado,
  nota,
  puedeRecibir,
  puedeValidar,
  puedeAprobar,
}: {
  unitId: string;
  estado: string;
  nota: string | null;
  puedeRecibir: boolean;
  puedeValidar: boolean;
  puedeAprobar: boolean;
}) {
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState(nota ?? "");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const hacer = (accion: () => Promise<{ error: string } | { success: true }>) =>
    start(async () => {
      setError("");
      const r = await accion();
      if ("error" in r) setError(r.error);
      else window.location.reload();
    });

  if (!puedeRecibir && !puedeValidar && !(puedeAprobar && estado === "validada")) return null;

  // La Junta aprueba con un toque; no necesita abrir nada.
  if (!puedeRecibir && !puedeValidar) {
    return (
      <div>
        <button type="button" disabled={pending} onClick={() => hacer(() => aprobarDocumentacion(unitId))} className={`${boton} bg-marine-deep text-frost`}>
          {pending ? "Aprobando…" : "Aprobar"}
        </button>
        {error && <p className="mt-1 text-[12px] text-destructive">{error}</p>}
      </div>
    );
  }

  if (!abierto) {
    return (
      <button type="button" onClick={() => setAbierto(true)} className="text-[13px] font-medium text-cyan-ink hover:underline">
        Actualizar
      </button>
    );
  }
  return (
    <div className="min-w-[15rem] space-y-2">
      <input
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        maxLength={300}
        placeholder="Nota: qué entregó o qué falta"
        aria-label="Nota"
        className="h-9 w-full rounded-lg border border-border bg-background px-2 text-[13px]"
      />
      <div className="flex flex-wrap gap-2">
        {puedeRecibir && estado !== "rojo" && (
          <button type="button" disabled={pending} onClick={() => hacer(() => marcarRecepcion(unitId, "rojo", texto))} className={`${boton} border border-border text-marine-deep`}>
            Sin entregar
          </button>
        )}
        {puedeRecibir && (
          <button type="button" disabled={pending} onClick={() => hacer(() => marcarRecepcion(unitId, "naranja", texto))} className={`${boton} border border-border text-marine-deep`}>
            Entrega parcial
          </button>
        )}
        {puedeValidar && estado !== "validada" && estado !== "verde" && (
          <button type="button" disabled={pending} onClick={() => hacer(() => validarDocumentacion(unitId, texto))} className={`${boton} bg-marine-deep text-frost`}>
            Completa y validada
          </button>
        )}
        {puedeAprobar && estado === "validada" && (
          <button type="button" disabled={pending} onClick={() => hacer(() => aprobarDocumentacion(unitId))} className={`${boton} bg-marine-deep text-frost`}>
            Aprobar
          </button>
        )}
        <button type="button" onClick={() => setAbierto(false)} className="text-[13px] text-mute">
          Cancelar
        </button>
      </div>
      {error && <p className="text-[12px] text-destructive">{error}</p>}
    </div>
  );
}

export function AprobarValidadas({ cuantas }: { cuantas: number }) {
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  return (
    <span>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setError("");
            const r = await aprobarDocumentacion(null);
            if ("error" in r) setError(r.error);
            else window.location.reload();
          })
        }
        className={`${boton} bg-marine-deep text-frost`}
      >
        {pending ? "Aprobando…" : `Aprobar las ${cuantas} validadas`}
      </button>
      {error && <span className="mt-1 block text-[12px] text-destructive">{error}</span>}
    </span>
  );
}

export function VisibilidadCenso({ actual, editable }: { actual: string; editable: boolean }) {
  const [valor, setValor] = useState(actual);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  return (
    <div>
      <select
        value={valor}
        disabled={!editable || pending}
        aria-label="Quién ve el censo"
        onChange={(e) => {
          const nuevo = e.target.value;
          const antes = valor;
          setValor(nuevo);
          start(async () => {
            setError("");
            const r = await guardarVisibilidadCenso(nuevo);
            if ("error" in r) {
              setValor(antes);
              setError(r.error);
            } else window.location.reload();
          });
        }}
        className="h-10 w-full max-w-md rounded-lg border border-border bg-background px-3 text-sm disabled:opacity-60"
      >
        <option value="administracion">Solo la administración y la Junta</option>
        <option value="propio">Cada propietario ve el estado de su unidad</option>
        <option value="todos">Cada propietario ve el suyo, y todos ven el avance general</option>
      </select>
      {error && <p className="mt-1 text-[12px] text-destructive">{error}</p>}
    </div>
  );
}
