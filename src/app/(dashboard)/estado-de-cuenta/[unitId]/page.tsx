import { notFound, redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/queries";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminRole } from "@/lib/permissions";
import { fechaLarga, membreteDe, puedeVerUnidad } from "@/lib/documentos";
import { estadoDeCuenta } from "@/lib/contabilidad/estado-cuenta";
import { conveniosActivos, diasEntre, TRAMOS, tramoDe, type Tramo } from "@/lib/contabilidad/cobranza";
import { todayInTimeZone } from "@/lib/utils";
import { usd } from "@/lib/format";
import { Dato, Documento } from "@/components/documentos/documento";

const corta = (d: string) =>
  new Date(`${d}T12:00:00Z`).toLocaleDateString("es-VE", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });

/** Estado de cuenta de una unidad, listo para imprimir o guardar como PDF. */
export default async function EstadoDeCuentaPage({ params }: { params: Promise<{ unitId: string }> }) {
  const { unitId } = await params;
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) redirect("/login");
  if (!(await puedeVerUnidad(profile, unitId))) notFound();

  const db = createAdminClient();
  const cuenta = await estadoDeCuenta(db, unitId);
  if (!cuenta) notFound();
  const membrete = await membreteDe(cuenta.unidad.organizationId);
  const hoy = todayInTimeZone(membrete.timezone);
  const convenio = (await conveniosActivos(db, cuenta.unidad.organizationId, hoy)).get(unitId) ?? null;

  const tramos: Record<Tramo, number> = { corriente: 0, d30: 0, d60: 0, d90: 0, d90mas: 0 };
  for (const c of cuenta.abiertas) tramos[tramoDe(diasEntre(c.vence, hoy))] += c.pendiente;

  return (
    <Documento
      membrete={membrete}
      tipo="Estado de cuenta"
      numero={cuenta.unidad.etiqueta}
      fecha={`Al ${fechaLarga(hoy)}`}
      volver={isAdminRole(profile) ? { href: `/admin/cuentas/${unitId}`, texto: "Cuenta de la unidad" } : { href: "/pagos", texto: "Pagos" }}
      sello={cuenta.deuda <= 0 ? { texto: "Solvente", tono: "bien" } : null}
      ancho="max-w-4xl"
      pie="Cargos: recibos emitidos y saldo anterior. Abonos: pagos aprobados, saldo a favor aplicado y notas de crédito. Un recibo anulado aparece con su nota de crédito."
    >
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
        <Dato etiqueta="PROPIETARIO">{cuenta.propietarios.map((p) => p.nombre).filter(Boolean).join(", ") || "—"}</Dato>
        {cuenta.unidad.alicuota != null && (
          <Dato etiqueta="ALÍCUOTA">{cuenta.unidad.alicuota.toLocaleString("es-VE", { maximumFractionDigits: 6 })} %</Dato>
        )}
        <Dato etiqueta="SALDO DEUDOR">
          <span className={`font-semibold ${cuenta.deuda > 0 ? "text-ember-ink" : "text-emerald-700"}`}>{usd(cuenta.deuda)}</span>
        </Dato>
        <Dato etiqueta="SALDO A FAVOR">{usd(Math.max(cuenta.saldoAFavor, 0))}</Dato>
      </dl>

      {cuenta.deuda > 0 && (
        <table className="mt-6 w-full text-[12px]">
          <thead>
            <tr className="text-[10.5px] uppercase tracking-[0.06em] text-mute">
              {TRAMOS.map((t) => (
                <th key={t.clave} className="border-b border-border py-1.5 text-right font-medium">
                  {t.etiqueta}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {TRAMOS.map((t) => (
                <td key={t.clave} className="py-1.5 text-right tabular-nums">
                  {tramos[t.clave] > 0 ? usd(tramos[t.clave]) : "—"}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      )}

      {convenio && (
        <p className="mt-4 rounded-lg bg-frost px-3 py-2 text-[12.5px]">
          Convenio de pago en curso: {convenio.convenio.installments} cuotas por {usd(convenio.convenio.total)}. Pagado{" "}
          {usd(convenio.pagado)} · {convenio.alDia ? "al día" : `atrasado por ${usd(convenio.atraso)}`}.
        </p>
      )}

      <table className="mt-7 w-full text-[12.5px]">
        <thead>
          <tr className="border-b border-marine-deep/30 text-left text-[10.5px] uppercase tracking-[0.06em] text-mute">
            <th className="py-2 pr-2 font-medium">Fecha</th>
            <th className="py-2 pr-2 font-medium">Documento</th>
            <th className="py-2 pr-2 font-medium">Concepto</th>
            <th className="py-2 pl-2 text-right font-medium">Cargo</th>
            <th className="py-2 pl-2 text-right font-medium">Abono</th>
            <th className="py-2 pl-2 text-right font-medium">Saldo</th>
          </tr>
        </thead>
        <tbody>
          {cuenta.movimientos.map((m, i) => (
            <tr key={i} className={`border-b border-border break-inside-avoid ${m.estado === "cancelled" ? "text-mute" : ""}`}>
              <td className="py-1.5 pr-2 whitespace-nowrap">{corta(m.fecha)}</td>
              <td className="py-1.5 pr-2 whitespace-nowrap font-mono text-[11.5px]">{m.documento}</td>
              <td className="py-1.5 pr-2">{m.concepto}{m.estado === "cancelled" ? " (anulado)" : ""}</td>
              <td className="py-1.5 pl-2 text-right tabular-nums">{m.cargo ? usd(m.cargo) : ""}</td>
              <td className="py-1.5 pl-2 text-right tabular-nums">{m.abono ? usd(m.abono) : ""}</td>
              <td className="py-1.5 pl-2 text-right font-medium tabular-nums">{usd(m.saldo)}</td>
            </tr>
          ))}
          {cuenta.movimientos.length === 0 && (
            <tr>
              <td colSpan={6} className="py-6 text-center text-mute">
                Sin movimientos.
              </td>
            </tr>
          )}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={5} className="pt-3 text-right font-meta text-mute">
              SALDO AL {corta(hoy)}
            </td>
            <td className="pt-3 text-right font-display text-[17px] tabular-nums">{usd(cuenta.deuda)}</td>
          </tr>
        </tfoot>
      </table>
    </Documento>
  );
}
