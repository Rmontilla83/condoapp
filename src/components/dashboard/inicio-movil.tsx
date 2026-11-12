"use client";

import Link from "next/link";
import { useState } from "react";
import { CaraConserje, NOMBRE_CONSERJE } from "@/components/conserje/cara";

/**
 * El inicio del residente en el teléfono: Atri a pantalla completa.
 *
 * Atri saluda, dice lo que importa hoy (cuánto se debe, un paquete, un pago
 * rechazado) y ofrece cinco botones grandes. Cada botón abre la función
 * directamente: no depende de que Atri entienda una frase. Escribirle es
 * opcional, y abre la conversación con la pregunta ya enviada.
 *
 * Solo se ve en el teléfono; en pantallas grandes sigue el tablero completo.
 */
export interface AccionInicio {
  href: string;
  texto: string;
  icono: "pagar" | "averia" | "visita" | "reservar" | "avisos";
  principal?: boolean;
  /** Un número pequeño al lado: avisos sin leer, por ejemplo. */
  cuenta?: number;
}

const ICONOS: Record<AccionInicio["icono"], string> = {
  pagar: "M3 8.5h18M3 9.5h18M6.5 15h5M4.5 5h15A1.5 1.5 0 0 1 21 6.5v11a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5v-11A1.5 1.5 0 0 1 4.5 5Z",
  averia: "M14.5 6.5a4 4 0 0 0-5.3 5.1L3.5 17.3a1.6 1.6 0 0 0 2.2 2.2l5.7-5.7a4 4 0 0 0 5.1-5.3l-2.4 2.4-2-.5-.5-2 2.4-2.4Z",
  visita: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2.5v2.5H14zM17.5 17.5H20V20h-2.5zM17.5 14H20M14 20v-1",
  reservar: "M7 3v3M17 3v3M4 9h16M5.5 5h13A1.5 1.5 0 0 1 20 6.5v12a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-12A1.5 1.5 0 0 1 5.5 5Z",
  avisos: "M4 10v4h3l6 4V6l-6 4H4ZM16.5 9.5a3.5 3.5 0 0 1 0 5",
};

function Icono({ d, className = "h-6 w-6" }: { d: string; className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 ${className}`}>
      <path d={d} />
    </svg>
  );
}

/** Pide al panel de Atri (que vive en el layout) que se abra, con una pregunta ya enviada si la hay. */
function abrirAtri(texto?: string) {
  window.dispatchEvent(new CustomEvent("atri:abrir", { detail: { texto: texto ?? "" } }));
}

export function InicioMovil({ saludo, lineas, acciones }: { saludo: string; lineas: string[]; acciones: AccionInicio[] }) {
  const [texto, setTexto] = useState("");

  return (
    <div className="flex min-h-[calc(100dvh-10.5rem)] flex-col gap-4 md:hidden">
      <div className="flex items-start gap-3">
        <CaraConserje tam={56} className="shrink-0" />
        <div className="rounded-2xl rounded-tl-md border border-border bg-card px-4 py-3 text-[16px] leading-snug text-marine-deep">
          <p className="font-semibold">{saludo}</p>
          {lineas.map((l, i) => (
            <p key={i} className="mt-1">
              {l}
            </p>
          ))}
          <p className="mt-1 text-mute">¿Qué necesitas?</p>
        </div>
      </div>

      <nav aria-label="Lo que puedes hacer" className="flex flex-col gap-2.5">
        {acciones.map((a) => (
          <Link
            key={a.href + a.texto}
            href={a.href}
            className={`flex min-h-[58px] items-center gap-3.5 rounded-2xl border px-4 text-[16px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-cyan active:scale-[0.99] ${
              a.principal ? "border-marine bg-marine text-frost" : "border-border bg-card text-marine-deep"
            }`}
          >
            <Icono d={ICONOS[a.icono]} className={`h-6 w-6 ${a.principal ? "" : "text-marine"}`} />
            <span className="min-w-0 flex-1">{a.texto}</span>
            {a.cuenta ? (
              <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-ember px-2 text-[13px] font-semibold tabular-nums text-marine-deep" aria-label={`${a.cuenta} sin leer`}>
                {a.cuenta}
              </span>
            ) : null}
            <Icono d="m9 6 6 6-6 6" className={`h-5 w-5 ${a.principal ? "text-frost/60" : "text-mute"}`} />
          </Link>
        ))}
      </nav>

      <form
        className="mt-auto flex items-center gap-2 rounded-2xl border border-border bg-card p-1.5 pl-4"
        onSubmit={(e) => {
          e.preventDefault();
          // Se suelta el campo para que el teclado baje y se vea la respuesta.
          (document.activeElement as HTMLElement | null)?.blur();
          abrirAtri(texto);
          setTexto("");
        }}
      >
        <label htmlFor="inicio-atri" className="sr-only">
          Escríbele a {NOMBRE_CONSERJE}
        </label>
        <input
          id="inicio-atri"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          // Se escribe aquí mismo. La conversación se abre al enviar: abrirla al
          // tocar el campo la ponía encima, y el teclado seguía escribiendo en
          // este campo, ya tapado.
          enterKeyHint="send"
          placeholder={`Escríbele a ${NOMBRE_CONSERJE}…`}
          autoComplete="off"
          className="h-12 min-w-0 flex-1 bg-transparent text-[16px] text-marine-deep placeholder:text-mute focus:outline-none"
        />
        <button type="submit" className="h-12 rounded-xl bg-marine-deep px-4 text-[15px] font-semibold text-frost">
          Enviar
        </button>
      </form>
    </div>
  );
}
