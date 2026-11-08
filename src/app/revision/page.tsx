import type { Metadata } from "next";
import { revisionActual } from "@/lib/revision";
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

export const metadata: Metadata = {
  title: { absolute: "Verificación de la información" },
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

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
  aclarado_nombre: string | null;
  aclarado_en: string | null;
  units: { unit_number: string; block: string | null } | null;
}

const fecha = new Intl.DateTimeFormat("es-VE", { timeZone: "America/Caracas", dateStyle: "short" });

function Marco({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-8 sm:px-6 sm:py-12">{children}</main>;
}

/**
 * Revisión previa a la migración. Vive en el portal pero fuera de la app: sin
 * sesión ni panel, su credencial es la cookie que deja el enlace privado.
 */
export default async function RevisionPage({ searchParams }: { searchParams: Promise<{ enlace?: string }> }) {
  const { enlace } = await searchParams;
  const revision = await revisionActual();

  if (!revision) {
    return (
      <Marco>
        <div className="mx-auto max-w-md rounded-2xl border border-border bg-card p-6 text-center">
          <p className="font-meta text-ember-ink">{enlace === "invalido" ? "ENLACE NO VÁLIDO" : "ENLACE PRIVADO"}</p>
          <p className="mt-3 text-[15px] text-marine-deep">
            {enlace === "invalido"
              ? "Este enlace fue revocado o está incompleto."
              : "Esta página solo se abre con el enlace privado que te compartieron."}
          </p>
        </div>
      </Marco>
    );
  }

  const { data, error } = await createAdminClient()
    .from("verificacion_carga")
    .select(
      "id, unit_id, campo, estado, fuente, valor_fuente, valor_planilla, motivo, hallazgo, aclaracion, aclarado_nombre, aclarado_en, units(unit_number, block)",
    )
    .eq("organization_id", revision.organizationId)
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
      aclaradoPor: r.aclarado_nombre,
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
    <Marco>
      <Encabezado
        eyebrow={revision.condominio.toUpperCase()}
        titulo="Verificación de la información"
        descripcion="Cada apartamento, dato por dato, comparado con los documentos y las planillas del condominio. Esta página es independiente de la app: cuando todo esté aclarado, se migra la información."
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

      <footer className="border-t border-border pt-4 text-[12px] text-mute">
        Enlace privado, preparado por Atryum. Compártelo solo con quienes revisan la información.
      </footer>
    </Marco>
  );
}
