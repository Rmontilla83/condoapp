import { createAdminClient } from "@/lib/supabase/admin";

/** Tareas y objetivos de la Junta (migration 071). La tabla no tiene políticas: se lee por aquí. */
export interface TareaJunta {
  id: string;
  titulo: string;
  detalle: string | null;
  estado: "pendiente" | "en_curso" | "hecha";
  responsable: string | null;
  fecha_objetivo: string | null;
  visible_vecinos: boolean;
  completada_en: string | null;
  creado_en: string;
}

export const ESTADO_TAREA: Record<TareaJunta["estado"], { nombre: string; clase: string }> = {
  pendiente: { nombre: "Pendiente", clase: "bg-marine-deep/5 text-marine-deep border-border" },
  en_curso: { nombre: "En curso", clase: "bg-cyan/10 text-cyan-ink border-cyan/30" },
  hecha: { nombre: "Hecha", clase: "bg-emerald-50 text-emerald-800 border-emerald-200" },
};

export async function tareasDeLaJunta(orgId: string, soloVisibles: boolean): Promise<TareaJunta[]> {
  let q = createAdminClient()
    .from("junta_tareas")
    .select("id, titulo, detalle, estado, responsable, fecha_objetivo, visible_vecinos, completada_en, creado_en")
    .eq("organization_id", orgId)
    .is("archivada_en", null);
  if (soloVisibles) q = q.eq("visible_vecinos", true);
  const { data, error } = await q.order("fecha_objetivo", { ascending: true, nullsFirst: false }).order("creado_en");
  if (error) throw new Error(error.message);
  return (data ?? []) as TareaJunta[];
}
