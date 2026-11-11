import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile, getOrganization } from "@/lib/queries";
import { isAdminRole, puede } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { todayInTimeZone } from "@/lib/utils";
import { usd } from "@/lib/format";
import { CUENTA_FONDO, FONDOS, resumenFondo, type Fondo, type MovimientoFondo } from "@/lib/contabilidad/fondo-reserva";
import { Cifra, Cifras, Encabezado, Vacio, tabla } from "@/components/contabilidad/ui";
import { AnularMovimiento, ConfigFondo, NuevoMovimiento } from "./formularios";

const ETIQUETA: Record<MovimientoFondo["tipo"], string> = {
  inicial: "Saldo inicial",
  aporte: "Aporte adicional",
  ajuste: "Ajuste",
  cuota: "Aporte por cuota",
  gasto: "Gasto con el fondo",
};

const TITULO: Record<Fondo, string> = { reserva: "Fondo de reserva", contingencia: "Fondo de contingencia" };

const fecha = (d: string) => d.split("-").reverse().join("/");

export default async function FondosPage({ searchParams }: { searchParams: Promise<{ fondo?: string }> }) {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return null;
  if (!isAdminRole(profile)) redirect("/dashboard");
  const orgId = profile.organization_id;
  const cual: Fondo = (await searchParams).fondo === "contingencia" ? "contingencia" : "reserva";
  const administra = puede(profile, "administrar");

  const org = await getOrganization(orgId);
  const hoy = todayInTimeZone((org?.timezone as string) || undefined);
  const db = createAdminClient();
  const [fondo, otro] = await Promise.all([
    resumenFondo(db, orgId, cual),
    resumenFondo(db, orgId, cual === "reserva" ? "contingencia" : "reserva"),
  ]);
  const saldos: Record<Fondo, number> =
    cual === "reserva" ? { reserva: fondo.saldo, contingencia: otro.saldo } : { reserva: otro.saldo, contingencia: fondo.saldo };
  const tieneInicial = fondo.movimientos.some((m) => m.tipo === "inicial");
  const pct = cual === "reserva" ? org?.reserve_fund_pct : org?.contingency_fund_pct;
  const acta = cual === "reserva" ? org?.reserve_fund_acta : org?.contingency_fund_acta;

  return (
    <div className="space-y-8">
      <Encabezado
        eyebrow="CONTABILIDAD"
        titulo="Fondos"
        descripcion="Cuánto tiene cada fondo, de dónde vino y en qué se usó. Los vecinos ven los saldos en Finanzas. Para pagar un gasto con un fondo, márcalo al registrarlo en Finanzas, con el acta que lo aprueba."
      />

      <nav aria-label="Fondo" className="flex flex-wrap gap-2">
        {FONDOS.map((f) => (
          <Link
            key={f}
            href={f === "reserva" ? "/admin/fondo-reserva" : "/admin/fondo-reserva?fondo=contingencia"}
            aria-current={f === cual ? "page" : undefined}
            className={`rounded-full border px-4 py-2 text-[13px] ${
              f === cual ? "border-marine-deep bg-marine-deep text-frost" : "border-border bg-card text-marine-deep hover:border-marine-deep"
            }`}
          >
            {TITULO[f]} <span className="tabular-nums opacity-80">{usd(saldos[f])}</span>
          </Link>
        ))}
      </nav>

      <Cifras>
        <Cifra etiqueta="SALDO DISPONIBLE" valor={usd(fondo.saldo)} detalle="Lo cobrado, menos lo usado" tono={fondo.saldo > 0 ? "bien" : "neutro"} />
        <Cifra etiqueta="POR COBRAR" valor={usd(fondo.porCobrar)} detalle="Facturado y sin pagar todavía" />
        <Cifra etiqueta="APORTES COBRADOS" valor={usd(fondo.cobrado + fondo.aportes)} detalle={`Saldo inicial: ${usd(fondo.inicial)}`} />
        <Cifra etiqueta="USADO" valor={usd(fondo.usado)} detalle="Gastos pagados con el fondo" />
      </Cifras>

      {administra ? (
        <div className="grid gap-5 lg:grid-cols-2">
          <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
            <h2 className="mb-4 text-[15px] font-semibold text-marine-deep">Cuánto se aporta al {TITULO[cual].toLowerCase()}</h2>
            <ConfigFondo
              key={cual}
              fondo={cual}
              pct={pct === null || pct === undefined ? null : Number(pct)}
              acta={(acta as string) ?? null}
            />
          </section>
          <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
            <h2 className="mb-4 text-[15px] font-semibold text-marine-deep">{tieneInicial ? "Registrar un movimiento" : "Cargar el saldo inicial"}</h2>
            <NuevoMovimiento key={cual} fondo={cual} hoy={hoy} tieneInicial={tieneInicial} />
          </section>
        </div>
      ) : (
        <p className="rounded-2xl border border-border bg-card p-5 text-[14px] text-mute">
          Aporte sobre la cuota: {pct === null || pct === undefined ? "sin definir" : `${Number(pct).toLocaleString("es-VE")} %`}
          {acta ? `, según ${acta as string}` : ""}. El porcentaje y los movimientos los registra la administradora.
        </p>
      )}

      <section className="space-y-3">
        <h2 className="text-[15px] font-semibold text-marine-deep">Movimientos del {TITULO[cual].toLowerCase()}</h2>
        {fondo.movimientos.length === 0 ? (
          <Vacio>Todavía no hay movimientos. Empieza por el saldo inicial, si el condominio ya tenía este fondo.</Vacio>
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
                    <td className={tabla.td}>{administra && m.movimientoId && <AnularMovimiento id={m.movimientoId} />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-[12px] text-mute">
          En el libro, la cuenta {CUENTA_FONDO[cual]} {TITULO[cual]} es el saldo disponible más lo que falta por cobrar, porque la parte del fondo se registra al emitir el recibo.
        </p>
      </section>
    </div>
  );
}
