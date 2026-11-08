"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { reducirFoto } from "@/lib/fotos-cliente";
import { createAnnouncement } from "./actions";

const MAX_FOTOS = 6;

interface Foto {
  archivo: File;
  vista: string;
}

export function NewAnnouncementDialog({ correos }: { correos: boolean }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [preparando, setPreparando] = useState(false);
  const [error, setError] = useState("");
  const [fotos, setFotos] = useState<Foto[]>([]);

  function reiniciar() {
    fotos.forEach((f) => URL.revokeObjectURL(f.vista));
    setFotos([]);
    setError("");
  }

  async function agregarFotos(e: React.ChangeEvent<HTMLInputElement>) {
    const elegidas = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (elegidas.length === 0) return;

    const espacio = MAX_FOTOS - fotos.length;
    setError("");
    setPreparando(true);
    const nuevas: Foto[] = [];
    let fallidas = 0;
    for (const original of elegidas.slice(0, espacio)) {
      try {
        const archivo = await reducirFoto(original);
        nuevas.push({ archivo, vista: URL.createObjectURL(archivo) });
      } catch {
        fallidas++;
      }
    }
    setFotos((actuales) => [...actuales, ...nuevas]);
    setPreparando(false);

    if (fallidas > 0) {
      setError(fallidas === 1 ? "Una foto no se pudo leer. Prueba con JPG o PNG." : `${fallidas} fotos no se pudieron leer. Prueba con JPG o PNG.`);
    } else if (elegidas.length > espacio) {
      setError(`Solo caben ${MAX_FOTOS} fotos por comunicado. Se agregaron las primeras.`);
    }
  }

  function quitarFoto(indice: number) {
    URL.revokeObjectURL(fotos[indice].vista);
    setFotos((actuales) => actuales.filter((_, i) => i !== indice));
    setError("");
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const datos = new FormData(e.currentTarget);
    fotos.forEach((f) => datos.append("photos", f.archivo));
    try {
      const res = await createAnnouncement(datos);
      if (res.error) {
        setError(res.error);
        setLoading(false);
        return;
      }
      window.location.reload();
    } catch {
      setError("No se pudo publicar. Revisa tu conexión e inténtalo de nuevo.");
      setLoading(false);
    }
  }

  const ocupado = loading || preparando;

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reiniciar(); }}>
      <DialogTrigger render={<Button />}>
        <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Nuevo comunicado
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Publicar comunicado</DialogTitle>
          <DialogDescription>Será visible para todos los residentes al instante.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input id="title" name="title" placeholder="Ej: Mantenimiento del ascensor" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="content">Contenido</Label>
            <textarea id="content" name="content" rows={4} className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-base md:text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" placeholder="Detalle del comunicado..." required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fotos">Fotos (opcional, hasta {MAX_FOTOS})</Label>
            <Input
              id="fotos"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={agregarFotos}
              disabled={ocupado || fotos.length >= MAX_FOTOS}
              className="text-sm"
            />
            {preparando && <p className="text-[12px] text-mute">Preparando las fotos…</p>}
            {fotos.length > 0 && (
              <ul className="flex flex-wrap gap-2 pt-1">
                {fotos.map((foto, i) => (
                  <li key={foto.vista} className="relative h-16 w-16 overflow-hidden rounded-lg border border-border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={foto.vista} alt={`Foto ${i + 1}`} className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => quitarFoto(i)}
                      disabled={ocupado}
                      aria-label={`Quitar foto ${i + 1}`}
                      className="absolute right-0 top-0 rounded-bl-lg bg-marine-deep/70 p-0.5 text-frost"
                    >
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="priority">Prioridad</Label>
            <select id="priority" name="priority" className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base md:text-sm" defaultValue="normal">
              <option value="normal">Normal</option>
              <option value="important">Importante</option>
              <option value="urgent">{correos ? "Urgente · se envía por correo a todos los residentes" : "Urgente"}</option>
            </select>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => { setOpen(false); reiniciar(); }} disabled={loading}>Cancelar</Button>
            <Button type="submit" className="flex-1" disabled={ocupado}>{loading ? "Publicando..." : "Publicar"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
