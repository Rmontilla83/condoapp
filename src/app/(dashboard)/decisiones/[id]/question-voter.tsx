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
}

export function QuestionVoter({ decisionId, question, showResults, canVote, questionNumber }: Props) {
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
