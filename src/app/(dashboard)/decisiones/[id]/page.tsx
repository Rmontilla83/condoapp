import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, getEffectiveRole } from "@/lib/queries";
import { computeQuorum, getOrgQuorumUniverse } from "@/lib/decisions";
import { QuestionVoter } from "./question-voter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

const statusBadge: Record<DecisionStatus, { label: string; className: string }> = {
  draft: { label: "BORRADOR", className: "border-gray-300 text-gray-700 bg-gray-50" },
  open: { label: "ABIERTA", className: "border-emerald-300 text-emerald-700 bg-emerald-50" },
  closed: { label: "CERRADA", className: "border-mute/30 text-mute bg-mute/5" },
  cancelled: { label: "CANCELADA", className: "border-destructive/30 text-destructive bg-destructive/5" },
};

export default async function DecisionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) redirect("/dashboard");

  const effectiveRole = getEffectiveRole(profile);
  const isAdmin = effectiveRole === "admin" || effectiveRole === "super_admin";

  const supabase = await createClient();

  const { data } = await supabase
    .from("decisions")
    .select("*, decision_questions(*, decision_responses(voter_id, selected_option, weight))")
    .eq("id", id)
    .eq("organization_id", profile.organization_id)
    .single();

  if (!data) notFound();
  const decision = data as unknown as DecisionWithQuestions;

  // quick_poll redirige a la lista para mostrar el card inline
  if (decision.kind === "quick_poll") {
    redirect(`/decisiones#decision-${decision.id}`);
  }

  const questions = (decision.decision_questions ?? [])
    .map((q) => ({ ...q, options: normalizeOptions(q.options) }))
    .sort((a, b) => a.position - b.position);
  const status = statusBadge[decision.status];
  const isOpen = decision.status === "open";
  const isExpired = !!(decision.closes_at && new Date(decision.closes_at) <= new Date());

  // Quorum stats si aplica
  let quorumStats = null;
  let quorumUniverse: Awaited<ReturnType<typeof getOrgQuorumUniverse>> | null = null;
  if (decision.quorum_pct !== null) {
    quorumUniverse = await getOrgQuorumUniverse(decision.organization_id, decision.weighted_by_aliquot);
    const allResponses = questions.flatMap((q) => q.decision_responses);
    quorumStats = computeQuorum({
      weighted_by_aliquot: decision.weighted_by_aliquot,
      quorum_pct: decision.quorum_pct,
      universe: quorumUniverse.universe,
      reliable: quorumUniverse.reliable,
      voters: allResponses.map((r) => ({ voter_id: r.voter_id, weight: Number(r.weight) })),
    });
  }

  const myVotedQuestionIds = new Set(
    questions
      .filter((q) => q.decision_responses.some((r) => r.voter_id === profile.id))
      .map((q) => q.id),
  );

  return (
    <div className="space-y-6">
      <div>
        <Link href="/decisiones" className="font-meta text-cyan hover:text-marine-deep transition-colors">
          ← VOLVER A DECISIONES
        </Link>
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="border-marine-deep/30 text-marine-deep bg-marine-deep/5">
            ASAMBLEA FORMAL
          </Badge>
          <Badge variant="outline" className={status.className}>{status.label}</Badge>
          {decision.weighted_by_aliquot && (
            <Badge variant="outline" className="border-cyan/30 text-cyan bg-cyan/5">
              VOTO PONDERADO
            </Badge>
          )}
        </div>
        <h1 className="mt-3 font-display text-[clamp(1.75rem,3.5vw,2.5rem)] leading-tight tracking-[-0.02em] text-marine-deep">
          {decision.title}
        </h1>
        {decision.description && (
          <p className="mt-3 text-[15px] text-marine-deep/80 leading-relaxed">{decision.description}</p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {decision.scheduled_at && (
          <div className="rounded-xl bg-card border border-border p-4">
            <p className="font-meta text-mute">FECHA PROGRAMADA</p>
            <p className="mt-2 text-[15px] font-medium text-marine-deep">
              {new Date(decision.scheduled_at).toLocaleString("es", {
                weekday: "short",
                day: "numeric",
                month: "long",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        )}
        {decision.closes_at && (
          <div className="rounded-xl bg-card border border-border p-4">
            <p className="font-meta text-mute">CIERRE DE VOTACIÓN</p>
            <p className={`mt-2 text-[15px] font-medium ${isExpired ? "text-destructive" : "text-marine-deep"}`}>
              {new Date(decision.closes_at).toLocaleString("es", {
                weekday: "short",
                day: "numeric",
                month: "long",
                hour: "2-digit",
                minute: "2-digit",
              })}
              {isExpired && " (VENCIDA)"}
            </p>
          </div>
        )}
        <div className="rounded-xl bg-card border border-border p-4">
          <p className="font-meta text-mute">PROGRESO</p>
          <p className="mt-2 text-[15px] font-medium text-marine-deep">
            {myVotedQuestionIds.size} / {questions.length} preguntas
          </p>
        </div>
      </div>

      {quorumStats && !quorumStats.reliable && (
        <div className="rounded-2xl border border-ember/40 bg-ember/5 p-5">
          <p className="font-meta text-ember-ink">QUÓRUM NO CONFIABLE</p>
          <p className="mt-2 text-[14px] text-marine-deep max-w-2xl">
            {quorumUniverse && quorumUniverse.unset > 0
              ? `${quorumUniverse.unset} de ${quorumUniverse.totalUnits} unidades no tienen alícuota cargada, así que el universo de esta votación está incompleto y el porcentaje no representa al condominio.`
              : "El condominio no tiene alícuotas cargadas, así que no hay universo contra el cual medir el quórum."}
          </p>
          {isAdmin && (
            <Link
              href="/admin/units/alicuotas"
              className="mt-3 inline-block font-meta text-ember-ink hover:text-marine-deep transition-colors"
            >
              CARGAR ALÍCUOTAS →
            </Link>
          )}
        </div>
      )}

      {quorumStats && quorumStats.reliable && (
        <div className="rounded-2xl bg-card border border-border p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="font-meta text-mute">QUÓRUM</p>
            <p className="font-meta text-marine-deep">
              {Math.min(quorumStats.achieved_pct, 100).toFixed(1)}% · REQUIERE {(quorumStats.required_pct ?? 0).toFixed(0)}%
              {quorumStats.met && " ✓ ALCANZADO"}
            </p>
          </div>
          <div className="h-3 rounded-full bg-cloud overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${quorumStats.met ? "bg-cyan" : "bg-ember"}`}
              style={{ width: `${Math.min(quorumStats.achieved_pct, 100)}%` }}
            />
          </div>
        </div>
      )}

      <div className="space-y-4">
        {questions.map((q, idx) => {
          const hasVoted = q.decision_responses.some((r) => r.voter_id === profile.id);
          const showResults = hasVoted || !isOpen || isExpired;
          return (
            <QuestionVoter
              key={q.id}
              decisionId={decision.id}
              question={q}
              userId={profile.id}
              showResults={showResults}
              canVote={isOpen && !isExpired && !hasVoted}
              questionNumber={idx + 1}
            />
          );
        })}
      </div>

      {isAdmin && isOpen && (
        <div className="rounded-2xl bg-card border border-border p-5">
          <p className="font-meta text-mute mb-3">ACCIONES ADMIN</p>
          <div className="flex gap-2">
            <Link href={`/decisiones?action=close&id=${decision.id}`}>
              <Button size="sm" variant="outline">Cerrar asamblea</Button>
            </Link>
          </div>
          <p className="mt-3 text-[12px] text-mute">
            Cerrar la asamblea evita más votos. Los resultados quedan registrados.
          </p>
        </div>
      )}
    </div>
  );
}
