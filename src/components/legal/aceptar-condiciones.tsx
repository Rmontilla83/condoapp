"use client";

import { useState, useTransition } from "react";
import { AtryumLogo } from "@/components/brand/atryum-logo";
import { Button } from "@/components/ui/button";
import { aceptarCondiciones } from "./actions";

/** Se muestra una vez, y otra vez si cambia la versión de las condiciones. */
export function AceptarCondiciones({ condominio }: { condominio: string | null }) {
  const [marcado, setMarcado] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-5">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 sm:p-8">
        <AtryumLogo variant="horizontal" tone="color" className="text-[20px]" />
        <h1 className="mt-6 font-display text-[24px] leading-[1.2] tracking-[-0.02em] text-marine-deep">Antes de entrar</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-mute">
          {condominio ? `${condominio} usa Atryum` : "Tu condominio usa Atryum"} para administrarse. Lee cómo funciona, qué no hace y cómo se tratan tus datos.
        </p>
        <ul className="mt-4 space-y-1.5 text-[15px]">
          <li>
            <a href="/terminos" target="_blank" rel="noopener noreferrer" className="text-cyan-ink underline">Condiciones de uso</a>
          </li>
          <li>
            <a href="/privacidad" target="_blank" rel="noopener noreferrer" className="text-cyan-ink underline">Aviso de privacidad</a>
          </li>
        </ul>
        <label className="mt-6 flex cursor-pointer items-start gap-3 text-[14px] text-marine-deep">
          <input type="checkbox" checked={marcado} onChange={(e) => setMarcado(e.target.checked)} className="mt-0.5 h-4 w-4 cursor-pointer" />
          <span>Leí y acepto las condiciones de uso y el aviso de privacidad.</span>
        </label>
        {error && <p className="mt-3 text-[13px] text-destructive">{error}</p>}
        <Button
          type="button"
          className="mt-6 w-full"
          disabled={!marcado || pending}
          onClick={() =>
            start(async () => {
              setError("");
              const r = await aceptarCondiciones();
              if ("error" in r) setError(r.error);
              else window.location.href = "/dashboard";
            })
          }
        >
          {pending ? "Guardando…" : "Aceptar y entrar"}
        </Button>
      </div>
    </div>
  );
}
