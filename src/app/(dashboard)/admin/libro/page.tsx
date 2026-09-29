import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/queries";
import { isAdminRole } from "@/lib/permissions";
import { fechaLarga, membreteDe } from "@/lib/documentos";
import { todayInTimeZone } from "@/lib/utils";
import { asientos, lineasDelLibro } from "@/lib/contabilidad/libro";
import { bs, usd } from "@/lib/format";
import { Documento } from "@/components/documentos/documento";
import { Pestanas, PESTANAS_CUENTAS } from "@/components/contabilidad/ui";
import { SelectorPeriodo } from "@/components/contabilidad/selector-periodo";
import { ExportarLibro } from "./exportar";

const corta = (d: string) =>
  new Date(`${d}T12:00:00Z`).toLocaleDateString("es-VE", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });

/**
 * Libro diario. Cada documento (recibo, pago, nota de crédito, gasto, saldo a
 * favor) con su asiento cuadrado. No se escribe a mano: sale de los documentos,
 * que no se pueden editar, así que el libro tampoco.
 */
export default async function LibroPage({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string; hasta?: string; moneda?: string }>;
}) {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return null;
  if (!isAdminRole(profile)) redirect("/dashboard");
  const membrete = await membreteDe(profile.organization_id);
  const hoy = todayInTimeZone(membrete.timezone);
  const sp = await searchParams;
  const [y, m] = hoy.split("-").map(Number);
  const valida = (s?: string) => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null);
  const desde = valida(sp.desde) ?? new Date(Date.UTC(y, m - 1, 1)).toISOString().slice(0, 10);
  const hasta = valida(sp.hasta) ?? hoy;
  const enBs = sp.moneda === "bs";
  const fmt = enBs ? bs : usd;

  const lineas = await lineasDelLibro(profile.organization_id, desde, hasta);
  const lista = asientos(lineas);
  const debe = lineas.reduce((s, l) => s + (enBs ? l.debe_bs : l.debe_usd), 0);
  const haber = lineas.reduce((s, l) => s + (enBs ? l.haber_bs : l.haber_usd), 0);
  const cuadra = Math.abs(debe - haber) < 0.005;
  const enlaceMoneda = (b: boolean) => `?desde=${desde}&hasta=${hasta}${b ? "&moneda=bs" : ""}`;

  return (
    <div className="space-y-6">
      <div className="space-y-6 print:hidden">
        <Pestanas items={PESTANAS_CUENTAS} actual="/admin/libro" />
        <div className="flex flex-wrap items-end justify-between gap-3">
          <SelectorPeriodo desde={desde} hasta={hasta} hoy={hoy} />
          <div className="flex rounded-full border border-border p-0.5 text-[13px]">
            <Link href={enlaceMoneda(false)} className={`rounded-full px-3 py-1 ${!enBs ? "bg-marine-deep text-frost" : "text-marine-deep"}`}>
              Dólares
            </Link>
            <Link href={enlaceMoneda(true)} className={`rounded-full px-3 py-1 ${enBs ? "bg-marine-deep text-frost" : "text-marine-deep"}`}>
              Bolívares
            </Link>
          </div>
        </div>
      </div>

      <Documento
        membrete={membrete}
        tipo="Libro diario"
        numero={`${corta(desde)} al ${corta(hasta)}`}
        fecha={`${lista.length} asientos · en ${enBs ? "bolívares" : "dólares"}`}
        ancho="max-w-5xl"
        acciones={<ExportarLibro lineas={lineas} nombre={`libro-diario-${desde}-a-${hasta}`} />}
        pie={
          <>
            Libro diario del condominio (Ley de Propiedad Horizontal, art. 20.g). Cada asiento se genera a partir de un documento
            inmutable: recibo, pago, nota de crédito, gasto o movimiento de saldo a favor. Los bolívares usan la tasa BCV de cada
            documento; la diferencia entre la tasa de emisión y la de cobro va a Diferencial cambiario. Emitido el {fechaLarga(hoy)}.
          </>
        }
      >
        {lista.length === 0 ? (
          <p className="py-10 text-center text-[14px] text-mute">No hay asientos en este período.</p>
        ) : (
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="border-b border-marine-deep/30 text-left text-[10.5px] uppercase tracking-[0.06em] text-mute">
                <th className="w-12 py-2 pr-2 font-medium">N°</th>
                <th className="w-24 py-2 pr-2 font-medium">Fecha</th>
                <th className="py-2 pr-2 font-medium">Cuenta / Concepto</th>
                <th className="w-32 py-2 pl-2 text-right font-medium">Debe</th>
                <th className="w-32 py-2 pl-2 text-right font-medium">Haber</th>
              </tr>
            </thead>
            {lista.map((a) => (
              <tbody key={`${a.doc_tipo}${a.doc_id}`} className="break-inside-avoid border-b border-border">
                <tr>
                  <td className="pt-2.5 pr-2 align-top font-mono text-[11.5px] text-mute">{a.n}</td>
                  <td className="pt-2.5 pr-2 align-top whitespace-nowrap">{corta(a.fecha)}</td>
                  <td colSpan={3} className="pt-2.5 pr-2">
                    <span className="font-semibold">{a.documento}</span>
                    <span className="text-mute"> · {a.descripcion}</span>
                  </td>
                </tr>
                {a.lineas.map((l, i) => {
                  const d = enBs ? l.debe_bs : l.debe_usd;
                  const h = enBs ? l.haber_bs : l.haber_usd;
                  if (!d && !h) return null;
                  return (
                    <tr key={i}>
                      <td />
                      <td />
                      <td className={`py-0.5 pr-2 ${h ? "pl-8" : "pl-2"}`}>
                        <span className="font-mono text-[11px] text-mute">{l.cuenta}</span> {l.cuenta_nombre}
                      </td>
                      <td className="py-0.5 pl-2 text-right tabular-nums">{d ? fmt(d) : ""}</td>
                      <td className="py-0.5 pl-2 text-right tabular-nums">{h ? fmt(h) : ""}</td>
                    </tr>
                  );
                })}
                <tr>
                  <td colSpan={5} className="pb-2.5" />
                </tr>
              </tbody>
            ))}
            <tfoot>
              <tr>
                <td colSpan={3} className="pt-4 text-right font-meta text-mute">
                  TOTALES {cuadra ? "· CUADRADO" : "· NO CUADRA"}
                </td>
                <td className="pt-4 pl-2 text-right font-display text-[15px] tabular-nums">{fmt(debe)}</td>
                <td className="pt-4 pl-2 text-right font-display text-[15px] tabular-nums">{fmt(haber)}</td>
              </tr>
            </tfoot>
          </table>
        )}
      </Documento>
    </div>
  );
}
