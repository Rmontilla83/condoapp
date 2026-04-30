import Link from "next/link";

interface Props {
  reservation: {
    id: string;
    start_time: string;
    end_time: string;
    common_area_name: string;
    notes: string | null;
  } | null;
}

const DAY_LABELS = ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"];

function formatHourRange(startIso: string, endIso: string): string {
  const s = new Date(startIso);
  const e = new Date(endIso);
  const fmt = (d: Date) =>
    d.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${fmt(s)}–${fmt(e)}`;
}

export function UpcomingReservationCard({ reservation }: Props) {
  if (!reservation) return null;

  const start = new Date(reservation.start_time);
  const end = new Date(reservation.end_time);
  const now = new Date();
  const isOngoing = start <= now && end > now;
  const dayLabel = DAY_LABELS[start.getDay()];
  const dayNum = start.getDate();
  const monthLabel = start.toLocaleDateString("es", { month: "short" }).toUpperCase();

  return (
    <div className="rounded-2xl bg-card border border-border p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="shrink-0 flex h-12 w-12 items-center justify-center rounded-xl bg-cyan/10 text-cyan">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-meta text-mute">TU PRÓXIMA RESERVA</p>
              {isOngoing && (
                <span className="font-meta bg-cyan/10 text-cyan px-2 py-0.5 rounded-md">
                  EN CURSO
                </span>
              )}
            </div>
            <p className="mt-1.5 text-[15px] font-semibold text-marine-deep truncate">
              {reservation.common_area_name || "Área común"}
            </p>
            <p className="mt-0.5 text-[13px] text-mute">
              {dayLabel} {dayNum} {monthLabel} · {formatHourRange(reservation.start_time, reservation.end_time)}
            </p>
          </div>
        </div>
        <Link
          href="/reservas"
          className="shrink-0 font-meta text-cyan hover:text-marine-deep transition-colors"
        >
          VER →
        </Link>
      </div>
    </div>
  );
}
