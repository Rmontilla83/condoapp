import Link from "next/link";
import type { Announcement } from "@/types/database";

export function UrgentBanner({ announcements }: { announcements: Announcement[] }) {
  if (!announcements || announcements.length === 0) return null;
  // Urgente primero; dentro de cada prioridad, el más reciente (ya vienen así).
  const ordenados = [...announcements].sort(
    (a, b) => Number(b.priority === "urgent") - Number(a.priority === "urgent"),
  );
  const main = ordenados[0];
  const extra = ordenados.length - 1;
  const urgente = main.priority === "urgent";

  return (
    <div
      className={`rounded-2xl border p-5 md:p-6 ${
        urgente ? "border-destructive/30 bg-destructive/5" : "border-ember/30 bg-ember/5"
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`mt-1.5 inline-block h-2.5 w-2.5 shrink-0 rounded-full ${
            urgente ? "bg-destructive animate-pulse motion-reduce:animate-none" : "bg-ember"
          }`}
        />
        <div className="min-w-0 flex-1">
          <p className={`font-meta ${urgente ? "text-destructive" : "text-ember-ink"}`}>
            {urgente ? "URGENTE" : "IMPORTANTE"} · COMUNICADO
          </p>
          <p className="mt-2 text-[16px] font-semibold text-marine-deep truncate">
            {main.title}
          </p>
          <p className="mt-1 text-[14px] text-marine-deep/80 line-clamp-2">
            {main.content}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Link
              href={`/comunicados#${main.id}`}
              className={`font-meta hover:underline ${urgente ? "text-destructive" : "text-ember-ink"}`}
            >
              VER DETALLE →
            </Link>
            {extra > 0 && (
              <Link
                href="/comunicados"
                className="font-meta text-mute hover:text-marine-deep transition-colors"
              >
                + {extra} AVISO{extra > 1 ? "S" : ""} MÁS
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
