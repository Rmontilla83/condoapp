import { NOMBRE_DATO, type DatoPendiente } from "@/lib/verificacion-datos";

/** Etiqueta corta para una fila de tabla: «En verificación». */
export function EtiquetaVerificacion({ detalle }: { detalle: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10.5px] font-medium text-amber-800">
      <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
      En verificación: {detalle}
    </span>
  );
}

/** Aviso completo en la ficha de una unidad: qué dato falta aclarar y por qué. */
export function AvisoVerificacion({ datos }: { datos: DatoPendiente[] }) {
  if (datos.length === 0) return null;
  return (
    <section role="note" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5" data-print-hide>
      <p className="text-[14px] font-semibold text-amber-900">
        Esta unidad tiene {datos.length === 1 ? "un dato" : `${datos.length} datos`} en verificación
      </p>
      <ul className="mt-2 space-y-1.5 text-[13.5px] text-amber-900">
        {datos.map((d) => (
          <li key={d.campo}>
            <span className="font-medium">{NOMBRE_DATO[d.campo]}:</span>{" "}
            {d.motivo ?? (d.estado === "rojo" ? "hay una diferencia entre las fuentes." : "falta información.")}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[12.5px] text-amber-900/80">
        La deuda se puede cobrar con normalidad. Antes de un cobro judicial, de un cambio de propietario o de emitir una constancia, conviene confirmar ese dato con la Junta. El aviso desaparece cuando se aclara en la matriz de revisión.
      </p>
    </section>
  );
}
