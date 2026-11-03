import { redirect } from "next/navigation";
import { getCurrentProfile, getOrganization } from "@/lib/queries";
import { isAdminRole } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { todayInTimeZone } from "@/lib/utils";
import { usd } from "@/lib/format";
import { resumenFondo, type MovimientoFondo } from "@/lib/contabilidad/fondo-reserva";
import { Cifra, Cifras, Encabezado, Vacio, tabla } from "@/components/contabilidad/ui";
import { AnularMovimiento, ConfigFondo, NuevoMovimiento } from "./formularios";

const ETIQUETA: Record<MovimientoFondo["tipo"], string> = {
  inicial: "Saldo inicial",
  aporte: "Aporte adicional",
  ajuste: "Ajuste",
  cuota: "Aporte por cuota",
  gasto: "Gasto con el fondo",
};

const fecha = (d: string) => d.split("-").reverse().join("/");

export default async function FondoReservaPage() {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return null;
  if (!isAdminRole(profile)) redirect("/dashboard");
  const orgId = profile.organization_id;

  const org = await getOrganization(orgId);
  const hoy = todayInTimeZone((org?.timezone as string) || undefined);
  const fondo = await resumenFondo(createAdminClient(), orgId);
  const tieneInicial = fondo.movimientos.some((m) => m.tipo === "inicial");

  return (
    <div className="space-y-8">
      <Encabezado
        eyebrow="CONTABILIDAD"
        titulo="Fondo de reserva"
        descripcion="Cuánto tiene el fondo, de dónde vino y en qué se usó. Los vecinos ven el saldo en Finanzas. Para pagar un gasto con el fondo, márcalo al registrarlo en Finanzas, con el acta que lo aprueba."
      />

      <Cifras>
        <Cifra etiqueta="SALDO DISPONIBLE" valor={usd(fondo.saldo)} detalle="Lo cobrado, menos lo usado" tono={fondo.saldo > 0 ? "bien" : "neutro"} />
        <Cifra etiqueta="POR COBRAR" valor={usd(fondo.porCobrar)} detalle="Facturado y sin pagar todavía" />
        <Cifra etiqueta="APORTES COBRADOS" valor={usd(fondo.cobrado + fondo.aportes)} detalle={`Saldo inicial: ${usd(fondo.inicial)}`} />
        <Cifra etiqueta="USADO" valor={usd(fondo.usado)} detalle="Gastos pagados con el fondo" />
      </Cifras>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <h2 className="mb-4 text-[15px] font-semibold text-marine-deep">Cuánto se aporta</h2>
          <ConfigFondo
            pct={org?.reserve_fund_pct === null || org?.reserve_fund_pct === undefined ? null : Number(org.reserve_fund_pct)}
            acta={(org?.reserve_fund_acta as string) ?? null}
          />
        </section>
        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <h2 className="mb-4 text-[15px] font-semibold text-marine-deep">{tieneInicial ? "Registrar un movimiento" : "Cargar el saldo inicial"}</h2>
          <NuevoMovimiento hoy={hoy} tieneInicial={tieneInicial} />
        </section>
      </div>

      <section className="space-y-3">
        <h2 className="text-[15px] font-semibold text-marine-deep">Movimientos</h2>
        {fondo.movimientos.length === 0 ? (
          <Vacio>Todavía no hay movimientos. Empieza por el saldo inicial, si el condominio ya tenía un fondo.</Vacio>
        ) : (
          <div className={tabla.contenedor}>
            <table className={tabla.tabla}>
              <thead className={tabla.thead}>
                <tr>
                  <th className={tabla.th}>Fecha</th>
                  <th className={tabla.th}>Tipo</th>
                  <th className={tabla.th}>Concepto</th>
                  <th className={tabla.thNum}>Monto</th>
                  <th className={tabla.th} />
                </tr>
              </thead>
              <tbody>
                {fondo.movimientos.map((m) => (
                  <tr key={m.clave}>
                    <td className={`${tabla.td} whitespace-nowrap`}>{fecha(m.fecha)}</td>
                    <td className={`${tabla.td} whitespace-nowrap text-mute`}>{ETIQUETA[m.tipo]}</td>
                    <td className={tabla.td}>
                      {m.concepto}
                      {m.referencia && <span className="block text-[12px] text-mute">{m.referencia}</span>}
                      {!!m.porCobrar && <span className="block text-[12px] text-mute">Por cobrar: {usd(m.porCobrar)}</span>}
                    </td>
                    <td className={`${tabla.tdNum} ${m.monto < 0 ? "text-destructive" : ""}`}>{usd(m.monto)}</td>
                    <td className={tabla.td}>{m.movimientoId && <AnularMovimiento id={m.movimientoId} />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-[12px] text-mute">
          En el libro, la cuenta 2.2.01 Fondo de reserva es el saldo disponible más lo que falta por cobrar, porque la parte del fondo se registra al emitir el recibo.
        </p>
      </section>
    </div>
  );
}
