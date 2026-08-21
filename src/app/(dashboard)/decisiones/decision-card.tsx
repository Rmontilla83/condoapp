"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { voteDecision, closeDecision } from "./actions";
import { EditDecisionDialog } from "./edit-decision-dialog";
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

interface Props {
  decision: Decision;
  questions: QuestionWithResponses[];
  userId: string;
  isAdmin: boolean;
  /** Para formal_assembly con weighted_by_aliquot, total alícuota org como universo. */
  quorumStats?: {
    achieved_pct: number;
    required_pct: number | null;
    met: boolean;
    /** False si el universo está incompleto: no hay porcentaje que mostrar. */
    reliable: boolean;
  };
}

const statusBadge: Record<DecisionStatus, { label: string; className: string }> = {
  draft: { label: "BORRADOR", className: "border-gray-300 text-gray-700 bg-gray-50" },
  open: { label: "ABIERTA", className: "border-emerald-300 text-emerald-700 bg-emerald-50" },
  closed: { label: "CERRADA", className: "border-mute/30 text-mute bg-mute/5" },
  cancelled: { label: "CANCELADA", className: "border-destructive/30 text-destructive bg-destructive/5" },
};

export function DecisionCard({ decision, questions, userId, isAdmin, quorumStats }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const status = statusBadge[decision.status];
  const isFormal = decision.kind === "formal_assembly";
  const isOpen = decision.status === "open";
  const isEditable = isAdmin && (decision.status === "open" || decision.status === "draft");
  const hasVotes = questions.some((q) => q.decision_responses.length > 0);
  const editQuestions = questions.map((q) => ({
    id: q.id,
    question: q.question,
    options: q.options,
  }));
  const totalQuestions = questions.length;
  const myVotedQuestions = new Set(
    questions
      .filter((q) => q.decision_responses.some((r) => r.voter_id === userId))
      .map((q) => q.id),
  );
  const allVoted = totalQuestions > 0 && myVotedQuestions.size === totalQuestions;
  const partial = myVotedQuestions.size > 0 && myVotedQuestions.size < totalQuestions;

  async function handleVote(questionId: string, option: string) {
    setLoading(true);
    setError("");
    const res = await voteDecision(questionId, option, decision.id);
    if ("error" in res && res.error) {
      setError(res.error);
      setLoading(false);
      return;
    }
    setLoading(false);
    window.location.reload();
  }

  async function handleClose() {
    if (!confirm("¿Cerrar esta decisión? Ya no se podrán recibir votos.")) return;
    setLoading(true);
    await closeDecision(decision.id);
    setLoading(false);
    window.location.reload();
  }

  // Single-question rendering (quick_poll layout)
  if (decision.kind === "quick_poll" && questions.length === 1) {
    const q = questions[0];
    const totalVotes = q.decision_responses.length;
    const counts: Record<string, number> = {};
    for (const r of q.decision_responses) {
      counts[r.selected_option] = (counts[r.selected_option] ?? 0) + 1;
    }
    const hasVoted = q.decision_responses.some((r) => r.voter_id === userId);
    const showResults = hasVoted || !isOpen;

    return (
      <div id={`decision-${decision.id}`} className="rounded-2xl border bg-card p-5 scroll-mt-24">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            <h3 className="font-semibold text-[15px] text-marine-deep">{decision.title}</h3>
            <p className="mt-0.5 font-meta text-mute">
              {totalVotes} VOTO{totalVotes !== 1 ? "S" : ""} ·{" "}
              {new Date(decision.created_at).toLocaleDateString("es", { day: "numeric", month: "short" }).toUpperCase()}
              {decision.closes_at ? ` · CIERRA ${new Date(decision.closes_at).toLocaleDateString("es", { day: "numeric", month: "short" }).toUpperCase()}` : ""}
            </p>
          </div>
          <Badge variant="outline" className={status.className}>
            {status.label}
          </Badge>
        </div>

        {decision.description && (
          <p className="-mt-2 mb-3 text-[13px] text-mute leading-relaxed">
            {decision.description}
          </p>
        )}
        {q.question && q.question.trim() !== decision.title.trim() && (
          <p className="mb-3 text-[14px] font-medium text-marine-deep">{q.question}</p>
        )}

        <div className="space-y-2">
          {q.options.map((option) => {
            const count = counts[option] ?? 0;
            const pct = totalVotes > 0 ? (count / totalVotes) * 100 : 0;
            if (showResults) {
              return (
                <div key={option}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium">{option}</span>
                    <span className="font-meta text-mute">{count} ({pct.toFixed(0)}%)</span>
                  </div>
                  <div className="h-2 rounded-full bg-cloud overflow-hidden">
                    <div className="h-full rounded-full bg-cyan transition-all duration-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            }
            return (
              <button
                key={option}
                onClick={() => handleVote(q.id, option)}
                disabled={loading || !isOpen}
                className="w-full text-left text-sm font-medium rounded-xl border p-3 hover:border-primary hover:bg-primary/5 transition-colors disabled:opacity-50"
              >
                {option}
              </button>
            );
          })}
        </div>

        {error && <p className="text-sm text-destructive mt-2">{error}</p>}

        {(isEditable || (isAdmin && isOpen)) && (
          <div className="mt-4 pt-3 border-t flex gap-2">
            {isEditable && (
              <EditDecisionDialog
                decisionId={decision.id}
                title={decision.title}
                description={decision.description}
                questions={editQuestions}
                hasVotes={hasVotes}
              />
            )}
            {isAdmin && isOpen && (
              <Button size="sm" variant="outline" onClick={handleClose} disabled={loading} className="text-xs">
                Cerrar votación
              </Button>
            )}
          </div>
        )}
      </div>
    );
  }

  // Multi-question rendering (formal_assembly card preview)
  return (
    <div id={`decision-${decision.id}`} className="rounded-2xl border bg-card p-5 scroll-mt-24">
      <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <Badge variant="outline" className="border-marine-deep/30 text-marine-deep bg-marine-deep/5">
              ASAMBLEA FORMAL
            </Badge>
            <Badge variant="outline" className={status.className}>{status.label}</Badge>
          </div>
          <h3 className="font-display text-[18px] leading-tight tracking-[-0.02em] text-marine-deep">
            {decision.title}
          </h3>
          {decision.description && (
            <p className="mt-1 text-[13px] text-mute line-clamp-2">{decision.description}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4 font-meta">
        <div>
          <p className="text-mute">PREGUNTAS</p>
          <p className="mt-1 text-marine-deep text-[14px]">{totalQuestions}</p>
        </div>
        {decision.scheduled_at && (
          <div>
            <p className="text-mute">PROGRAMADA</p>
            <p className="mt-1 text-marine-deep text-[14px]">
              {new Date(decision.scheduled_at).toLocaleDateString("es", { day: "numeric", month: "short" })}
            </p>
          </div>
        )}
        {decision.closes_at && (
          <div>
            <p className="text-mute">CIERRA</p>
            <p className="mt-1 text-marine-deep text-[14px]">
              {new Date(decision.closes_at).toLocaleDateString("es", { day: "numeric", month: "short" })}
            </p>
          </div>
        )}
      </div>

      {/* Sin universo completo no hay porcentaje que mostrar: la lista decía
          "100.0%" donde el detalle decía "no confiable", y la lista es la que
          se mira primero. */}
      {quorumStats && quorumStats.required_pct !== null && !quorumStats.reliable && (
        <div className="mb-4">
          <span className="font-meta text-ember-ink">
            QUÓRUM NO CONFIABLE · FALTAN ALÍCUOTAS POR CARGAR
          </span>
        </div>
      )}

      {/* Quorum bar */}
      {quorumStats && quorumStats.required_pct !== null && quorumStats.reliable && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="font-meta text-mute">QUÓRUM</span>
            <span className="font-meta text-marine-deep">
              {Math.min(quorumStats.achieved_pct, 100).toFixed(1)}% · REQUIERE {quorumStats.required_pct.toFixed(0)}%
              {quorumStats.met && " ✓"}
            </span>
          </div>
          <div className="h-2 rounded-full bg-cloud overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${quorumStats.met ? "bg-cyan" : "bg-ember"}`}
              style={{ width: `${Math.min(quorumStats.achieved_pct, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* User progress + CTA */}
      {isOpen && (
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-border">
          <p className="font-meta text-mute">
            {allVoted
              ? `VOTASTE LAS ${totalQuestions} PREGUNTAS ✓`
              : partial
              ? `VOTASTE ${myVotedQuestions.size} DE ${totalQuestions} — COMPLETAR`
              : `${totalQuestions} PREGUNTA${totalQuestions !== 1 ? "S" : ""} POR VOTAR`}
          </p>
          <Link href={`/decisiones/${decision.id}`}>
            <Button size="sm">{allVoted ? "Ver" : "Votar"}</Button>
          </Link>
        </div>
      )}

      {!isOpen && (
        <div className="flex items-center justify-end pt-3 border-t border-border">
          <Link href={`/decisiones/${decision.id}`}>
            <Button size="sm" variant="outline">Ver detalle</Button>
          </Link>
        </div>
      )}

      {error && <p className="text-sm text-destructive mt-2">{error}</p>}

      {(isEditable || (isAdmin && isOpen)) && (
        <div className="mt-3 pt-3 border-t flex gap-2">
          {isEditable && (
            <EditDecisionDialog
              decisionId={decision.id}
              title={decision.title}
              description={decision.description}
              questions={editQuestions}
              hasVotes={hasVotes}
            />
          )}
          {isAdmin && isOpen && (
            <Button size="sm" variant="outline" onClick={handleClose} disabled={loading} className="text-xs">
              Cerrar asamblea
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
