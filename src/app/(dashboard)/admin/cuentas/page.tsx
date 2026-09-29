import { redirect } from "next/navigation";
import { getCurrentProfile, getOrganization } from "@/lib/queries";
import { isAdminRole } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { todayInTimeZone } from "@/lib/utils";
import { antiguedadDeSaldos, TRAMOS } from "@/lib/contabilidad/cobranza";
import { usd } from "@/lib/format";
import { Cifra, Cifras, Encabezado, Pestanas, PESTANAS_CUENTAS } from "@/components/contabilidad/ui";
import { TablaAntiguedad } from "./tabla-antiguedad";

export default async function CuentasPage() {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return null;
  if (!isAdminRole(profile)) redirect("/dashboard");

  const org = await getOrganization(profile.organization_id);
  const hoy = todayInTimeZone((org?.timezone as string) || undefined);
  const filas = await antiguedadDeSaldos(createAdminClient(), profile.organization_id, hoy);

  const total = filas.reduce((s, f) => s + f.total, 0);
  const vencido = filas.reduce((s, f) => s + f.vencido, 0);
  const morosas = filas.filter((f) => f.vencido > 0).length;
  const convenios = filas.filter((f) => f.convenio);
  const porTramo = TRAMOS.map((t) => ({ ...t, monto: filas.reduce((s, f) => s + f.tramos[t.clave], 0) }));
  const fechaCorte = new Date(`${hoy}T12:00:00Z`).toLocaleDateString("es-VE", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

  return (
    <div className="space-y-8">
      <Encabezado
        eyebrow="CONTABILIDAD"
        titulo="Cuentas por cobrar"
        descripcion={<>Lo que debe cada unidad al {fechaCorte}, ordenado por antigüedad. Toca una unidad para ver su estado de cuenta, registrar un pago o acordar un convenio.</>}
      />
      <Pestanas items={PESTANAS_CUENTAS} actual="/admin/cuentas" />

      <Cifras>
        <Cifra etiqueta="POR COBRAR" valor={usd(total)} detalle="Recibos abiertos, vencidos o no" />
        <Cifra etiqueta="VENCIDO" valor={usd(vencido)} tono={vencido > 0 ? "alerta" : "bien"} detalle={total > 0 ? `${Math.round((vencido / total) * 100)} % de lo por cobrar` : "Nada vencido"} />
        <Cifra etiqueta="UNIDADES CON ATRASO" valor={morosas} detalle={`de ${filas.length} unidades`} />
        <Cifra
          etiqueta="EN CONVENIO"
          valor={convenios.length}
          detalle={convenios.length ? `${convenios.filter((f) => f.convenio!.alDia).length} al día` : "Ninguno activo"}
        />
      </Cifras>

      {total > 0 && (
        <section aria-label="Antigüedad del saldo" className="rounded-2xl border border-border bg-card p-5">
          <p className="font-meta text-mute">ANTIGÜEDAD DEL SALDO</p>
          <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-frost">
            {porTramo.map((t, i) =>
              t.monto > 0 ? (
                <span
                  key={t.clave}
                  title={`${t.etiqueta}: ${usd(t.monto)}`}
                  style={{ width: `${(t.monto / total) * 100}%` }}
                  className={["bg-cyan", "bg-amber-400", "bg-ember", "bg-red-500", "bg-red-800"][i]}
                />
              ) : null,
            )}
          </div>
          <ul className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1.5 sm:grid-cols-5">
            {porTramo.map((t, i) => (
              <li key={t.clave} className="flex items-center gap-2 text-[13px]">
                <span className={`h-2.5 w-2.5 rounded-full ${["bg-cyan", "bg-amber-400", "bg-ember", "bg-red-500", "bg-red-800"][i]}`} />
                <span className="text-mute">{t.etiqueta}</span>
                <span className="ml-auto font-medium tabular-nums text-marine-deep">{usd(t.monto)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <TablaAntiguedad
        filas={filas.map((f) => ({
          unitId: f.unitId,
          etiqueta: f.etiqueta,
          torre: f.torre,
          propietario: f.propietario,
          tramos: f.tramos,
          total: f.total,
          vencido: f.vencido,
          diasMayor: f.diasMayor,
          saldoAFavor: f.saldoAFavor,
          convenio: f.convenio ? { alDia: f.convenio.alDia, atraso: f.convenio.atraso } : null,
        }))}
        fecha={hoy}
      />
    </div>
  );
}
