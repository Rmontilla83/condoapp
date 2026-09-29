import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentProfile, getOrganization } from "@/lib/queries";
import { isAdminRole } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { todayInTimeZone } from "@/lib/utils";
import { usd } from "@/lib/format";
import { estadoDeCuenta } from "@/lib/contabilidad/estado-cuenta";
import { conveniosActivos, diasEntre } from "@/lib/contabilidad/cobranza";
import { ETIQUETA_TIPO } from "@/lib/cuotas";
import { Cifra, Cifras, Encabezado, EstadoRecibo, tabla, Vacio } from "@/components/contabilidad/ui";
import { AccionesCuenta, AnularRecibo, CerrarConvenio } from "./acciones";

const fechaCorta = (d: string) =>
  new Date(`${d}T12:00:00Z`).toLocaleDateString("es-VE", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });

export default async function CuentaUnidadPage({ params }: { params: Promise<{ unitId: string }> }) {
  const { unitId } = await params;
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return null;
  if (!isAdminRole(profile)) redirect("/dashboard");

  const db = createAdminClient();
  const org = await getOrganization(profile.organization_id);
  const tz = (org?.timezone as string) || "America/Caracas";
  const hoy = todayInTimeZone(tz);
  const cuenta = await estadoDeCuenta(db, unitId, tz);
  if (!cuenta || cuenta.unidad.organizationId !== profile.organization_id) notFound();
  const convenio = (await conveniosActivos(db, profile.organization_id, hoy)).get(unitId) ?? null;

  const vencido = cuenta.abiertas.filter((c) => c.vence < hoy).reduce((s, c) => s + c.pendiente, 0);
  const masAntigua = cuenta.abiertas.find((c) => c.vence < hoy);
  const dueno = cuenta.propietarios[0];

  return (
    <div className="space-y-8">
      <div data-print-hide>
        <Link href="/admin/cuentas" className="text-[13px] text-cyan-ink hover:underline">
          ← Cuentas por cobrar
        </Link>
      </div>
      <Encabezado
        eyebrow="CUENTA DE LA UNIDAD"
        titulo={cuenta.unidad.etiqueta}
        descripcion={
          <>
            {cuenta.propietarios.map((p) => p.nombre).filter(Boolean).join(", ") || "Sin propietario cargado"}
            {dueno?.telefono ? ` · ${dueno.telefono}` : ""}
            {dueno?.correo ? ` · ${dueno.correo}` : ""}
            {cuenta.unidad.alicuota != null ? ` · Alícuota ${cuenta.unidad.alicuota.toLocaleString("es-VE", { maximumFractionDigits: 6 })} %` : ""}
          </>
        }
        acciones={
          <>
            <AccionesCuenta
              unitId={unitId}
              hoy={hoy}
              deudaVencida={Math.round(vencido * 100) / 100}
              tieneConvenio={!!convenio}
            />
            <Link
              href={`/estado-de-cuenta/${unitId}`}
              className="inline-flex h-9 items-center rounded-lg border border-border px-3.5 text-[13px] font-medium text-marine-deep hover:bg-frost"
            >
              Estado de cuenta para imprimir
            </Link>
          </>
        }
      />

      <Cifras>
        <Cifra etiqueta="DEUDA TOTAL" valor={usd(cuenta.deuda)} detalle={`${cuenta.abiertas.length} recibo${cuenta.abiertas.length !== 1 ? "s" : ""} abierto${cuenta.abiertas.length !== 1 ? "s" : ""}`} />
        <Cifra
          etiqueta="VENCIDO"
          valor={usd(vencido)}
          tono={vencido > 0 ? "alerta" : "bien"}
          detalle={masAntigua ? `El más antiguo, hace ${diasEntre(masAntigua.vence, hoy)} días` : "Nada vencido"}
        />
        <Cifra etiqueta="SALDO A FAVOR" valor={usd(Math.max(cuenta.saldoAFavor, 0))} detalle="Se aplica solo al próximo recibo" />
        <Cifra
          etiqueta="CONVENIO"
          valor={convenio ? (convenio.alDia ? "Al día" : "Atrasado") : "—"}
          tono={convenio ? (convenio.alDia ? "bien" : "alerta") : "neutro"}
          detalle={convenio ? `${usd(convenio.pagado)} de ${usd(convenio.convenio.total)} pagado` : "Sin convenio activo"}
        />
      </Cifras>

      {convenio && (
        <section className="space-y-3 rounded-2xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-meta text-mute">CONVENIO DE PAGO</p>
              <p className="mt-1 text-[15px] text-marine-deep">
                {convenio.convenio.installments} cuotas mensuales por {usd(convenio.convenio.total)} · firmado el{" "}
                {fechaCorta(convenio.convenio.created_at.slice(0, 10))}
              </p>
              {convenio.convenio.notes && <p className="mt-1 text-[13px] text-mute">{convenio.convenio.notes}</p>}
              {!convenio.alDia && (
                <p className="mt-2 text-[13px] font-medium text-destructive">
                  Atrasado por {usd(convenio.atraso)}: el calendario pedía {usd(convenio.exigido)} a la fecha.
                </p>
              )}
            </div>
            <CerrarConvenio planId={convenio.convenio.id} completado={convenio.completado} />
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {convenio.calendario.map((q) => {
              const cubierta = convenio.pagado + 0.009 >= q.acumulado;
              const vencida = q.vence <= hoy;
              return (
                <div
                  key={q.n}
                  className={`min-w-[6.5rem] rounded-lg border px-2.5 py-2 text-[12px] ${
                    cubierta ? "border-emerald-200 bg-emerald-50" : vencida ? "border-red-200 bg-red-50" : "border-border"
                  }`}
                >
                  <p className="font-meta text-mute">CUOTA {q.n}</p>
                  <p className="mt-0.5 font-medium tabular-nums text-marine-deep">{usd(q.monto)}</p>
                  <p className="text-mute">{fechaCorta(q.vence)}</p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="font-display text-[19px] text-marine-deep">Recibos abiertos</h2>
        {cuenta.abiertas.length === 0 ? (
          <Vacio>Esta unidad está al día.</Vacio>
        ) : (
          <div className={tabla.contenedor}>
            <table className={tabla.tabla}>
              <thead className={tabla.thead}>
                <tr>
                  <th className={tabla.th}>Recibo</th>
                  <th className={tabla.th}>Concepto</th>
                  <th className={tabla.th}>Vence</th>
                  <th className={tabla.thNum}>Monto</th>
                  <th className={tabla.thNum}>Abonado</th>
                  <th className={tabla.thNum}>Pendiente</th>
                  <th className={tabla.th} />
                </tr>
              </thead>
              <tbody>
                {cuenta.abiertas.map((c) => (
                  <tr key={c.id}>
                    <td className={`${tabla.td} whitespace-nowrap font-mono text-[12px]`}>
                      <Link href={`/recibos/${c.id}`} className="text-cyan-ink hover:underline">
                        {c.numero}
                      </Link>
                    </td>
                    <td className={tabla.td}>
                      {c.concepto}
                      {c.tipo !== "monthly" && <span className="block text-[11px] text-mute">{ETIQUETA_TIPO[c.tipo]}</span>}
                      {c.enRevision && <span className="mt-1 block text-[11px] font-medium text-amber-700">Comprobante en revisión</span>}
                    </td>
                    <td className={`${tabla.td} whitespace-nowrap`}>
                      {fechaCorta(c.vence)}
                      <span className="mt-1 block">
                        <EstadoRecibo estado={c.abonado > 0 ? "partial" : "pending"} vencido={c.vence < hoy} />
                      </span>
                    </td>
                    <td className={tabla.tdNum}>{usd(c.monto)}</td>
                    <td className={tabla.tdNum}>{c.abonado > 0 ? usd(c.abonado) : "—"}</td>
                    <td className={`${tabla.tdNum} font-semibold text-marine-deep`}>{usd(c.pendiente)}</td>
                    <td className={`${tabla.td} text-right`}>
                      {!c.tieneDineroReal && <AnularRecibo invoiceId={c.id} numero={c.numero} />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-[19px] text-marine-deep">Movimientos</h2>
        {cuenta.movimientos.length === 0 ? (
          <Vacio>Todavía no hay movimientos.</Vacio>
        ) : (
          <div className={tabla.contenedor}>
            <table className={tabla.tabla}>
              <thead className={tabla.thead}>
                <tr>
                  <th className={tabla.th}>Fecha</th>
                  <th className={tabla.th}>Documento</th>
                  <th className={tabla.th}>Concepto</th>
                  <th className={tabla.thNum}>Cargo</th>
                  <th className={tabla.thNum}>Abono</th>
                  <th className={tabla.thNum}>Saldo</th>
                </tr>
              </thead>
              <tbody>
                {cuenta.movimientos.map((m, i) => (
                  <tr key={i} className={m.estado === "cancelled" ? "text-mute" : ""}>
                    <td className={`${tabla.td} whitespace-nowrap`}>{fechaCorta(m.fecha)}</td>
                    <td className={`${tabla.td} whitespace-nowrap font-mono text-[12px]`}>
                      {m.invoiceId && (m.tipo === "recibo" || m.tipo === "apertura") ? (
                        <Link href={`/recibos/${m.invoiceId}`} className="text-cyan-ink hover:underline">
                          {m.documento}
                        </Link>
                      ) : (
                        m.documento
                      )}
                    </td>
                    <td className={tabla.td}>
                      {m.concepto}
                      {m.estado === "cancelled" && <span className="ml-2"><EstadoRecibo estado="cancelled" /></span>}
                    </td>
                    <td className={tabla.tdNum}>{m.cargo ? usd(m.cargo) : ""}</td>
                    <td className={`${tabla.tdNum} text-emerald-700`}>{m.abono ? usd(m.abono) : ""}</td>
                    <td className={`${tabla.tdNum} font-medium text-marine-deep`}>{usd(m.saldo)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
