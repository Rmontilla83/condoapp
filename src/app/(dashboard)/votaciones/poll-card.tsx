"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { votePoll, closePoll } from "./actions";

interface Poll {
  id: string;
  question: string;
  options: string;
  is_open: boolean;
  created_at: string;
  poll_votes: { selected_option: string; voter_id: string }[];
}

export function PollCard({
  poll,
  userId,
  isAdmin,
}: {
  poll: Poll;
  userId: string;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const options: string[] = typeof poll.options === "string" ? JSON.parse(poll.options) : poll.options;
  const votes = poll.poll_votes ?? [];
  const totalVotes = votes.length;
  const hasVoted = votes.some((v) => v.voter_id === userId);

  // Count votes per option
  const counts: Record<string, number> = {};
  for (const v of votes) {
    counts[v.selected_option] = (counts[v.selected_option] ?? 0) + 1;
  }

  const showResults = hasVoted || !poll.is_open;

  async function handleVote(option: string) {
    setLoading(true);
    setError("");
    const res = await votePoll(poll.id, option);
    if (res.error) {
      setError(res.error);
      setLoading(false);
      return;
    }
    setLoading(false);
    router.refresh();
  }

  async function handleClose() {
    setLoading(true);
    await closePoll(poll.id);
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="font-semibold text-[15px]">{poll.question}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {totalVotes} voto{totalVotes !== 1 ? "s" : ""} — {new Date(poll.created_at).toLocaleDateString("es", { day: "numeric", month: "short" })}
          </p>
        </div>
        <Badge variant="outline" className={poll.is_open ? "border-emerald-300 text-emerald-700 bg-emerald-50" : "border-gray-300 text-gray-700 bg-gray-50"}>
          {poll.is_open ? "Abierta" : "Cerrada"}
        </Badge>
      </div>

      <div className="space-y-2">
        {options.map((option) => {
          const count = counts[option] ?? 0;
          const pct = totalVotes > 0 ? (count / totalVotes) * 100 : 0;

          if (showResults) {
            return (
              <div key={option}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-medium">{option}</span>
                  <span className="text-xs text-muted-foreground">{count} ({pct.toFixed(0)}%)</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          }

          return (
            <button
              key={option}
              onClick={() => handleVote(option)}
              disabled={loading || !poll.is_open}
              className="w-full text-left text-sm font-medium rounded-xl border p-3 hover:border-primary hover:bg-primary/5 transition-colors disabled:opacity-50"
            >
              {option}
            </button>
          );
        })}
      </div>

      {error && <p className="text-sm text-destructive mt-2">{error}</p>}

      {isAdmin && poll.is_open && (
        <div className="mt-4 pt-3 border-t">
          <Button size="sm" variant="outline" onClick={handleClose} disabled={loading} className="text-xs">
            Cerrar votacion
          </Button>
        </div>
      )}
    </div>
  );
}
