import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, getEffectiveRole } from "@/lib/queries";
import { computeQuorum, getOrgQuorumUniverse } from "@/lib/decisions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DecisionCard } from "./decision-card";
import { NewDecisionDialog } from "./new-decision-dialog";
import type { Decision, DecisionStatus } from "@/types/database";

interface QuestionWithResponses {
  id: string;
  question: string;
  options: string[];
  position: number;
  decision_responses: Array<{
    voter_id: string;
    selected_option: string;
    weight: number;
  }>;
}

interface DecisionWithQuestions extends Decision {
  decision_questions: QuestionWithResponses[];
}

// Defensa contra filas legacy donde options se grabó como string JSON.
// Migration 023 ya arregló los datos en DB; esto evita que un nuevo
// registro corrupto rompa la página.
function normalizeOptions(options: unknown): string[] {
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

export default async function DecisionesPage() {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) redirect("/dashboard");

  const effectiveRole = getEffectiveRole(profile);
  const isAdmin = effectiveRole === "admin" || effectiveRole === "super_admin";

  const supabase = await createClient();

  const { data } = await supabase
    .from("decisions")
    .select("*, decision_questions(*, decision_responses(voter_id, selected_option, weight))")
    .eq("organization_id", profile.organization_id)
    .order("created_at", { ascending: false })
    .limit(50);

  const decisions = ((data ?? []) as unknown as DecisionWithQuestions[]).map((d) => ({
    ...d,
    decision_questions: (d.decision_questions ?? [])
      .map((q) => ({ ...q, options: normalizeOptions(q.options) }))
      .sort((a, b) => a.position - b.position),
  }));

  const openDecisions = decisions.filter((d) => d.status === "open" || d.status === "draft");
  const closedDecisions = decisions.filter((d) => d.status === "closed" || d.status === "cancelled");

  // Pre-compute quorum stats para formal_assembly weighted
  const quorumByDecision: Record<string, { achieved_pct: number; required_pct: number | null; met: boolean }> = {};
  for (const d of decisions) {
    if (d.kind !== "formal_assembly" || d.quorum_pct === null) continue;
    const universe = await getOrgQuorumUniverse(d.organization_id, d.weighted_by_aliquot);
    const allResponses = (d.decision_questions ?? []).flatMap((q) => q.decision_responses);
    const stats = computeQuorum({
      weighted_by_aliquot: d.weighted_by_aliquot,
      quorum_pct: d.quorum_pct,
      universe,
      voters: allResponses.map((r) => ({ voter_id: r.voter_id, weight: Number(r.weight) })),
    });
    quorumByDecision[d.id] = {
      achieved_pct: stats.achieved_pct,
      required_pct: stats.required_pct,
      met: stats.met,
    };
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="font-meta-loose text-cyan">DECISIONES</span>
          <h1 className="mt-4 font-display text-[clamp(1.75rem,3.5vw,2.5rem)] leading-[1.1] tracking-[-0.03em] text-marine-deep">
            Encuestas y <em className="font-editorial text-cyan">asambleas</em>
          </h1>
          <p className="mt-3 text-[15px] text-mute">
            Una sola fuente para todas las decisiones del condominio.
          </p>
        </div>
        {isAdmin && <NewDecisionDialog />}
      </div>

      <Tabs defaultValue="open">
        <TabsList>
          <TabsTrigger value="open">Abiertas ({openDecisions.length})</TabsTrigger>
          <TabsTrigger value="closed">Cerradas ({closedDecisions.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="open" className="mt-4">
          {openDecisions.length === 0 ? (
            <div className="rounded-2xl bg-card border border-border py-12 text-center">
              <p className="text-[14px] text-mute">No hay decisiones abiertas en este momento.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {openDecisions.map((d) => (
                <DecisionCard
                  key={d.id}
                  decision={d}
                  questions={d.decision_questions}
                  userId={profile.id}
                  isAdmin={isAdmin}
                  quorumStats={quorumByDecision[d.id]}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="closed" className="mt-4">
          {closedDecisions.length === 0 ? (
            <div className="rounded-2xl bg-card border border-border py-12 text-center">
              <p className="text-[14px] text-mute">No hay decisiones cerradas todavía.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {closedDecisions.map((d) => (
                <DecisionCard
                  key={d.id}
                  decision={d}
                  questions={d.decision_questions}
                  userId={profile.id}
                  isAdmin={isAdmin}
                  quorumStats={quorumByDecision[d.id]}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Mantener para futura supresión de warning unused
export type { DecisionStatus };
