import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile, getOrganization } from "@/lib/queries";
import { getUserMembership, isAdminRole } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { CATEGORIAS, documentosParaVecino, tamanoLegible, type CategoriaDocumento } from "@/lib/documentos-condominio";
import { ESTADOS_CENSO, avanceDelCenso, estadosDeUnidades, type EstadoCenso } from "@/lib/censo";
import { ESTADO_TAREA, tareasDeLaJunta } from "@/lib/junta";

/**
 * Lo que la Junta decidió mostrarles a los vecinos (migration 071): los
 * documentos publicados, el estado de la documentación de su unidad y las
 * tareas de la Junta que estén a la vista.
 */
export default async function DocumentosPage() {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) redirect("/dashboard");
  const orgId = profile.organization_id;
  const esAdmin = isAdminRole(profile);

  const [org, membresia] = await Promise.all([getOrganization(orgId), getUserMembership(profile.id)]);
  const esPropietario = esAdmin || membresia.isOwner;
  const censoVisible = ((org?.censo_visible as string) ?? "administracion") as "administracion" | "propio" | "todos";
  const zona = (org?.timezone as string) || "America/Caracas";
  const cuando = (iso: string) => new Date(iso).toLocaleDateString("es-VE", { timeZone: zona, day: "2-digit", month: "long", year: "numeric" });
  const fecha = (d: string) => d.split("-").reverse().join("/");

  const [documentos, tareas, misUnidades, estadosMios, avance] = await Promise.all([
    documentosParaVecino(orgId, esPropietario),
    tareasDeLaJunta(orgId, true),
    // El estado de la documentación es del propietario: un inquilino no lo ve.
    censoVisible !== "administracion" && membresia.ownerUnits.length
      ? createAdminClient().from("units").select("id, unit_number, block").in("id", membresia.ownerUnits).eq("organization_id", orgId)
      : Promise.resolve({ data: [] as { id: string; unit_number: string; block: string | null }[] }),
    censoVisible !== "administracion" && membresia.ownerUnits.length ? estadosDeUnidades(orgId, membresia.ownerUnits) : Promise.resolve(new Map<string, EstadoCenso>()),
    censoVisible === "todos" && esPropietario
      ? Promise.all([createAdminClient().from("units").select("id").eq("organization_id", orgId), estadosDeUnidades(orgId)]).then(([u, e]) =>
          avanceDelCenso((u.data ?? []).map((x) => ({ estado: e.get(x.id as string) ?? ("rojo" as EstadoCenso) }))),
        )
      : Promise.resolve(null),
  ]);

  const grupos = (Object.keys(CATEGORIAS) as CategoriaDocumento[])
    .map((c) => ({ categoria: c, docs: documentos.filter((d) => d.categoria === c) }))
    .filter((g) => g.docs.length > 0);
  const unidades = (misUnidades.data ?? []) as { id: string; unit_number: string; block: string | null }[];
  const vacio = grupos.length === 0 && tareas.length === 0 && unidades.length === 0 && !avance;

  return (
    <div className="space-y-10">
      <div>
        <span className="font-meta-loose text-cyan-ink">CONDOMINIO</span>
        <h1 className="mt-4 font-display text-[clamp(1.75rem,3.5vw,2.5rem)] leading-[1.1] tracking-[-0.03em] text-marine-deep">Documentos</h1>
        <p className="mt-3 max-w-2xl text-[15px] text-mute">Los documentos que la Junta publicó, la documentación de tu unidad y el trabajo que la Junta tiene en marcha.</p>
        {esAdmin && (
          <Link href="/admin/documentos" className="mt-3 inline-block text-[13px] text-cyan-ink hover:underline">
            Ir a la gestión de documentos
          </Link>
        )}
      </div>

      {vacio && <p className="rounded-2xl border border-dashed border-border px-6 py-10 text-center text-[14px] text-mute">La Junta todavía no ha publicado documentos ni tareas.</p>}

      {grupos.map((g) => (
        <section key={g.categoria} className="space-y-3">
          <h2 className="text-[15px] font-semibold text-marine-deep">{CATEGORIAS[g.categoria]}</h2>
          <ul className="space-y-3">
            {g.docs.map((d) => {
              const [vigente, ...anteriores] = d.versiones;
              return (
                <li key={d.id} className="rounded-2xl border border-border bg-card p-4 sm:p-5">
                  <p className="font-medium text-marine-deep">{d.titulo}</p>
                  {d.descripcion && <p className="mt-0.5 text-[13.5px] text-mute">{d.descripcion}</p>}
                  <p className="mt-3 text-[14px]">
                    <a href={`/documentos/ver/${vigente.id}`} target="_blank" rel="noopener" className="font-medium text-cyan-ink hover:underline">
                      Abrir el documento
                    </a>{" "}
                    <span className="text-[12px] text-mute">
                      Versión {vigente.numero}, publicada el {cuando(vigente.revisado_en ?? vigente.subido_en)}. {tamanoLegible(vigente.archivo_tamano)}
                    </span>
                  </p>
                  {vigente.nota && <p className="mt-1 text-[12px] text-mute">{vigente.nota}</p>}
                  {anteriores.length > 0 && (
                    <details className="mt-3 text-[13px]">
                      <summary className="cursor-pointer text-mute">Versiones anteriores ({anteriores.length})</summary>
                      <ul className="mt-2 space-y-1">
                        {anteriores.map((v) => (
                          <li key={v.id}>
                            <a href={`/documentos/ver/${v.id}`} target="_blank" rel="noopener" className="text-cyan-ink hover:underline">
                              Versión {v.numero}
                            </a>{" "}
                            <span className="text-[12px] text-mute">
                              publicada el {cuando(v.revisado_en ?? v.subido_en)}
                              {v.nota ? `. ${v.nota}` : ""}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      {(unidades.length > 0 || avance) && (
        <section className="space-y-3">
          <h2 className="text-[15px] font-semibold text-marine-deep">Censo de propietarios</h2>
          <p className="max-w-2xl text-[13.5px] text-mute">
            La administradora recibe y valida la documentación de propiedad de cada unidad, y la Junta la aprueba. Si te falta entregar algo, comunícate con la administración.
          </p>
          {unidades.map((u) => {
            const e = ESTADOS_CENSO[estadosMios.get(u.id) ?? "rojo"];
            return (
              <div key={u.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4">
                <span aria-hidden className={`h-3 w-3 rounded-full ${e.punto}`} />
                <span className="font-medium text-marine-deep">
                  {u.block ? `${u.block} ` : ""}
                  {u.unit_number}: {e.nombre}
                </span>
                <span className="text-[13px] text-mute">{e.detalle}</span>
              </div>
            );
          })}
          {avance && (
            <p className="text-[13.5px] text-marine-deep">
              En todo el condominio: {avance.verde} de {avance.total} unidades aprobadas, {avance.validada} validadas a la espera de la Junta, {avance.naranja} con entrega parcial y {avance.rojo} sin entregar.
            </p>
          )}
        </section>
      )}

      {tareas.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-[15px] font-semibold text-marine-deep">En qué trabaja la Junta</h2>
          <ul className="space-y-3">
            {tareas.map((t) => (
              <li key={t.id} className="rounded-2xl border border-border bg-card p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <p className="min-w-0 font-medium text-marine-deep">{t.titulo}</p>
                  <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${ESTADO_TAREA[t.estado].clase}`}>{ESTADO_TAREA[t.estado].nombre}</span>
                </div>
                {t.detalle && <p className="mt-1 whitespace-pre-line text-[13.5px] text-marine-deep/80">{t.detalle}</p>}
                {t.fecha_objetivo && t.estado !== "hecha" && <p className="mt-2 text-[12px] text-mute">Fecha objetivo: {fecha(t.fecha_objetivo)}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
