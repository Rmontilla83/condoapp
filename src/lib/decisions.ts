import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

/**
 * Cuánto pesa el voto de una persona en UNA decisión ponderada (migration 072).
 *
 * Una unidad pesa una sola vez. Si una unidad tiene dos copropietarios con
 * cuenta, la representa el primero que vota en esa decisión: antes cada uno
 * sumaba la alícuota completa y la unidad contaba doble en el resultado y en el
 * quórum. Si TODAS sus unidades ya están representadas por otro copropietario,
 * `bloqueado` es true y la persona no vota en esa decisión.
 */
export async function pesoDelVoto(
  profileId: string,
  orgId: string,
  decisionId: string,
): Promise<{ peso: number; unidades: number; representadas: number; bloqueado: boolean }> {
  const db = createAdminClient();
  const { data: mias } = await db
    .from("unit_members")
    .select("unit_id, units!inner(organization_id, aliquot)")
    .eq("profile_id", profileId)
    .eq("active", true)
    .eq("role", "owner")
    .eq("units.organization_id", orgId);
  const unidades = (mias ?? []).map((m) => {
    const u = (Array.isArray(m.units) ? m.units[0] : m.units) as { aliquot: number | null } | null;
    return { id: m.unit_id as string, alicuota: Number(u?.aliquot ?? 0) };
  });
  if (unidades.length === 0) return { peso: 0, unidades: 0, representadas: 0, bloqueado: false };

  const { data: otros } = await db
    .from("unit_members")
    .select("unit_id, profile_id")
    .in("unit_id", unidades.map((u) => u.id))
    .eq("active", true)
    .eq("role", "owner")
    .neq("profile_id", profileId);
  const copropietarios = [...new Set((otros ?? []).map((o) => o.profile_id as string))];
  const tomadas = new Set<string>();
  if (copropietarios.length > 0) {
    const { data: votos } = await db
      .from("decision_responses")
      .select("voter_id, decision_questions!inner(decision_id)")
      .eq("decision_questions.decision_id", decisionId)
      .in("voter_id", copropietarios);
    const yaVotaron = new Set((votos ?? []).map((v) => v.voter_id as string));
    for (const o of otros ?? []) if (yaVotaron.has(o.profile_id as string)) tomadas.add(o.unit_id as string);
  }
  const libres = unidades.filter((u) => !tomadas.has(u.id));
  return {
    peso: libres.reduce((s, u) => s + u.alicuota, 0),
    unidades: unidades.length,
    representadas: tomadas.size,
    bloqueado: libres.length === 0,
  };
}

/**
 * Quita la identidad de los votos antes de mandarlos al navegador (migration
 * 072). Cada persona conserva su propio id, para saber qué votó; los demás
 * pasan a ser «anon-1», «anon-2»… El mismo votante lleva el mismo alias en
 * todas las preguntas de la decisión, así los conteos y el quórum no cambian.
 */
export function anonimizarVotos<R extends { voter_id: string }, Q extends { decision_responses: R[] }>(preguntas: Q[], miId: string): Q[] {
  const alias = new Map<string, string>();
  return preguntas.map((q) => ({
    ...q,
    decision_responses: (q.decision_responses ?? []).map((r) => {
      if (r.voter_id === miId) return r;
      if (!alias.has(r.voter_id)) alias.set(r.voter_id, `anon-${alias.size + 1}`);
      return { ...r, voter_id: alias.get(r.voter_id)! };
    }),
  }));
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
  /**
   * Padrón del modo NO ponderado. Si viene, solo estos perfiles suman a
   * `achieved`. Sin él, un inquilino o un administrador sin unidad empujaba el
   * quórum de un universo que solo cuenta propietarios.
   */
  eligibleVoterIds?: string[];
}

export function computeQuorum(input: QuorumInput): QuorumStats {
  const universe = Math.max(input.universe, 0.0001); // evitar div/0

  // Deduplicar por voter_id (un voter cuenta máximo una vez aunque vote N preguntas)
  const padron = input.eligibleVoterIds ? new Set(input.eligibleVoterIds) : null;
  const seen = new Map<string, number>();
  for (const v of input.voters) {
    // En el modo no ponderado el denominador son los propietarios: quien no
    // está en el padrón puede votar, pero no mueve el quórum.
    if (padron && !padron.has(v.voter_id)) continue;
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
  /**
   * Perfiles que forman el padrón: los propietarios activos del condominio.
   *
   * Solo se llena en el modo NO ponderado, que es donde hace falta: ahí
   * `achieved` cuenta votantes, y sin esta lista contaba a cualquiera que
   * votara —inquilinos, administradores sin unidad— contra un denominador que
   * solo tiene propietarios. Dos escalas distintas divididas entre sí.
   */
  voterIds?: string[];
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

  // No ponderado: propietarios activos, contados por PERSONA.
  //
  // Antes esto era un `count: "exact"` sobre unit_members, que cuenta FILAS.
  // Un propietario con dos apartamentos sumaba 2 al universo, pero su voto
  // sigue valiendo 1 (`UNIQUE(question_id, voter_id)` en la migration 019, más
  // el dedupe de computeQuorum). Resultado: en un edificio con multipropiedad
  // el quórum era matemáticamente inalcanzable — y desde la migration 039 ese
  // número se congela en el acta.
  const { data: unidades } = await supabase
    .from("units")
    .select("id")
    .eq("organization_id", orgId);

  const { data: miembros } = await supabase
    .from("unit_members")
    .select("profile_id")
    .eq("active", true)
    .eq("role", "owner")
    .in("unit_id", (unidades ?? []).map((u) => u.id));

  const propietarios = [
    ...new Set((miembros ?? []).map((m) => m.profile_id as string)),
  ];

  return {
    universe: propietarios.length,
    reliable: propietarios.length > 0,
    unset: 0,
    totalUnits: propietarios.length,
    voterIds: propietarios,
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
