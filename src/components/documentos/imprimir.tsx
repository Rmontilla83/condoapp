"use client";

import { Button } from "@/components/ui/button";

export function BotonImprimir({ texto = "Descargar o imprimir" }: { texto?: string }) {
  return (
    <Button type="button" onClick={() => window.print()}>
      {texto}
    </Button>
  );
}
