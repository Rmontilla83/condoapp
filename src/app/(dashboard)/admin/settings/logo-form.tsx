"use client";

import { useRef, useState, useTransition } from "react";
import { CondoMarca } from "@/components/brand/condo-marca";
import { quitarLogo, subirLogo } from "./logo-actions";

export function LogoForm({ nombre, logoUrl }: { nombre: string; logoUrl: string | null }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-wrap items-center gap-5">
      <CondoMarca nombre={nombre} logoUrl={logoUrl} tam={88} className="border border-border" />
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => input.current?.click()}
            className="rounded-lg bg-marine-deep px-4 py-2 text-sm font-medium text-frost disabled:opacity-50"
          >
            {pending ? "Subiendo…" : logoUrl ? "Cambiar logo" : "Subir logo"}
          </button>
          {logoUrl && (
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const r = await quitarLogo();
                  if ("error" in r) setError(r.error);
                  else window.location.reload();
                })
              }
              className="rounded-lg border border-border px-4 py-2 text-sm text-marine-deep disabled:opacity-50"
            >
              Quitar
            </button>
          )}
        </div>
        <p className="text-[12px] text-mute">PNG, JPG o WebP, hasta 2 MB. Mejor cuadrado y con fondo claro o transparente.</p>
        {error && <p className="text-[13px] text-destructive">{error}</p>}
        <input
          ref={input}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            const fd = new FormData();
            fd.set("logo", f);
            setError(null);
            start(async () => {
              const r = await subirLogo(fd);
              if ("error" in r) setError(r.error);
              else window.location.reload();
            });
          }}
        />
      </div>
    </div>
  );
}
