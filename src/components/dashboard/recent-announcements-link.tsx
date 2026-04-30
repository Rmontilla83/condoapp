import Link from "next/link";

export function RecentAnnouncementsLink({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <Link
      href="/comunicados"
      className="inline-flex items-center gap-2 font-meta text-mute hover:text-marine-deep transition-colors"
    >
      {count} {count === 1 ? "COMUNICADO RECIENTE" : "COMUNICADOS RECIENTES"} · ÚLTIMOS 30 DÍAS →
    </Link>
  );
}
