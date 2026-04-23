import { getCurrentProfile } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { ReserveDialog } from "./reserve-dialog";
import { CancelButton } from "./cancel-button";

// Iconos geométricos por tipo de área (sustituye emojis del brand original)
function AreaIcon({ name, className }: { name: string; className?: string }) {
  const normalized = name.toLowerCase();
  const common = `h-5 w-5 ${className ?? ""}`;

  if (normalized.includes("piscina")) {
    return (
      <svg className={common} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5 4.5 4.5 0 014.5 4.5M2.25 15a4.5 4.5 0 014.5-4.5 4.5 4.5 0 004.5-4.5M2.25 15h19.5M21.75 15a4.5 4.5 0 00-4.5 4.5 4.5 4.5 0 01-4.5 4.5M21.75 15a4.5 4.5 0 01-4.5-4.5 4.5 4.5 0 00-4.5-4.5" />
      </svg>
    );
  }
  if (normalized.includes("gym") || normalized.includes("gimnasio")) {
    return (
      <svg className={common} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l-3 3 3 3M18 9l3 3-3 3M9 6h6M9 18h6M12 3v18" />
      </svg>
    );
  }
  if (normalized.includes("bbq") || normalized.includes("parrilla") || normalized.includes("asado")) {
    return (
      <svg className={common} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
      </svg>
    );
  }
  // Default — salón / coworking / cancha
  return (
    <svg className={common} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m3-3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
    </svg>
  );
}

export default async function ReservasPage() {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return null;

  const supabase = await createClient();

  const [areasRes, reservationsRes] = await Promise.all([
    supabase
      .from("common_areas")
      .select("id, name, description, capacity")
      .eq("organization_id", profile.organization_id)
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("reservations")
      .select("*, common_areas(name), profiles:reserved_by(full_name)")
      .eq("status", "confirmed")
      .gte("end_time", new Date().toISOString())
      .order("start_time", { ascending: true }),
  ]);

  const areas = areasRes.data ?? [];
  const reservations = reservationsRes.data ?? [];

  const myReservations = reservations.filter((r) => r.reserved_by === profile.id);
  const otherReservations = reservations.filter((r) => r.reserved_by !== profile.id);

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit", hour12: true });
  }
  function formatDate(iso: string) {
    return new Date(iso)
      .toLocaleDateString("es", { weekday: "short", day: "numeric", month: "short" })
      .toUpperCase();
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="font-meta-loose text-steel">ÁREAS COMUNES</span>
          <h1 className="mt-4 font-display text-[clamp(1.75rem,3.5vw,2.5rem)] leading-[1.1] tracking-[-0.03em] text-ink">
            Reserva <em className="font-editorial text-steel">espacios</em>
          </h1>
        </div>
        <ReserveDialog areas={areas} />
      </div>

      {/* Available spaces */}
      <div>
        <p className="font-meta text-mute mb-3">ESPACIOS DISPONIBLES</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {areas.map((area) => (
            <div key={area.id} className="rounded-2xl bg-card border border-border p-5">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-ink text-bone mb-4">
                <AreaIcon name={area.name} />
              </span>
              <p className="text-[14px] font-medium text-ink">{area.name}</p>
              {area.capacity && (
                <p className="mt-1 font-meta text-mute">CAP. {area.capacity} PERSONAS</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* My reservations */}
      <div className="rounded-2xl bg-card border border-border p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="font-meta text-mute">MIS RESERVAS</p>
            <p className="mt-2 text-[15px] font-medium text-ink">Tus próximas reservas</p>
          </div>
        </div>

        {myReservations.length === 0 ? (
          <p className="py-6 text-center text-[13px] text-mute">No tienes reservas activas.</p>
        ) : (
          <ul className="space-y-0" role="list">
            {myReservations.map((r) => {
              const areaName = Array.isArray(r.common_areas)
                ? r.common_areas[0]?.name
                : r.common_areas?.name;
              return (
                <li
                  key={r.id}
                  className="flex items-center justify-between py-3.5 border-b border-border last:border-0 gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-cloud text-ink shrink-0">
                      <AreaIcon name={areaName ?? ""} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[14px] font-medium text-ink truncate">{areaName}</p>
                      <p className="mt-0.5 font-meta text-mute">
                        {formatDate(r.start_time)} · {formatTime(r.start_time)} – {formatTime(r.end_time)}
                      </p>
                      {r.notes && (
                        <p className="mt-0.5 text-[12.5px] text-mute truncate">{r.notes}</p>
                      )}
                    </div>
                  </div>
                  <CancelButton id={r.id} />
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Other reservations */}
      {otherReservations.length > 0 && (
        <div className="rounded-2xl bg-card border border-border p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="font-meta text-mute">PRÓXIMAS RESERVAS</p>
              <p className="mt-2 text-[15px] font-medium text-ink">De otros residentes</p>
            </div>
          </div>
          <ul className="space-y-0" role="list">
            {otherReservations.map((r) => {
              const areaName = Array.isArray(r.common_areas)
                ? r.common_areas[0]?.name
                : r.common_areas?.name;
              const personName = Array.isArray(r.profiles)
                ? r.profiles[0]?.full_name
                : r.profiles?.full_name;
              return (
                <li
                  key={r.id}
                  className="flex items-center justify-between py-3.5 border-b border-border last:border-0 gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-cloud/60 text-mute shrink-0">
                      <AreaIcon name={areaName ?? ""} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[14px] font-medium text-ink truncate">{areaName}</p>
                      <p className="mt-0.5 font-meta text-mute">
                        {formatDate(r.start_time)} · {formatTime(r.start_time)} – {formatTime(r.end_time)}
                      </p>
                    </div>
                  </div>
                  <span className="font-meta text-mute shrink-0">
                    {(personName ?? "Residente").toUpperCase()}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
