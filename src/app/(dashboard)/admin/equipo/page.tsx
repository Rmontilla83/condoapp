import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/queries";
import { FUNCIONES, funcionDe, isAdminRole, type FuncionAdmin } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { Encabezado, Vacio, tabla } from "@/components/contabilidad/ui";
import { SelectorFuncion } from "./selector";

/** Qué puede hacer cada función. Es la misma matriz de src/lib/permissions.ts, en palabras. */
const ALCANCE: { tarea: string; quien: FuncionAdmin[] }[] = [
  { tarea: "Ver todo: cuentas, libro, informes, documentos e historial", quien: ["completa", "administradora", "junta", "asistente", "contador"] },
  { tarea: "Registrar gastos y otros ingresos, subir documentos, atender reportes", quien: ["completa", "administradora", "asistente"] },
  { tarea: "Publicar comunicados", quien: ["completa", "administradora", "junta", "asistente"] },
  { tarea: "Emitir cuotas, aprobar o rechazar pagos, anular, convenios e intereses", quien: ["completa", "administradora"] },
  { tarea: "Unidades, alícuotas, contactos, fondos y configuración", quien: ["completa", "administradora"] },
  { tarea: "Validar la documentación de una unidad", quien: ["completa", "administradora"] },
  { tarea: "Aprobar el presupuesto, publicar documentos y aprobar el censo", quien: ["completa", "junta"] },
  { tarea: "Consultas, asambleas y tareas de la Junta", quien: ["completa", "administradora", "junta"] },
];
const ORDEN: FuncionAdmin[] = ["administradora", "junta", "asistente", "contador", "completa"];

export default async function EquipoPage() {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return null;
  if (!isAdminRole(profile)) redirect("/dashboard");
  const reparte = funcionDe(profile) === "completa";

  const { data } = await createAdminClient()
    .from("profiles")
    .select("id, full_name, email, admin_funcion")
    .eq("organization_id", profile.organization_id)
    .eq("role", "admin")
    .order("full_name");
  const cuentas = data ?? [];
  const opciones = ORDEN.map((f) => ({ valor: f, nombre: FUNCIONES[f].nombre }));

  return (
    <div className="space-y-8">
      <Encabezado
        eyebrow="CONTROL INTERNO"
        titulo="Equipo y funciones"
        descripcion="Quién forma parte de la administración y qué puede hacer cada cuenta. La regla es que quien carga no sea quien aprueba, y todo queda en el historial."
      />

      <section className="space-y-3">
        <h2 className="text-[15px] font-semibold text-marine-deep">Cuentas de la administración</h2>
        {cuentas.length === 0 ? (
          <Vacio>Este condominio todavía no tiene cuentas de administración. Las crea el equipo de Atryum cuando la Junta indica quién ocupa cada función.</Vacio>
        ) : (
          <div className={tabla.contenedor}>
            <table className={tabla.tabla}>
              <thead className={tabla.thead}>
                <tr>
                  <th className={tabla.th}>Persona</th>
                  <th className={tabla.th}>Función</th>
                  <th className={tabla.th}>Qué hace</th>
                </tr>
              </thead>
              <tbody>
                {cuentas.map((c) => {
                  const f = ((c.admin_funcion as FuncionAdmin | null) ?? "completa") as FuncionAdmin;
                  return (
                    <tr key={c.id as string}>
                      <td className={tabla.td}>
                        <span className="block font-medium text-marine-deep">{(c.full_name as string) || "Sin nombre"}</span>
                        <span className="block text-[12px] text-mute">{c.email as string}</span>
                      </td>
                      <td className={`${tabla.td} min-w-[14rem]`}>
                        {reparte && c.id !== profile.id ? (
                          <SelectorFuncion profileId={c.id as string} actual={f} opciones={opciones} />
                        ) : (
                          <span className="font-medium text-marine-deep">{FUNCIONES[f].nombre}</span>
                        )}
                      </td>
                      <td className={`${tabla.td} text-mute`}>{FUNCIONES[f].resumen}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {!reparte && <p className="text-[12px] text-mute">Las funciones las asigna una cuenta de administración completa o el equipo de Atryum.</p>}
      </section>

      <section className="space-y-3">
        <h2 className="text-[15px] font-semibold text-marine-deep">Qué puede hacer cada función</h2>
        <div className={tabla.contenedor}>
          <table className={tabla.tabla}>
            <thead className={tabla.thead}>
              <tr>
                <th className={tabla.th}>Tarea</th>
                {ORDEN.map((f) => (
                  <th key={f} className={`${tabla.th} text-center`}>
                    {FUNCIONES[f].nombre}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ALCANCE.map((a) => (
                <tr key={a.tarea}>
                  <td className={tabla.td}>{a.tarea}</td>
                  {ORDEN.map((f) => (
                    <td key={f} className={`${tabla.td} text-center`}>
                      {a.quien.includes(f) ? <span className="font-medium text-emerald-700">Sí</span> : <span className="text-mute">No</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[12px] text-mute">
          Además, quien reporta un pago desde su cuenta no lo aprueba, salvo en la administración completa. La cuenta del contador tampoco puede escribir directamente en la base de datos.
        </p>
      </section>
    </div>
  );
}
