"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { archivarDocumento, cambiarVisibilidad, prepararSubida, registrarVersion, revisarVersion } from "./actions";

const campo = "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-cyan";
const boton = "rounded-lg bg-marine-deep px-4 py-2 text-sm font-medium text-frost disabled:opacity-50";
const BUCKET = "condo-documents";
const MAXIMO = 40 * 1024 * 1024;

type Opcion = { valor: string; nombre: string };

/** Sube el archivo directo al almacenamiento y luego registra la versión. */
async function subir(archivo: File, datos: Omit<Parameters<typeof registrarVersion>[0], "path" | "archivoNombre">): Promise<string | null> {
  if (archivo.size > MAXIMO) return "El archivo debe pesar menos de 40 MB.";
  const previa = await prepararSubida({ nombre: archivo.name, tipo: archivo.type, tamano: archivo.size });
  if ("error" in previa) return previa.error;
  const { error } = await createClient().storage.from(BUCKET).uploadToSignedUrl(previa.path, previa.token, archivo, { contentType: archivo.type });
  if (error) return `No se pudo subir el archivo: ${error.message}`;
  const r = await registrarVersion({ ...datos, path: previa.path, archivoNombre: archivo.name });
  return "error" in r ? r.error : null;
}

export function NuevoDocumento({ categorias, visibilidades, puedeElegirVisibilidad }: { categorias: Opcion[]; visibilidades: Opcion[]; puedeElegirVisibilidad: boolean }) {
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const archivo = fd.get("archivo") as File | null;
        if (!archivo || archivo.size === 0) return setError("Elige el archivo.");
        setError("");
        start(async () => {
          const fallo = await subir(archivo, {
            documentoId: null,
            titulo: String(fd.get("titulo") ?? ""),
            categoria: String(fd.get("categoria") ?? ""),
            descripcion: String(fd.get("descripcion") ?? ""),
            visiblePara: String(fd.get("visible_para") ?? "administracion"),
            nota: String(fd.get("nota") ?? ""),
          });
          if (fallo) setError(fallo);
          else window.location.reload();
        });
      }}
      className="space-y-3"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-[13px] text-marine-deep">
          Título
          <input name="titulo" required minLength={3} maxLength={150} placeholder="Reglamento del Edificio B" className={`${campo} mt-1`} />
        </label>
        <label className="text-[13px] text-marine-deep">
          Tipo
          <select name="categoria" required defaultValue="" className={`${campo} mt-1`}>
            <option value="" disabled>
              Elige
            </option>
            {categorias.map((c) => (
              <option key={c.valor} value={c.valor}>
                {c.nombre}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="block text-[13px] text-marine-deep">
        De qué trata (opcional)
        <input name="descripcion" maxLength={500} className={`${campo} mt-1`} />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-[13px] text-marine-deep">
          Archivo (PDF, JPG o PNG, hasta 40 MB)
          <input name="archivo" type="file" required accept="application/pdf,image/jpeg,image/png" className="mt-1 block w-full text-[13px]" />
        </label>
        <label className="text-[13px] text-marine-deep">
          Quién lo verá cuando se publique
          <select name="visible_para" defaultValue="administracion" disabled={!puedeElegirVisibilidad} className={`${campo} mt-1 disabled:opacity-60`}>
            {visibilidades.map((v) => (
              <option key={v.valor} value={v.valor}>
                {v.nombre}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="block text-[13px] text-marine-deep">
        Nota de esta versión (opcional)
        <input name="nota" maxLength={300} placeholder="Copia registrada, 24 páginas" className={`${campo} mt-1`} />
      </label>
      <p className="text-[12px] text-mute">
        El documento queda en revisión. Los vecinos no lo ven hasta que la Junta lo publique.
        {!puedeElegirVisibilidad && " Quién lo verá lo decide la Junta al publicarlo."}
      </p>
      {error && <p className="text-[13px] text-destructive">{error}</p>}
      <button type="submit" disabled={pending} className={boton}>
        {pending ? "Subiendo…" : "Subir documento"}
      </button>
    </form>
  );
}

export function NuevaVersion({ documentoId }: { documentoId: string }) {
  const [abierto, setAbierto] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  if (!abierto) {
    return (
      <button type="button" onClick={() => setAbierto(true)} className="text-[13px] font-medium text-cyan-ink hover:underline">
        Subir una versión nueva
      </button>
    );
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const archivo = fd.get("archivo") as File | null;
        if (!archivo || archivo.size === 0) return setError("Elige el archivo.");
        setError("");
        start(async () => {
          const fallo = await subir(archivo, { documentoId, nota: String(fd.get("nota") ?? "") });
          if (fallo) setError(fallo);
          else window.location.reload();
        });
      }}
      className="mt-2 space-y-2 rounded-xl border border-border p-3"
    >
      <input name="archivo" type="file" required accept="application/pdf,image/jpeg,image/png" className="block w-full text-[13px]" aria-label="Archivo de la versión nueva" />
      <input name="nota" maxLength={300} placeholder="Qué cambia en esta versión" className={campo} aria-label="Qué cambia en esta versión" />
      <p className="text-[12px] text-mute">La versión anterior no se borra: queda en el historial del documento.</p>
      {error && <p className="text-[13px] text-destructive">{error}</p>}
      <div className="flex gap-3">
        <button type="submit" disabled={pending} className={boton}>
          {pending ? "Subiendo…" : "Subir versión"}
        </button>
        <button type="button" onClick={() => setAbierto(false)} className="text-[13px] text-mute">
          Cancelar
        </button>
      </div>
    </form>
  );
}

export function RevisarVersion({ versionId }: { versionId: string }) {
  const [comentario, setComentario] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const decidir = (decision: "publicar" | "devolver") =>
    start(async () => {
      setError("");
      const r = await revisarVersion(versionId, decision, comentario);
      if ("error" in r) setError(r.error);
      else window.location.reload();
    });

  return (
    <div className="mt-2 space-y-2">
      <input
        value={comentario}
        onChange={(e) => setComentario(e.target.value)}
        maxLength={300}
        placeholder="Comentario de la revisión (obligatorio si se devuelve)"
        aria-label="Comentario de la revisión"
        className="h-9 w-full rounded-lg border border-border bg-background px-2 text-[13px]"
      />
      {error && <p className="text-[12px] text-destructive">{error}</p>}
      <div className="flex gap-3">
        <button type="button" disabled={pending} onClick={() => decidir("publicar")} className="rounded-lg bg-marine-deep px-3 py-1.5 text-[13px] font-medium text-frost disabled:opacity-50">
          Publicar
        </button>
        <button type="button" disabled={pending} onClick={() => decidir("devolver")} className="rounded-lg border border-border px-3 py-1.5 text-[13px] font-medium text-marine-deep disabled:opacity-50">
          Devolver
        </button>
      </div>
    </div>
  );
}

export function Visibilidad({ documentoId, actual, opciones }: { documentoId: string; actual: string; opciones: Opcion[] }) {
  const [valor, setValor] = useState(actual);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  return (
    <span className="inline-block">
      <select
        value={valor}
        disabled={pending}
        aria-label="Quién lo ve"
        onChange={(e) => {
          const nuevo = e.target.value;
          const antes = valor;
          setValor(nuevo);
          start(async () => {
            const r = await cambiarVisibilidad(documentoId, nuevo);
            if ("error" in r) {
              setValor(antes);
              setError(r.error);
            } else window.location.reload();
          });
        }}
        className="h-9 rounded-lg border border-border bg-background px-2 text-[13px] disabled:opacity-50"
      >
        {opciones.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.nombre}
          </option>
        ))}
      </select>
      {error && <span className="mt-1 block text-[12px] text-destructive">{error}</span>}
    </span>
  );
}

export function Archivar({ documentoId }: { documentoId: string }) {
  const [confirmar, setConfirmar] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  if (!confirmar) {
    return (
      <button type="button" onClick={() => setConfirmar(true)} className="text-[12px] text-mute hover:text-destructive hover:underline">
        Archivar
      </button>
    );
  }
  return (
    <span className="text-[12px]">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await archivarDocumento(documentoId);
            if ("error" in r) setError(r.error);
            else window.location.reload();
          })
        }
        className="font-medium text-destructive disabled:opacity-50"
      >
        Sí, archivar
      </button>{" "}
      <button type="button" onClick={() => setConfirmar(false)} className="text-mute">
        Cancelar
      </button>
      {error && <span className="block text-destructive">{error}</span>}
    </span>
  );
}
