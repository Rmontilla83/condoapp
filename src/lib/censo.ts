import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Censo documental (migration 071): si cada unidad entregó su documentación de
 * propiedad, si la administradora la validó y si la Junta la aprobó.
 *
 * Atryum no guarda esos documentos: los recibe y resguarda la administradora.
 * Aquí solo queda el estado, a nombre de quien lo marcó.
 */
export type EstadoCenso = "rojo" | "naranja" | "validada" | "verde";

export const ESTADOS_CENSO: Record<EstadoCenso, { nombre: string; detalle: string; punto: string; clase: string }> = {
  rojo: { nombre: "Sin entregar", detalle: "No ha entregado documentación de propiedad.", punto: "bg-red-500", clase: "bg-red-50 text-red-700 border-red-200" },
  naranja: { nombre: "Entrega parcial", detalle: "Entregó una parte de la documentación.", punto: "bg-amber-500", clase: "bg-amber-50 text-amber-800 border-amber-200" },
  validada: {
    nombre: "Validada, falta la Junta",
    detalle: "Completa y validada por la administradora. Falta la aprobación de la Junta.",
    punto: "bg-amber-500",
    clase: "bg-amber-50 text-amber-800 border-amber-200",
  },
  verde: { nombre: "Aprobada", detalle: "Recibida, validada por la administradora y aprobada por la Junta.", punto: "bg-emerald-500", clase: "bg-emerald-50 text-emerald-800 border-emerald-200" },
};

export interface FilaCenso {
  unitId: string;
  torre: string | null;
  numero: string;
  propietarios: string[];
  estado: EstadoCenso;
  nota: string | null;
  actualizadoEn: string | null;
  actualizo: string | null;
  valido: string | null;
  validadoPor: string | null;
  aprobo: string | null;
}

type Persona = { full_name?: string | null; email?: string | null } | { full_name?: string | null; email?: string | null }[] | null;
const nombreDe = (p: Persona): string | null => {
  const x = Array.isArray(p) ? p[0] : p;
  return x?.full_name || x?.email || null;
};

/** Una fila por unidad. La que no tiene registro está en rojo: nadie ha entregado nada. */
export async function censoDelCondominio(orgId: string): Promise<FilaCenso[]> {
  const db = createAdminClient();
  const [{ data: unidades, error }, { data: estados }, { data: miembros }] = await Promise.all([
    db.from("units").select("id, unit_number, block, floor").eq("organization_id", orgId).order("block").order("floor").order("unit_number"),
    db
      .from("unit_documentacion")
      .select("unit_id, estado, nota, actualizado_en, validado_por, actualizo:actualizado_por(full_name, email), valido:validado_por(full_name, email), aprobo:aprobado_por(full_name, email)")
      .eq("organization_id", orgId),
    db.from("unit_members").select("unit_id, profiles(full_name), units!inner(organization_id)").eq("units.organization_id", orgId).eq("role", "owner").eq("active", true),
  ]);
  if (error) throw new Error(error.message);
  const porUnidad = new Map((estados ?? []).map((e) => [e.unit_id as string, e]));
  const duenos = new Map<string, string[]>();
  for (const m of miembros ?? []) {
    const p = (Array.isArray(m.profiles) ? m.profiles[0] : m.profiles) as { full_name?: string } | null;
    if (!p?.full_name) continue;
    duenos.set(m.unit_id as string, [...(duenos.get(m.unit_id as string) ?? []), p.full_name]);
  }
  return (unidades ?? []).map((u) => {
    const e = porUnidad.get(u.id as string);
    return {
      unitId: u.id as string,
      torre: (u.block as string) ?? null,
      numero: u.unit_number as string,
      propietarios: duenos.get(u.id as string) ?? [],
      estado: ((e?.estado as EstadoCenso) ?? "rojo") as EstadoCenso,
      nota: (e?.nota as string) ?? null,
      actualizadoEn: (e?.actualizado_en as string) ?? null,
      actualizo: nombreDe((e?.actualizo ?? null) as Persona),
      valido: nombreDe((e?.valido ?? null) as Persona),
      validadoPor: (e?.validado_por as string) ?? null,
      aprobo: nombreDe((e?.aprobo ?? null) as Persona),
    };
  });
}

export function avanceDelCenso(filas: { estado: EstadoCenso }[]): Record<EstadoCenso, number> & { total: number } {
  const r = { rojo: 0, naranja: 0, validada: 0, verde: 0, total: filas.length };
  for (const f of filas) r[f.estado]++;
  return r;
}

/** Solo el estado, sin nombres ni notas: es lo que puede ver un vecino. */
export async function estadosDeUnidades(orgId: string, unitIds?: string[]): Promise<Map<string, EstadoCenso>> {
  let q = createAdminClient().from("unit_documentacion").select("unit_id, estado").eq("organization_id", orgId);
  if (unitIds) q = q.in("unit_id", unitIds.length ? unitIds : ["00000000-0000-0000-0000-000000000000"]);
  const { data } = await q;
  return new Map((data ?? []).map((e) => [e.unit_id as string, e.estado as EstadoCenso]));
}
