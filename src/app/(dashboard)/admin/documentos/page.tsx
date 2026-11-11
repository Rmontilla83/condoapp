import { redirect } from "next/navigation";
import { getCurrentProfile, getOrganization } from "@/lib/queries";
import { funcionDe, isAdminRole, puede } from "@/lib/permissions";
import {
  CATEGORIAS,
  VISIBILIDAD,
  documentosDelCondominio,
  tamanoLegible,
  type CategoriaDocumento,
  type VersionDocumento,
} from "@/lib/documentos-condominio";
import { Encabezado, Vacio } from "@/components/contabilidad/ui";
import { Archivar, NuevaVersion, NuevoDocumento, RevisarVersion, Visibilidad } from "./formularios";

const ESTADO: Record<VersionDocumento["estado"], { texto: string; clase: string }> = {
  en_revision: { texto: "En revisión", clase: "bg-amber-50 text-amber-800 border-amber-200" },
  publicada: { texto: "Publicada", clase: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  rechazada: { texto: "Devuelta", clase: "bg-marine-deep/5 text-mute border-border" },
};

export default async function DocumentosAdminPage() {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return null;
  if (!isAdminRole(profile)) redirect("/dashboard");
  const orgId = profile.organization_id;

  const sube = puede(profile, "cargar") || puede(profile, "aprobar_junta");
  const aprueba = puede(profile, "aprobar_junta");
  const archiva = puede(profile, "administrar") || aprueba;
  const completa = funcionDe(profile) === "completa";

  const [org, documentos] = await Promise.all([getOrganization(orgId), documentosDelCondominio(orgId)]);
  const zona = (org?.timezone as string) || "America/Caracas";
  const cuando = (iso: string) => new Date(iso).toLocaleDateString("es-VE", { timeZone: zona, day: "2-digit", month: "2-digit", year: "numeric" });
  const categorias = (Object.keys(CATEGORIAS) as CategoriaDocumento[]).map((c) => ({ valor: c, nombre: CATEGORIAS[c] }));
  const visibilidades = Object.entries(VISIBILIDAD).map(([valor, nombre]) => ({ valor, nombre }));
  const pendientes = documentos.reduce((s, d) => s + d.versiones.filter((v) => v.estado === "en_revision").length, 0);

  return (
    <div className="space-y-8">
      <Encabezado
        eyebrow="CONTROL INTERNO"
        titulo="Documentos"
        descripcion="El documento de condominio, el reglamento, las actas y los soportes de la gestión. Cada versión se sube en revisión, la Junta la publica, y una versión nueva no borra la anterior."
      />

      {pendientes > 0 && (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[14px] text-amber-900">
          {pendientes === 1 ? "Hay 1 versión en revisión" : `Hay ${pendientes} versiones en revisión`}.{" "}
          {aprueba ? "Están marcadas abajo para que las publiques o las devuelvas." : "Las publica la Junta de Condominio."}
        </p>
      )}

      {documentos.length === 0 ? (
        <Vacio>Todavía no hay documentos. {sube ? "Sube el primero con el formulario de abajo." : "Los sube la administración."}</Vacio>
      ) : (
        categorias
          .map((c) => ({ ...c, docs: documentos.filter((d) => d.categoria === c.valor) }))
          .filter((c) => c.docs.length > 0)
          .map((c) => (
            <section key={c.valor} className="space-y-3">
              <h2 className="text-[15px] font-semibold text-marine-deep">{c.nombre}</h2>
              <ul className="space-y-3">
                {c.docs.map((d) => {
                  const vigente = d.versiones.find((v) => v.estado === "publicada");
                  return (
                    <li key={d.id} className="rounded-2xl border border-border bg-card p-4 sm:p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium text-marine-deep">{d.titulo}</p>
                          {d.descripcion && <p className="mt-0.5 text-[13px] text-mute">{d.descripcion}</p>}
                          <p className="mt-1 text-[12px] text-mute">
                            {vigente ? `Versión vigente: ${vigente.numero}, publicada el ${cuando(vigente.revisado_en ?? vigente.subido_en)}.` : "Sin versión publicada: los vecinos todavía no lo ven."}
                          </p>
                        </div>
                        <div className="text-right text-[12px] text-mute">
                          <span className="block">Lo ve</span>
                          {aprueba ? <Visibilidad documentoId={d.id} actual={d.visible_para} opciones={visibilidades} /> : <span className="font-medium text-marine-deep">{VISIBILIDAD[d.visible_para]}</span>}
                        </div>
                      </div>

                      <ol className="mt-4 space-y-3 border-t border-border pt-3">
                        {d.versiones.map((v) => (
                          <li key={v.id} className="text-[13px]">
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                              <span className="font-medium tabular-nums text-marine-deep">Versión {v.numero}</span>
                              <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${ESTADO[v.estado].clase}`}>{ESTADO[v.estado].texto}</span>
                              <a href={`/documentos/ver/${v.id}`} target="_blank" rel="noopener" className="text-cyan-ink hover:underline">
                                Abrir {v.archivo_nombre}
                              </a>
                              <span className="text-mute">{tamanoLegible(v.archivo_tamano)}</span>
                            </div>
                            <p className="mt-0.5 text-[12px] text-mute">
                              Subida el {cuando(v.subido_en)}
                              {v.subio ? ` por ${v.subio}` : ""}.
                              {v.revisado_en && ` ${v.estado === "publicada" ? "Publicada" : "Devuelta"} el ${cuando(v.revisado_en)}${v.reviso ? ` por ${v.reviso}` : ""}.`}
                            </p>
                            {v.nota && <p className="text-[12px] text-marine-deep/80">Nota: {v.nota}</p>}
                            {v.comentario_revision && <p className="text-[12px] text-marine-deep/80">Revisión: {v.comentario_revision}</p>}
                            {v.estado === "en_revision" &&
                              aprueba &&
                              (v.subido_por === profile.id && !completa ? (
                                <p className="mt-1 text-[12px] text-mute">La subiste tú: debe publicarla otra persona de la Junta.</p>
                              ) : (
                                <RevisarVersion versionId={v.id} />
                              ))}
                          </li>
                        ))}
                        {d.versiones.length === 0 && <li className="text-[13px] text-mute">Sin versiones.</li>}
                      </ol>

                      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                        {sube ? <NuevaVersion documentoId={d.id} /> : <span />}
                        {archiva && <Archivar documentoId={d.id} />}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
      )}

      {sube && (
        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <h2 className="mb-4 text-[15px] font-semibold text-marine-deep">Subir un documento nuevo</h2>
          <NuevoDocumento categorias={categorias} visibilidades={visibilidades} puedeElegirVisibilidad={aprueba} />
        </section>
      )}
    </div>
  );
}
