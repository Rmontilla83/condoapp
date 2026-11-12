import { createAdminClient } from "@/lib/supabase/admin";
import type { DatoPendiente } from "./verificacion-datos";

/**
 * Datos de una unidad que todavía no están verificados (migrations 063 y 064).
 *
 * La revisión de la carga vive fuera de la app, en un enlace aparte. Esto solo
 * trae su resultado para avisarle a la administración, en cada unidad, qué dato
 * sigue en aclaratoria. Cuando alguien lo aclara en la matriz, el aviso se va
 * solo: se lee en vivo y no se copia a ningún otro lado.
 *
 * Es solo para la administración: un vecino nunca lo ve.
 */
export type { DatoPendiente } from "./verificacion-datos";

const ORDEN: DatoPendiente["campo"][] = ["propietario", "alicuota", "marina", "contacto", "puesto"];

export async function pendientesDeVerificacion(orgId: string, unitId?: string): Promise<Map<string, DatoPendiente[]>> {
  let q = createAdminClient()
    .from("verificacion_carga")
    .select("unit_id, campo, estado, motivo")
    .eq("organization_id", orgId)
    .neq("estado", "verde")
    .is("aclarado_en", null);
  if (unitId) q = q.eq("unit_id", unitId);
  const { data, error } = await q;
  // Un aviso que no carga no puede tumbar la pantalla de cobranza.
  if (error) return new Map();
  const mapa = new Map<string, DatoPendiente[]>();
  for (const f of data ?? []) {
    const lista = mapa.get(f.unit_id as string) ?? [];
    lista.push({ campo: f.campo as DatoPendiente["campo"], estado: f.estado as DatoPendiente["estado"], motivo: (f.motivo as string) ?? null });
    mapa.set(f.unit_id as string, lista);
  }
  for (const lista of mapa.values()) lista.sort((a, b) => ORDEN.indexOf(a.campo) - ORDEN.indexOf(b.campo));
  return mapa;
}
