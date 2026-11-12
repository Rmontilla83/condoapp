"use client";

import Link from "next/link";

/**
 * El botón para regresar a la pantalla anterior. Uno solo para toda la app, y
 * visible: antes era un texto pequeño que se perdía.
 *
 * Con `historial`, regresa a la pantalla de la que realmente se vino (como la
 * flecha del navegador), para no saltar a otro módulo; `href` queda de respaldo
 * para cuando la página se abrió directamente.
 */
export function Volver({ href, texto, historial = false }: { href: string; texto: string; historial?: boolean }) {
  return (
    <Link
      href={href}
      data-print-hide
      onClick={(e) => {
        if (historial && window.history.length > 1) {
          e.preventDefault();
          window.history.back();
        }
      }}
      className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-3 text-[13px] font-medium text-marine-deep shadow-sm transition-colors hover:border-marine/40 hover:bg-frost focus-visible:outline-2 focus-visible:outline-cyan print:hidden"
    >
      <svg aria-hidden viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9.5 3.5 5 8l4.5 4.5" />
      </svg>
      {texto}
    </Link>
  );
}
