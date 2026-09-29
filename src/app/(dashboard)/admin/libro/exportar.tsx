"use client";

import { Button } from "@/components/ui/button";
import type { LineaLibro } from "@/lib/contabilidad/libro";

const num = (n: number) => (n ? n.toFixed(2).replace(".", ",") : "");

/** CSV con punto y coma (Excel en español) de todas las líneas del período, en las dos monedas. */
export function ExportarLibro({ lineas, nombre }: { lineas: LineaLibro[]; nombre: string }) {
  return (
    <Button
      variant="outline"
      onClick={() => {
        const enc = ["Fecha", "Documento", "Concepto", "Cuenta", "Nombre de la cuenta", "Debe USD", "Haber USD", "Debe Bs", "Haber Bs"];
        const filas = lineas.map((l) =>
          [l.fecha, l.documento, l.descripcion, l.cuenta, l.cuenta_nombre, num(l.debe_usd), num(l.haber_usd), num(l.debe_bs), num(l.haber_bs)]
            .map((v) => (/[;"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v))
            .join(";"),
        );
        const csv = `﻿${[enc.join(";"), ...filas].join("\r\n")}\r\n`;
        const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
        const a = document.createElement("a");
        a.href = url;
        a.download = `${nombre}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }}
    >
      Exportar a Excel
    </Button>
  );
}
