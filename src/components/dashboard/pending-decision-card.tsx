import Link from "next/link";
import type { DecisionKind } from "@/types/database";

interface OpenDecision {
  id: string;
  kind: DecisionKind;
  title: string;
  closes_at: string | null;
  total_voters: number;
}

function formatClosesAt(closesAt: string | null): string {
  if (!closesAt) return "SIN FECHA LÍMITE";
  const end = new Date(closesAt);
  const now = new Date();
  const diffMs = end.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return `VENCIÓ HACE ${Math.abs(diffDays)} DÍA${Math.abs(diffDays) === 1 ? "" : "S"}`;
  if (diffDays === 0) return "VENCE HOY";
  if (diffDays === 1) return "VENCE MAÑANA";
  return `VENCE EN ${diffDays} DÍAS`;
}

export function PendingDecisionCard({ decisions }: { decisions: OpenDecision[] }) {
  if (!decisions || decisions.length === 0) return null;
  const main = decisions[0];
  const extra = decisions.length - 1;
  const endsLabel = formatClosesAt(main.closes_at);
  const isOverdue = main.closes_at && new Date(main.closes_at) < new Date();
  const isFormal = main.kind === "formal_assembly";

  return (
    <div className="rounded-2xl border border-cyan/30 bg-cyan/5 p-5">
      <div className="flex items-start gap-3">
        <div className="shrink-0 flex h-12 w-12 items-center justify-center rounded-xl bg-cyan/15 text-cyan">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-meta text-cyan-ink">DECISIÓN PENDIENTE</p>
            {isFormal && (
              <span className="font-meta bg-marine-deep/5 border border-marine-deep/10 text-marine-deep px-2 py-0.5 rounded-md">
                ASAMBLEA FORMAL
              </span>
            )}
          </div>
          <p className="mt-1.5 text-[15px] font-semibold text-marine-deep line-clamp-2">
            {main.title}
          </p>
          <p
            className={`mt-1 font-meta ${
              isOverdue ? "text-destructive" : "text-mute"
            }`}
          >
            {endsLabel}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Link
              href={`/decisiones#decision-${main.id}`}
              className="inline-flex items-center font-meta text-cyan-ink hover:text-marine-deep transition-colors"
            >
              VOTAR AHORA →
            </Link>
            {extra > 0 && (
              <Link
                href="/decisiones"
                className="font-meta text-mute hover:text-marine-deep transition-colors"
              >
                + {extra} DECISI{extra > 1 ? "ONES" : "ÓN"} MÁS
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
