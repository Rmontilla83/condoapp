"use client";

import { useState } from "react";
import { enlaceWhatsApp } from "@/lib/servicios";

export interface PersonaDeLaUnidad {
  nombre: string;
  rol: "owner" | "tenant";
  telefono: string | null;
  correo: string | null;
}

const boton = "inline-flex h-9 items-center rounded-lg border border-border px-3 text-[13px] font-medium text-marine-deep hover:bg-frost";

/**
 * Las personas de una unidad, con los caminos para escribirles.
 *
 * Nada de aquí lo envía Atryum: WhatsApp, la llamada y el correo se abren en el
 * teléfono o en el programa de correo de quien administra, con el mensaje ya
 * escrito, y es esa persona quien decide enviarlo.
 */
export function ContactoDeLaUnidad({ personas, mensaje, asunto }: { personas: PersonaDeLaUnidad[]; mensaje: string; asunto: string }) {
  const [copiado, setCopiado] = useState(false);

  // El saludo lleva el primer nombre de cada quien; el resto del mensaje es el mismo.
  const para = (p: PersonaDeLaUnidad) => {
    const primero = p.nombre.trim().split(/\s+/)[0];
    return `Hola${primero ? ` ${primero.charAt(0).toUpperCase()}${primero.slice(1).toLowerCase()}` : ""}, ${mensaje}`;
  };

  return (
    <div className="space-y-4">
      {personas.length === 0 ? (
        <p className="text-[14px] text-mute">Esta unidad no tiene personas cargadas. Se agregan desde Unidades o desde Contactos.</p>
      ) : (
        <ul className="divide-y divide-border">
          {personas.map((p, i) => {
            const wa = enlaceWhatsApp(p.telefono);
            const texto = para(p);
            return (
              <li key={i} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="text-[15px] font-medium text-marine-deep">
                    {p.nombre || "Sin nombre"}{" "}
                    <span className={`ml-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${p.rol === "owner" ? "bg-marine-deep/5 text-marine-deep" : "bg-cyan/10 text-cyan-ink"}`}>
                      {p.rol === "owner" ? "Propietario" : "Inquilino"}
                    </span>
                  </p>
                  <p className="mt-0.5 break-all text-[13px] text-mute">{[p.telefono, p.correo].filter(Boolean).join(" · ") || "Sin teléfono ni correo"}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {wa && (
                    <a href={`${wa}?text=${encodeURIComponent(texto)}`} target="_blank" rel="noopener noreferrer" className={`${boton} border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100`}>
                      WhatsApp
                    </a>
                  )}
                  {p.telefono && (
                    <a href={`tel:${p.telefono.replace(/[^\d+]/g, "")}`} className={boton}>
                      Llamar
                    </a>
                  )}
                  {p.correo && (
                    <a href={`mailto:${p.correo}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(texto)}`} className={boton}>
                      Correo
                    </a>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="rounded-xl bg-frost/70 p-3">
        <p className="font-meta text-mute">MENSAJE QUE SE ABRE YA ESCRITO</p>
        <p className="mt-1.5 whitespace-pre-line text-[13.5px] text-marine-deep/90">Hola, {mensaje}</p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(`Hola, ${mensaje}`);
                setCopiado(true);
                setTimeout(() => setCopiado(false), 2500);
              } catch {
                setCopiado(false);
              }
            }}
            className="text-[13px] font-medium text-cyan-ink hover:underline"
          >
            {copiado ? "Copiado" : "Copiar el mensaje"}
          </button>
          <span className="text-[12px] text-mute">Se envía desde tu WhatsApp o tu correo, no desde Atryum. Puedes cambiarlo antes de enviar.</span>
        </div>
      </div>
    </div>
  );
}
