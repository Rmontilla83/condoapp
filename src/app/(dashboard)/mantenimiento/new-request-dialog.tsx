"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { createMaintenanceRequest } from "./actions";

export function NewRequestDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [previews, setPreviews] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    const urls: string[] = [];
    for (let i = 0; i < Math.min(files.length, 3); i++) {
      urls.push(URL.createObjectURL(files[i]));
    }
    setPreviews(urls);
  }

  function removePhoto(idx: number) {
    setPreviews((p) => p.filter((_, i) => i !== idx));
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const result = await createMaintenanceRequest(formData);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setOpen(false);
    setLoading(false);
    setPreviews([]);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setPreviews([]); setError(""); } }}>
      <DialogTrigger render={<Button />}>
        <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Nuevo reporte
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nuevo reporte de mantenimiento</DialogTitle>
          <DialogDescription>
            Describe el problema y adjunta fotos para que se resuelva mas rapido.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="title">Titulo del problema</Label>
            <Input id="title" name="title" placeholder="Ej: Fuga de agua en el bano" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Categoria</Label>
            <select id="category" name="category" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" required>
              <option value="">Selecciona una categoria</option>
              <option value="plumbing">Plomeria</option>
              <option value="electrical">Electricidad</option>
              <option value="structural">Estructura</option>
              <option value="elevator">Ascensor</option>
              <option value="security">Seguridad</option>
              <option value="cleaning">Limpieza</option>
              <option value="access">Acceso</option>
              <option value="other">Otro</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descripcion</Label>
            <textarea id="description" name="description" rows={3} className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" placeholder="Describe el problema con detalle..." required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="priority">Prioridad</Label>
            <select id="priority" name="priority" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" defaultValue="medium">
              <option value="low">Baja</option>
              <option value="medium">Media</option>
              <option value="high">Alta</option>
              <option value="urgent">Urgente</option>
            </select>
          </div>
          {/* Photo upload */}
          <div className="space-y-2">
            <Label htmlFor="photos">Fotos del problema (max 3)</Label>
            <Input
              ref={fileRef}
              id="photos"
              name="photos"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={handleFiles}
              className="text-sm"
            />
            {previews.length > 0 && (
              <div className="flex gap-2 mt-2">
                {previews.map((url, idx) => (
                  <div key={idx} className="relative h-16 w-16 rounded-lg overflow-hidden border">
                    <img src={url} alt={`Preview ${idx + 1}`} className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removePhoto(idx)}
                      className="absolute top-0 right-0 bg-black/60 text-white rounded-bl-lg p-0.5"
                    >
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? "Enviando..." : "Enviar reporte"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
