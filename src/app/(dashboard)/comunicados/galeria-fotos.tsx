"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

const flecha = "rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-marine-deep";

export function GaleriaFotos({ fotos, titulo }: { fotos: string[]; titulo: string }) {
  const [abierta, setAbierta] = useState<number | null>(null);
  const total = fotos.length;
  const columnas = total === 1 ? "grid-cols-1" : total === 2 || total === 4 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3";
  const mover = (paso: number) => setAbierta((i) => (i === null ? i : (i + paso + total) % total));

  return (
    <>
      <div className={`mt-4 grid gap-2 ${columnas}`}>
        {fotos.map((url, i) => (
          <button
            key={url}
            type="button"
            onClick={() => setAbierta(i)}
            aria-label={`Ampliar foto ${i + 1} de ${total}`}
            className="overflow-hidden rounded-xl border border-border focus-visible:outline-2 focus-visible:outline-cyan"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={`Foto ${i + 1} de «${titulo}»`}
              loading="lazy"
              className={`w-full object-cover ${total === 1 ? "aspect-[16/9]" : "aspect-[4/3]"}`}
            />
          </button>
        ))}
      </div>

      <Dialog open={abierta !== null} onOpenChange={(v) => !v && setAbierta(null)}>
        <DialogContent
          className="max-h-[92vh] overflow-y-auto sm:max-w-3xl"
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") mover(-1);
            if (e.key === "ArrowRight") mover(1);
          }}
        >
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>{total > 1 && abierta !== null ? `Foto ${abierta + 1} de ${total}` : "Foto del comunicado"}</DialogDescription>
          {abierta !== null && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={fotos[abierta]} alt={`Foto ${abierta + 1} de «${titulo}»`} className="max-h-[68vh] w-full rounded-lg object-contain" />
          )}
          {total > 1 && (
            <div className="flex justify-between gap-3">
              <button type="button" className={flecha} onClick={() => mover(-1)}>Anterior</button>
              <button type="button" className={flecha} onClick={() => mover(1)}>Siguiente</button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
