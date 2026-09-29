import Link from "next/link";
import { BotonImprimir } from "./imprimir";

export interface Membrete {
  nombre: string;
  rif?: string | null;
  direccion?: string | null;
  ciudad?: string | null;
  logoUrl?: string | null;
}

/**
 * Marco de un documento imprimible del condominio (recibo, estado de cuenta,
 * relación de gastos, libro). En pantalla es una hoja sobre el fondo; al
 * imprimir queda solo la hoja. «Imprimir → Guardar como PDF» hace el resto.
 */
export function Documento({
  membrete,
  tipo,
  numero,
  fecha,
  volver,
  acciones,
  sello,
  children,
  pie,
  ancho = "max-w-3xl",
}: {
  membrete: Membrete;
  tipo: string;
  numero?: string;
  fecha: string;
  volver?: { href: string; texto: string };
  acciones?: React.ReactNode;
  sello?: { texto: string; tono: "bien" | "anulado" | "alerta" } | null;
  children: React.ReactNode;
  pie?: React.ReactNode;
  ancho?: string;
}) {
  const colorSello =
    sello?.tono === "bien"
      ? "border-emerald-600 text-emerald-700"
      : sello?.tono === "anulado"
        ? "border-red-600 text-red-600"
        : "border-amber-600 text-amber-700";
  return (
    <div className={`mx-auto ${ancho}`}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 print:hidden">
        {volver ? (
          <Link href={volver.href} className="font-meta text-cyan-ink hover:text-marine-deep">
            ← {volver.texto.toUpperCase()}
          </Link>
        ) : (
          <span />
        )}
        <div className="flex flex-wrap gap-2">
          {acciones}
          <BotonImprimir />
        </div>
      </div>

      <article className="documento relative rounded-2xl border border-border bg-white p-7 text-marine-deep shadow-[0_20px_55px_-30px_rgb(15_46_90/0.35)] md:p-10 print:rounded-none print:border-0 print:p-0 print:shadow-none">
        <header className="flex items-start justify-between gap-6 border-b-2 border-marine-deep pb-5">
          <div className="flex min-w-0 items-center gap-4">
            {membrete.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- logo del condominio en el membrete
              <img src={membrete.logoUrl} alt="" className="h-16 w-auto max-w-[150px] object-contain" />
            )}
            <div className="min-w-0">
              <p className="font-display text-[19px] font-semibold leading-tight tracking-[-0.02em]">{membrete.nombre}</p>
              {membrete.rif && <p className="text-[12px] text-mute">RIF {membrete.rif}</p>}
              {(membrete.direccion || membrete.ciudad) && (
                <p className="text-[12px] text-mute">{[membrete.direccion, membrete.ciudad].filter(Boolean).join(", ")}</p>
              )}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className="font-meta text-mute">{tipo.toUpperCase()}</p>
            {numero && <p className="mt-1 font-mono text-[17px] font-semibold">{numero}</p>}
            <p className="mt-1 text-[12px] text-mute">{fecha}</p>
          </div>
        </header>

        {sello && (
          <div
            className={`pointer-events-none absolute right-10 top-36 rotate-[-10deg] rounded-lg border-[3px] px-4 py-1.5 font-display text-[22px] font-bold uppercase tracking-[0.12em] opacity-80 ${colorSello}`}
            aria-label={sello.texto}
          >
            {sello.texto}
          </div>
        )}

        <div className="pt-6">{children}</div>

        <footer className="mt-10 flex flex-wrap items-end justify-between gap-3 border-t border-border pt-4 text-[11px] text-mute">
          <div className="max-w-xl">{pie}</div>
          <p>Emitido con Atryum · atryum.net</p>
        </footer>
      </article>
    </div>
  );
}

/** Fila «etiqueta: valor» de los datos del documento. */
export function Dato({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="font-meta text-mute">{etiqueta}</dt>
      <dd className="mt-0.5 text-[14px]">{children}</dd>
    </div>
  );
}
