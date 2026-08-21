import { createClient } from "@/lib/supabase/server";

/**
 * `decision_questions.options` es JSONB y en producción llegó a tener una fila
 * con el array doble-codificado como string (la reparó la migration 023). Esta
 * defensa se queda: un JSONB mal formado no puede tumbar la página, y ahora
 * además la usa voteDecision para validar que la opción elegida sea una de las
 * ofrecidas y no texto libre.
 *
 * Estaba duplicada en decisiones/page.tsx y decisiones/[id]/page.tsx.
 */
export function normalizeOptions(options: unknown): string[] {
  if (Array.isArray(options)) return options as string[];
  if (typeof options === "string") {
    try {
      const parsed = JSON.parse(options);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Calcula la alícuota efectiva del votante para una org.
 * Snapshot al momento del voto: SUM(units.aliquot) de unit_members
 * activos como owner del usuario en esa org.
 *
 * Si el user es tenant en TODAS sus units (sin owner), retorna 0.
 * Si el user no tiene memberships en la org, retorna 0.
 */
export async function getVoterAliquot(profileId: string, orgId: string): Promise<number> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("unit_members")
    .select("role, units!inner(organization_id, aliquot)")
    .eq("profile_id", profileId)
    .eq("active", true)
    .eq("role", "owner");

  if (!data || data.length === 0) return 0;

  return data
    .filter((m) => {
      const u = Array.isArray(m.units) ? m.units[0] : m.units;
      return u && u.organization_id === orgId;
    })
    .reduce((sum, m) => {
      const u = Array.isArray(m.units) ? m.units[0] : m.units;
      return sum + Number(u?.aliquot ?? 0);
    }, 0);
}

export interface QuorumStats {
  /** Quórum requerido (% del universo). NULL si no exige. */
  required_pct: number | null;
  /** Universo total: suma alícuota org si weighted, conteo owners si no. */
  universe: number;
  /** Alícuota o conteo votado, deduplicando por voter. */
  achieved: number;
  /** % alcanzado vs universo. */
  achieved_pct: number;
  /** True si achieved_pct >= required_pct. False si required_pct=null. */
  met: boolean;
  /**
   * False cuando el universo no representa al condominio completo: sin alícuotas
   * cargadas, o con carga parcial. En ese caso `achieved_pct` y `met` NO se
   * pueden mostrar como un resultado: hay que decir que no es confiable.
   */
  reliable: boolean;
}

interface QuorumInput {
  weighted_by_aliquot: boolean;
  quorum_pct: number | null;
  /** Suma alícuotas org (si weighted) O count owners activos (si no). */
  universe: number;
  /** Ver QuorumStats.reliable. Por defecto true. */
  reliable?: boolean;
  /** Lista de voters únicos: { voter_id, weight } */
  voters: Array<{ voter_id: string; weight: number }>;
}

export function computeQuorum(input: QuorumInput): QuorumStats {
  const universe = Math.max(input.universe, 0.0001); // evitar div/0

  // Deduplicar por voter_id (un voter cuenta máximo una vez aunque vote N preguntas)
  const seen = new Map<string, number>();
  for (const v of input.voters) {
    if (!seen.has(v.voter_id)) {
      seen.set(v.voter_id, v.weight);
    }
  }

  let achieved: number;
  if (input.weighted_by_aliquot) {
    // Suma de alícuotas votadas
    achieved = [...seen.values()].reduce((s, w) => s + w, 0);
  } else {
    // 1 voter = 1 punto
    achieved = seen.size;
  }

  const achieved_pct = (achieved / universe) * 100;
  const reliable = input.reliable !== false;
  // Un quórum sobre un universo incompleto no está "alcanzado": está mal medido.
  const met = reliable && input.quorum_pct !== null && achieved_pct >= input.quorum_pct;

  return {
    required_pct: input.quorum_pct,
    universe,
    achieved,
    achieved_pct,
    met,
    reliable,
  };
}

export interface QuorumUniverse {
  universe: number;
  reliable: boolean;
  /** Unidades sin alícuota cargada (solo aplica al modo ponderado). */
  unset: number;
  totalUnits: number;
}

/**
 * Calcula el universo (total esperado) para una org según el modo de quórum.
 *
 * OJO con el modo ponderado: antes, si la suma de alícuotas era 0 esto caía a
 * `units.length`, mezclando escalas — el universo quedaba en "cantidad de
 * unidades" mientras `achieved` seguía sumando puntos de alícuota. Y con carga
 * PARCIAL era peor todavía: si 10 de 40 unidades tienen alícuotas que suman 25%
 * y esas 10 votan, achieved=25 sobre universe=25 daba **100% de quórum
 * alcanzado** con 30 unidades sin representar, en la pantalla que decide una
 * derrama. Ahora eso se reporta como no confiable en vez de como un número.
 */
export async function getOrgQuorumUniverse(
  orgId: string,
  weighted: boolean,
): Promise<QuorumUniverse> {
  const supabase = await createClient();

  if (weighted) {
    const { data: units } = await supabase
      .from("units")
      .select("aliquot")
      .eq("organization_id", orgId);
    const filas = units ?? [];
    const total = filas.reduce((s, u) => s + Number(u.aliquot ?? 0), 0);
    const unset = filas.filter((u) => u.aliquot === null || u.aliquot === undefined).length;
    return {
      universe: total,
      reliable: total > 0 && unset === 0,
      unset,
      totalUnits: filas.length,
    };
  }

  // No weighted: count owners activos
  const { count } = await supabase
    .from("unit_members")
    .select("profile_id", { count: "exact", head: true })
    .eq("active", true)
    .eq("role", "owner")
    .in("unit_id",
      ((await supabase.from("units").select("id").eq("organization_id", orgId)).data ?? [])
        .map((u) => u.id),
    );

  return {
    universe: count ?? 0,
    reliable: (count ?? 0) > 0,
    unset: 0,
    totalUnits: count ?? 0,
  };
}

/**
 * Cobertura de alícuotas del condominio. La usan los guards que impiden crear
 * una asamblea ponderada sobre un padrón que todavía no existe.
 */
export async function getAliquotCoverage(orgId: string): Promise<{
  totalUnits: number;
  configured: number;
  unset: number;
  sum: number;
}> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("units")
    .select("aliquot")
    .eq("organization_id", orgId);

  const filas = data ?? [];
  return {
    totalUnits: filas.length,
    configured: filas.filter((u) => u.aliquot !== null && u.aliquot !== undefined).length,
    unset: filas.filter((u) => u.aliquot === null || u.aliquot === undefined).length,
    sum: filas.reduce((s, u) => s + Number(u.aliquot ?? 0), 0),
  };
}
