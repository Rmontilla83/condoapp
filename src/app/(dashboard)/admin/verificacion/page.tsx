import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/queries";
import { isAdminRole } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { compararUnidades } from "@/lib/units/orden";
import { Cifra, Cifras, Encabezado } from "@/components/contabilidad/ui";
import {
  colorEfectivo,
  colorGeneral,
  type Campo,
  type Color,
  type DatoVerificado,
  type FilaVerificacion,
  type HallazgoColectivo,
} from "@/lib/verificacion";
import { Matriz } from "./matriz";

interface RegistroDB {
  id: string;
  unit_id: string;
  campo: Campo;
  estado: Color;
  fuente: string | null;
  valor_fuente: string | null;
  valor_planilla: string | null;
  motivo: string | null;
  hallazgo: string | null;
  aclaracion: string | null;
  aclarado_en: string | null;
  units: { unit_number: string; block: string | null } | null;
  perfil: { full_name: string | null } | null;
}

const fecha = new Intl.DateTimeFormat("es-VE", { timeZone: "America/Caracas", dateStyle: "short" });

export default async function VerificacionPage() {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return null;
  if (!isAdminRole(profile)) redirect("/dashboard");

  const { data, error } = await createAdminClient()
    .from("verificacion_carga")
    .select(
      "id, unit_id, campo, estado, fuente, valor_fuente, valor_planilla, motivo, hallazgo, aclaracion, aclarado_en, units(unit_number, block), perfil:profiles!verificacion_carga_aclarado_por_fkey(full_name)",
    )
    .eq("organization_id", profile.organization_id)
    .returns<RegistroDB[]>();
  if (error) throw new Error(error.message);

  const porUnidad = new Map<string, FilaVerificacion>();
  const bloques = new Map<string, string | null>();
  const porHallazgo = new Map<string, HallazgoColectivo>();

  for (const r of data ?? []) {
    if (!r.units) continue;
    const fila = porUnidad.get(r.unit_id) ?? {
      unitId: r.unit_id,
      torre: (r.units.block ?? "").replace(/^Torre\s+/i, ""),
      unidad: r.units.unit_number,
      propietario: null,
      general: "amarillo" as Color,
      datos: {},
    };
    const dato: DatoVerificado = {
      id: r.id,
      campo: r.campo,
      estado: r.estado,
      efectivo: colorEfectivo(r.estado, r.aclarado_en),
      fuente: r.fuente,
      valorFuente: r.valor_fuente,
      valorPlanilla: r.valor_planilla,
      motivo: r.motivo,
      aclaracion: r.aclaracion,
      aclaradoPor: r.perfil?.full_name ?? null,
      aclaradoEn: r.aclarado_en ? fecha.format(new Date(r.aclarado_en)) : null,
    };
    fila.datos[r.campo] = dato;
    if (r.campo === "propietario") fila.propietario = r.valor_planilla;
    porUnidad.set(r.unit_id, fila);
    bloques.set(r.unit_id, r.units.block);

    if (r.hallazgo && r.estado !== "verde") {
      const h = porHallazgo.get(r.hallazgo) ?? { titulo: r.hallazgo, motivo: r.motivo, total: 0, pendientes: 0 };
      h.total += 1;
      if (!r.aclarado_en) h.pendientes += 1;
      porHallazgo.set(r.hallazgo, h);
    }
  }

  const filas: FilaVerificacion[] = [...porUnidad.values()]
    .map((f) => ({ ...f, general: colorGeneral(f.datos) }))
    .sort((a, b) =>
      compararUnidades({ unit_number: a.unidad, block: bloques.get(a.unitId) }, { unit_number: b.unidad, block: bloques.get(b.unitId) }),
    );

  const cuenta = (c: Color) => filas.filter((f) => f.general === c).length;

  return (
    <div className="space-y-6">
      <Encabezado
        eyebrow="MIGRACIÓN"
        titulo="Verificación de la carga"
        descripcion="Cada apartamento, dato por dato, comparado con los documentos y las planillas del condominio. Solo la administración ve esta página."
      />

      {filas.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card p-6 text-[14px] text-mute">
          Todavía no hay una verificación cargada para este condominio.
        </p>
      ) : (
        <>
          <Cifras>
            <Cifra etiqueta="UNIDADES" valor={filas.length} detalle="En la verificación" />
            <Cifra etiqueta="VERIFICADAS" valor={cuenta("verde")} detalle="Todos sus datos en verde" tono="bien" />
            <Cifra etiqueta="INCOMPLETAS" valor={cuenta("amarillo")} detalle="Falta información" />
            <Cifra etiqueta="POR ACLARAR" valor={cuenta("rojo")} detalle="Hay una diferencia entre fuentes" tono="alerta" />
          </Cifras>
          <Matriz filas={filas} hallazgos={[...porHallazgo.values()]} />
        </>
      )}
    </div>
  );
}
