import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile, getOrganization } from "@/lib/queries";
import { isAdminRole, puede } from "@/lib/permissions";
import { ESTADOS_CENSO, avanceDelCenso, censoDelCondominio, type EstadoCenso } from "@/lib/censo";
import { Cifra, Cifras, Encabezado, Vacio, tabla } from "@/components/contabilidad/ui";
import { AccionesCenso, AprobarValidadas, VisibilidadCenso } from "./acciones";

const ORDEN: EstadoCenso[] = ["rojo", "naranja", "validada", "verde"];

export default async function CensoPage({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return null;
  if (!isAdminRole(profile)) redirect("/dashboard");
  const orgId = profile.organization_id;
  const filtro = ORDEN.includes((await searchParams).estado as EstadoCenso) ? ((await searchParams).estado as EstadoCenso) : null;

  const puedeRecibir = puede(profile, "cargar");
  const puedeValidar = puede(profile, "administrar");
  const puedeAprobar = puede(profile, "aprobar_junta");

  const [org, filas] = await Promise.all([getOrganization(orgId), censoDelCondominio(orgId)]);
  const avance = avanceDelCenso(filas);
  const zona = (org?.timezone as string) || "America/Caracas";
  const cuando = (iso: string) => new Date(iso).toLocaleDateString("es-VE", { timeZone: zona, day: "2-digit", month: "2-digit", year: "numeric" });
  const lista = filtro ? filas.filter((f) => f.estado === filtro) : filas;
  const pct = (n: number) => (avance.total ? `${Math.round((n / avance.total) * 100)} % de las unidades` : "");

  return (
    <div className="space-y-8">
      <Encabezado
        eyebrow="CONTROL INTERNO"
        titulo="Censo documental"
        descripcion="Qué unidades entregaron su documentación de propiedad. La recibe y la resguarda la administradora; Atryum no guarda esos documentos, solo el estado y quién lo marcó. Una unidad queda en verde cuando la administradora la valida y la Junta la aprueba."
      />

      <Cifras>
        <Cifra etiqueta="APROBADAS" valor={avance.verde} detalle={pct(avance.verde)} tono={avance.verde > 0 ? "bien" : "neutro"} />
        <Cifra etiqueta="VALIDADAS, FALTA LA JUNTA" valor={avance.validada} detalle={pct(avance.validada)} />
        <Cifra etiqueta="ENTREGA PARCIAL" valor={avance.naranja} detalle={pct(avance.naranja)} />
        <Cifra etiqueta="SIN ENTREGAR" valor={avance.rojo} detalle={pct(avance.rojo)} tono={avance.rojo > 0 ? "alerta" : "neutro"} />
      </Cifras>

      <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <h2 className="text-[15px] font-semibold text-marine-deep">Quién ve este avance</h2>
        <p className="mb-3 mt-1 text-[13px] text-mute">
          Los vecinos nunca ven las notas ni el estado de otra unidad: solo el de la suya y, si la Junta lo decide, los totales. {!puedeAprobar && "Lo decide la Junta de Condominio."}
        </p>
        <VisibilidadCenso actual={(org?.censo_visible as string) ?? "administracion"} editable={puedeAprobar} />
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <nav aria-label="Filtrar por estado" className="flex flex-wrap gap-2">
            {[null, ...ORDEN].map((e) => (
              <Link
                key={e ?? "todas"}
                href={e ? `/admin/censo?estado=${e}` : "/admin/censo"}
                aria-current={e === filtro ? "page" : undefined}
                className={`rounded-full border px-3 py-1.5 text-[13px] ${
                  e === filtro ? "border-marine-deep bg-marine-deep text-frost" : "border-border bg-card text-marine-deep hover:border-marine-deep"
                }`}
              >
                {e ? `${ESTADOS_CENSO[e].nombre} (${avance[e]})` : `Todas (${avance.total})`}
              </Link>
            ))}
          </nav>
          {puedeAprobar && avance.validada > 0 && <AprobarValidadas cuantas={avance.validada} />}
        </div>

        {lista.length === 0 ? (
          <Vacio>No hay unidades en este estado.</Vacio>
        ) : (
          <div className={tabla.contenedor}>
            <table className={tabla.tabla}>
              <thead className={tabla.thead}>
                <tr>
                  <th className={tabla.th}>Unidad</th>
                  <th className={tabla.th}>Propietario en Atryum</th>
                  <th className={tabla.th}>Documentación</th>
                  <th className={tabla.th}>Quién y cuándo</th>
                  <th className={tabla.th} />
                </tr>
              </thead>
              <tbody>
                {lista.map((f) => {
                  const e = ESTADOS_CENSO[f.estado];
                  return (
                    <tr key={f.unitId}>
                      <td className={`${tabla.td} whitespace-nowrap font-medium text-marine-deep`}>
                        {f.torre ? `${f.torre} ` : ""}
                        {f.numero}
                      </td>
                      <td className={tabla.td}>{f.propietarios.length ? f.propietarios.join(", ") : <span className="text-mute">Sin cuenta</span>}</td>
                      <td className={tabla.td}>
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${e.clase}`}>
                          <span aria-hidden className={`h-2 w-2 rounded-full ${e.punto}`} />
                          {e.nombre}
                        </span>
                        {f.nota && <span className="mt-1 block text-[12px] text-mute">{f.nota}</span>}
                      </td>
                      <td className={`${tabla.td} text-[12px] text-mute`}>
                        {f.actualizadoEn ? (
                          <>
                            <span className="block">
                              {cuando(f.actualizadoEn)}
                              {f.actualizo ? `, ${f.actualizo}` : ""}
                            </span>
                            {f.valido && <span className="block">Validó: {f.valido}</span>}
                            {f.aprobo && <span className="block">Aprobó: {f.aprobo}</span>}
                          </>
                        ) : (
                          "Sin movimientos"
                        )}
                      </td>
                      <td className={tabla.td}>
                        <AccionesCenso unitId={f.unitId} estado={f.estado} nota={f.nota} puedeRecibir={puedeRecibir} puedeValidar={puedeValidar} puedeAprobar={puedeAprobar} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
