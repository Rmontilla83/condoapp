"use client";

import { useState } from "react";
import { voteDecision } from "../actions";

interface Question {
  id: string;
  question: string;
  options: string[];
  decision_responses: Array<{
    voter_id: string;
    selected_option: string;
    weight: number;
  }>;
}

interface Props {
  decisionId: string;
  question: Question;
  userId: string;
  showResults: boolean;
  canVote: boolean;
  questionNumber: number;
  /** True si esta decisión pondera por alícuota. */
  weighted?: boolean;
  /** Cuánto pesa el voto de quien mira, en puntos de alícuota. */
  myWeight?: number;
}

export function QuestionVoter({
  decisionId,
  question,
  showResults,
  canVote,
  questionNumber,
  weighted = false,
  myWeight = 0,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Aggregate por opción: count + total weight
  const stats: Record<string, { count: number; weight: number }> = {};
  for (const r of question.decision_responses) {
    if (!stats[r.selected_option]) stats[r.selected_option] = { count: 0, weight: 0 };
    stats[r.selected_option].count += 1;
    stats[r.selected_option].weight += Number(r.weight);
  }
  const totalCount = question.decision_responses.length;
  const totalWeight = Object.values(stats).reduce((s, x) => s + x.weight, 0);

  async function handleVote(option: string) {
    setLoading(true);
    setError("");
    const res = await voteDecision(question.id, option, decisionId);
    if ("error" in res && res.error) {
      setError(res.error);
      setLoading(false);
      return;
    }
    setLoading(false);
    window.location.reload();
  }

  return (
    <div className="rounded-2xl bg-card border border-border p-5">
      <p className="font-meta text-mute mb-2">PREGUNTA {questionNumber}</p>
      <h3 className="font-display text-[18px] text-marine-deep leading-tight mb-4">
        {question.question}
      </h3>

      {/* El voto ponderado por alícuota es el diferenciador del producto y era
          invisible: el propietario votaba sin saber que su voto pesa distinto
          al del vecino, ni cuánto. */}
      {weighted && canVote && (
        <div
          className={`mb-4 rounded-lg border p-3 ${
            myWeight > 0 ? "border-cyan/40 bg-cyan/5" : "border-ember/40 bg-ember/5"
          }`}
        >
          {myWeight > 0 ? (
            <p className="text-[13px] text-marine-deep">
              Esta votación es <strong>ponderada por alícuota</strong>: tu voto pesa{" "}
              <strong className="font-mono tabular-nums">
                {myWeight.toLocaleString("es", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}%
              </strong>{" "}
              del condominio, no un voto por cabeza.
            </p>
          ) : (
            <p className="text-[13px] text-marine-deep">
              Esta votación es <strong>ponderada por alícuota</strong> y tu voto pesa{" "}
              <strong>0%</strong>: queda registrado, pero no suma al cómputo.{" "}
              <span className="text-mute">
                Pasa si eres inquilino, o si tu unidad todavía no tiene la alícuota cargada.
              </span>
            </p>
          )}
        </div>
      )}

      <div className="space-y-2">
        {question.options.map((option) => {
          const s = stats[option] ?? { count: 0, weight: 0 };
          const pct = totalWeight > 0 ? (s.weight / totalWeight) * 100 : 0;

          if (showResults) {
            return (
              <div key={option}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-medium">{option}</span>
                  <span className="font-meta text-mute">
                    {s.count} VOTO{s.count !== 1 ? "S" : ""} · {pct.toFixed(0)}%
                    {weighted ? " DE ALÍCUOTA" : ""}
                  </span>
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
              onClick={() => handleVote(option)}
              disabled={loading || !canVote}
              className="w-full text-left text-sm font-medium rounded-xl border p-3 hover:border-primary hover:bg-primary/5 transition-colors disabled:opacity-50"
            >
              {option}
            </button>
          );
        })}
      </div>

      {showResults && (
        <p className="mt-3 font-meta text-mute">
          {totalCount} VOTANTE{totalCount !== 1 ? "S" : ""}
        </p>
      )}

      {error && <p className="text-sm text-destructive mt-2">{error}</p>}
    </div>
  );
}
