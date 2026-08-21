"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createMaintenanceRequest } from "./actions";
import type { UnitOption } from "./location-step";
import type { CommonArea } from "@/types/database";

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const MAX_PHOTOS = 3;

interface Props {
  units: UnitOption[];
  commonAreas: CommonArea[];
}

export function NewRequestDialog({ units, commonAreas }: Props) {
  const [open, setOpen] = useState(false);
  // Una sola pantalla: la ubicación es un dropdown dentro del formulario.
  // Si el residente tiene una sola unidad, ya viene preseleccionada.
  const initialLocation = units.length === 1 ? `unit:${units[0].id}` : "";
  const [locationValue, setLocationValue] = useState(initialLocation);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [previews, setPreviews] = useState<string[]>([]);
  const [rejectedFiles, setRejectedFiles] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    const urls: string[] = [];
    const rejected: string[] = [];
    for (let i = 0; i < Math.min(files.length, MAX_PHOTOS); i++) {
      const f = files[i];
      if (f.size > MAX_PHOTO_BYTES) {
        rejected.push(`${f.name} (${(f.size / 1024 / 1024).toFixed(1)} MB)`);
        continue;
      }
      urls.push(URL.createObjectURL(f));
    }
    setPreviews(urls);
    setRejectedFiles(rejected);
  }

  function removePhoto(idx: number) {
    setPreviews((p) => p.filter((_, i) => i !== idx));
    setRejectedFiles([]);
    if (fileRef.current) fileRef.current.value = "";
  }

  function resetAll() {
    setLocationValue(initialLocation);
    setPreviews([]);
    setRejectedFiles([]);
    setError("");
    setLoading(false);
    if (fileRef.current) fileRef.current.value = "";
    formRef.current?.reset();
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!locationValue) {
      setError("Selecciona dónde está el problema");
      return;
    }
    setLoading(true);
    setError("");

    const form = e.currentTarget;
    const fileInput = form.elements.namedItem("photos") as HTMLInputElement | null;
    if (fileInput?.files) {
      const accepted: File[] = [];
      for (let i = 0; i < fileInput.files.length; i++) {
        const f = fileInput.files[i];
        if (f.size <= MAX_PHOTO_BYTES) accepted.push(f);
      }
      const dt = new DataTransfer();
      accepted.slice(0, MAX_PHOTOS).forEach((f) => dt.items.add(f));
      fileInput.files = dt.files;
    }

    const formData = new FormData(form);
    const sep = locationValue.indexOf(":");
    const locKind = locationValue.slice(0, sep);
    const locId = locationValue.slice(sep + 1);
    if (locKind === "unit") {
      formData.set("unit_id", locId);
    } else if (locKind === "common") {
      formData.set("common_area_id", locId);
    }

    try {
      const result = await createMaintenanceRequest(formData);
      if ("error" in result) {
        setError(result.error);
        setLoading(false);
        return;
      }
      resetAll();
      setOpen(false);
      window.location.reload();
      if (result.photosFailed > 0) {
        setTimeout(() => {
          alert(
            `Reporte creado. ${result.photosUploaded} foto(s) subida(s), ${result.photosFailed} fallaron.`,
          );
        }, 300);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido";
      setError(`No se pudo enviar el reporte: ${message}`);
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) resetAll();
      }}
    >
      <DialogTrigger render={<Button />}>
        <svg
          className="mr-2 h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Reportar un problema
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Reportar un problema</DialogTitle>
          <DialogDescription>
            Dinos qué pasa y dónde. Adjuntar fotos ayuda a resolverlo más rápido.
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="location">¿Dónde está el problema?</Label>
            <select
              id="location"
              value={locationValue}
              onChange={(e) => setLocationValue(e.target.value)}
              className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base md:text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              required
              disabled={loading}
            >
              <option value="">Selecciona dónde…</option>
              {units.length > 0 && (
                <optgroup label="Mi unidad">
                  {units.map((u) => (
                    <option key={u.id} value={`unit:${u.id}`}>
                      {u.label}
                    </option>
                  ))}
                </optgroup>
              )}
              {commonAreas.length > 0 && (
                <optgroup label="Área común">
                  {commonAreas.map((c) => (
                    <option key={c.id} value={`common:${c.id}`}>
                      {c.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">¿Qué pasó?</Label>
            <Input
              id="title"
              name="title"
              placeholder="Ej: Fuga de agua en el baño"
              required
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Categoría</Label>
            <select
              id="category"
              name="category"
              className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base md:text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              required
              disabled={loading}
            >
              <option value="">Selecciona una categoría</option>
              <option value="plumbing">Plomería</option>
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
            <Label htmlFor="description">Descripción</Label>
            <textarea
              id="description"
              name="description"
              rows={3}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-base md:text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Describe el problema con detalle..."
              required
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="priority">Prioridad</Label>
            <select
              id="priority"
              name="priority"
              className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base md:text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              defaultValue="medium"
              disabled={loading}
            >
              <option value="low">Baja</option>
              <option value="medium">Media</option>
              <option value="high">Alta</option>
              <option value="urgent">Urgente</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="photos">Fotos del problema (máx 3, 5 MB c/u)</Label>
            <Input
              ref={fileRef}
              id="photos"
              name="photos"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={handleFiles}
              disabled={loading}
              className="text-sm"
            />
            {rejectedFiles.length > 0 && (
              <p className="text-[12px] text-destructive">
                Demasiado grande y no se enviará: {rejectedFiles.join(", ")}
              </p>
            )}
            {previews.length > 0 && (
              <div className="flex gap-2 mt-2">
                {previews.map((url, idx) => (
                  <div
                    key={idx}
                    className="relative h-16 w-16 rounded-lg overflow-hidden border border-border"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={`Preview ${idx + 1}`}
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(idx)}
                      className="absolute top-0 right-0 bg-marine-deep/60 text-frost rounded-bl-lg p-0.5"
                      disabled={loading}
                    >
                      <svg
                        className="h-3 w-3"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={3}
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          {error && (
            <p className="rounded-md bg-destructive/10 border border-destructive/30 p-3 text-[13px] text-destructive">
              {error}
            </p>
          )}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
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
