import Link from "next/link";

/**
 * Piezas comunes de las pantallas de cuentas, libro e informes: mismo
 * encabezado, mismas cifras, mismos estados. La contabilidad se lee mejor
 * cuando todo se ve igual.
 */

export function Encabezado({
  eyebrow,
  titulo,
  descripcion,
  acciones,
}: {
  eyebrow: string;
  titulo: string;
  descripcion?: React.ReactNode;
  acciones?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <span className="font-meta-loose text-cyan-ink">{eyebrow}</span>
        <h1 className="mt-3 font-display text-[clamp(1.6rem,3.2vw,2.3rem)] leading-[1.1] tracking-[-0.03em] text-marine-deep">
          {titulo}
        </h1>
        {descripcion && <p className="mt-2 max-w-2xl text-[15px] text-mute">{descripcion}</p>}
      </div>
      {acciones && <div className="flex flex-wrap gap-2" data-print-hide>{acciones}</div>}
    </div>
  );
}

export function Cifras({ children }: { children: React.ReactNode }) {
  return <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">{children}</dl>;
}

export function Cifra({
  etiqueta,
  valor,
  detalle,
  tono = "neutro",
}: {
  etiqueta: string;
  valor: React.ReactNode;
  detalle?: React.ReactNode;
  tono?: "neutro" | "alerta" | "bien";
}) {
  const color = tono === "alerta" ? "text-destructive" : tono === "bien" ? "text-emerald-700" : "text-marine-deep";
  return (
    <div className="rounded-2xl border border-border bg-card px-4 py-3.5">
      <dt className="font-meta text-mute">{etiqueta}</dt>
      <dd className={`mt-1.5 font-display text-[22px] leading-none tabular-nums ${color}`}>{valor}</dd>
      {detalle && <p className="mt-1.5 text-[12px] text-mute">{detalle}</p>}
    </div>
  );
}

const ESTADOS: Record<string, { texto: string; clase: string }> = {
  paid: { texto: "Pagado", clase: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  partial: { texto: "Abonado", clase: "bg-cyan/10 text-cyan-ink border-cyan/30" },
  pending: { texto: "Pendiente", clase: "bg-amber-50 text-amber-800 border-amber-200" },
  overdue: { texto: "Vencido", clase: "bg-red-50 text-red-700 border-red-200" },
  cancelled: { texto: "Anulado", clase: "bg-marine-deep/5 text-mute border-border line-through" },
};

export function EstadoRecibo({ estado, vencido }: { estado: string; vencido?: boolean }) {
  const e = vencido && (estado === "pending" || estado === "partial") ? { ...ESTADOS[estado], texto: estado === "partial" ? "Abonado · vencido" : "Vencido", clase: ESTADOS.overdue.clase } : ESTADOS[estado] ?? ESTADOS.pending;
  return <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${e.clase}`}>{e.texto}</span>;
}

export function Pestanas({ items, actual }: { items: { href: string; texto: string }[]; actual: string }) {
  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-border" aria-label="Secciones" data-print-hide>
      {items.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          aria-current={actual === i.href ? "page" : undefined}
          className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-[14px] font-medium ${
            actual === i.href ? "border-ember text-marine-deep" : "border-transparent text-mute hover:text-marine-deep"
          }`}
        >
          {i.texto}
        </Link>
      ))}
    </nav>
  );
}

export const PESTANAS_CUENTAS = [
  { href: "/admin/cuentas", texto: "Cuentas por cobrar" },
  { href: "/admin/cuentas/intereses", texto: "Intereses de mora" },
  { href: "/admin/cuentas/apertura", texto: "Saldos de apertura" },
  { href: "/admin/libro", texto: "Libro diario" },
  { href: "/admin/libro/mayor", texto: "Mayor y balance" },
  { href: "/admin/informes/relacion-de-gastos", texto: "Relación de gastos" },
];

/** Clases de tabla contable: cifras alineadas, filas finas, encabezado fijo. */
export const tabla = {
  contenedor: "overflow-x-auto rounded-2xl border border-border bg-card",
  tabla: "w-full min-w-[40rem] text-left text-[13px]",
  thead: "bg-frost text-[11px] uppercase tracking-[0.06em] text-mute",
  th: "px-3 py-2.5 font-medium",
  thNum: "px-3 py-2.5 text-right font-medium",
  td: "border-t border-border px-3 py-2.5 align-top",
  tdNum: "border-t border-border px-3 py-2.5 text-right tabular-nums align-top",
  pie: "border-t-2 border-marine-deep/20 bg-frost/60 font-semibold",
};

export function Vacio({ children }: { children: React.ReactNode }) {
  return <p className="rounded-2xl border border-dashed border-border px-6 py-10 text-center text-[14px] text-mute">{children}</p>;
}
