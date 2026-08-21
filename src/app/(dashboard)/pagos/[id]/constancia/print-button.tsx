"use client";

import { Button } from "@/components/ui/button";

/**
 * "Imprimir → Guardar como PDF" es un gesto que la gente ya conoce, y evita
 * meter una dependencia de generación de PDF para un documento de una página.
 */
export function PrintButton() {
  return (
    <Button type="button" onClick={() => window.print()}>
      Descargar o imprimir
    </Button>
  );
}
