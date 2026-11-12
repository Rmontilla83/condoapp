"use client";

/** Tamaño de página de las listas largas de la administración. */
export const POR_PAGINA = 25;

/**
 * Anterior / siguiente para una lista que ya está completa en el navegador.
 * Con una sola página no pinta nada.
 */
export function Paginacion({ pagina, total, alCambiar }: { pagina: number; total: number; alCambiar: (p: number) => void }) {
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  if (paginas <= 1) return null;
  const desde = (pagina - 1) * POR_PAGINA + 1;
  const hasta = Math.min(pagina * POR_PAGINA, total);
  const boton = "h-9 rounded-lg border border-border bg-card px-3.5 text-[14px] font-medium text-marine-deep hover:bg-frost disabled:cursor-not-allowed disabled:opacity-40";
  return (
    <nav aria-label="Páginas" className="flex flex-wrap items-center justify-between gap-3 pt-1" data-print-hide>
      <p className="text-[14px] text-mute" aria-live="polite">
        {desde} a {hasta} de {total}
      </p>
      <div className="flex items-center gap-2">
        <button type="button" className={boton} disabled={pagina <= 1} onClick={() => alCambiar(pagina - 1)}>
          Anterior
        </button>
        <span className="px-1 text-[14px] tabular-nums text-marine-deep">
          Página {pagina} de {paginas}
        </span>
        <button type="button" className={boton} disabled={pagina >= paginas} onClick={() => alCambiar(pagina + 1)}>
          Siguiente
        </button>
      </div>
    </nav>
  );
}
