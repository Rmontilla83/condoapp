import { createClient } from "@/lib/supabase/server";

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
}

interface QuorumInput {
  weighted_by_aliquot: boolean;
  quorum_pct: number | null;
  /** Suma alícuotas org (si weighted) O count owners activos (si no). */
  universe: number;
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
  const met = input.quorum_pct !== null && achieved_pct >= input.quorum_pct;

  return {
    required_pct: input.quorum_pct,
    universe,
    achieved,
    achieved_pct,
    met,
  };
}

/**
 * Calcula el universo (total esperado) para una org según el modo de quórum.
 * Si weighted=true: suma alícuotas de TODAS las units. Si suma=0 (fee_mode=flat),
 * fallback a count(units).
 * Si weighted=false: count owners activos.
 */
export async function getOrgQuorumUniverse(orgId: string, weighted: boolean): Promise<number> {
  const supabase = await createClient();

  if (weighted) {
    const { data: units } = await supabase
      .from("units")
      .select("aliquot")
      .eq("organization_id", orgId);
    const total = (units ?? []).reduce((s, u) => s + Number(u.aliquot ?? 0), 0);
    if (total > 0) return total;
    // Fallback si aliquots no configuradas
    return units?.length ?? 0;
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

  return count ?? 0;
}
