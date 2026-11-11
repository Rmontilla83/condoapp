import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/queries";
import { isAdminRole, puede } from "@/lib/permissions";
import { ESTADO_TAREA, tareasDeLaJunta, type TareaJunta } from "@/lib/junta";
import { Cifra, Cifras, Encabezado, Vacio } from "@/components/contabilidad/ui";
import { EditarTarea, FormularioTarea } from "./formulario";

const ORDEN: TareaJunta["estado"][] = ["en_curso", "pendiente", "hecha"];
const fecha = (d: string) => d.split("-").reverse().join("/");

export default async function JuntaPage() {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return null;
  if (!isAdminRole(profile)) redirect("/dashboard");
  const edita = puede(profile, "decidir");

  const tareas = await tareasDeLaJunta(profile.organization_id, false);
  const cuenta = (e: TareaJunta["estado"]) => tareas.filter((t) => t.estado === e).length;

  return (
    <div className="space-y-8">
      <Encabezado
        eyebrow="JUNTA DE CONDOMINIO"
        titulo="Tareas y objetivos de la Junta"
        descripcion="Lo que la Junta se propuso hacer y cómo va: actas por registrar, documentos por ubicar, propuestas de reglamento. Cada tarea se puede mostrar a los vecinos o dejar solo para la administración."
      />

      <Cifras>
        <Cifra etiqueta="EN CURSO" valor={cuenta("en_curso")} />
        <Cifra etiqueta="PENDIENTES" valor={cuenta("pendiente")} />
        <Cifra etiqueta="HECHAS" valor={cuenta("hecha")} tono={cuenta("hecha") > 0 ? "bien" : "neutro"} />
        <Cifra etiqueta="A LA VISTA DE LOS VECINOS" valor={tareas.filter((t) => t.visible_vecinos).length} />
      </Cifras>

      {tareas.length === 0 ? (
        <Vacio>Todavía no hay tareas. {edita ? "Agrega la primera con el formulario de abajo." : "Las agrega la Junta."}</Vacio>
      ) : (
        ORDEN.filter((e) => cuenta(e) > 0).map((e) => (
          <section key={e} className="space-y-3">
            <h2 className="text-[15px] font-semibold text-marine-deep">{ESTADO_TAREA[e].nombre}</h2>
            <ul className="space-y-3">
              {tareas
                .filter((t) => t.estado === e)
                .map((t) => (
                  <li key={t.id} className="rounded-2xl border border-border bg-card p-4 sm:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <p className="min-w-0 font-medium text-marine-deep">{t.titulo}</p>
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${t.visible_vecinos ? "border-cyan/30 bg-cyan/10 text-cyan-ink" : "border-border bg-marine-deep/5 text-mute"}`}>
                        {t.visible_vecinos ? "La ven los vecinos" : "Solo la administración"}
                      </span>
                    </div>
                    {t.detalle && <p className="mt-1 whitespace-pre-line text-[13.5px] text-marine-deep/80">{t.detalle}</p>}
                    <p className="mt-2 text-[12px] text-mute">
                      {[t.responsable ? `Responsable: ${t.responsable}` : null, t.fecha_objetivo ? `Fecha objetivo: ${fecha(t.fecha_objetivo)}` : null].filter(Boolean).join(". ") || "Sin responsable ni fecha."}
                    </p>
                    {edita && <EditarTarea tarea={t} />}
                  </li>
                ))}
            </ul>
          </section>
        ))
      )}

      {edita && (
        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <h2 className="mb-4 text-[15px] font-semibold text-marine-deep">Agregar una tarea u objetivo</h2>
          <FormularioTarea />
        </section>
      )}
    </div>
  );
}
