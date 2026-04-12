import { getCurrentProfile } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ReserveDialog } from "./reserve-dialog";
import { CancelButton } from "./cancel-button";

const areaEmojis: Record<string, string> = {
  "Salon de Eventos": "🎉",
  "Gimnasio": "💪",
  "Area BBQ": "🔥",
  "Piscina": "🏊",
};

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

  // My reservations
  const myReservations = reservations.filter((r) => r.reserved_by === profile.id);
  const otherReservations = reservations.filter((r) => r.reserved_by !== profile.id);

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit", hour12: true });
  }
  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("es", { weekday: "short", day: "numeric", month: "short" });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "Outfit, sans-serif" }}>
            Areas comunes
          </h1>
          <p className="text-muted-foreground">Reserva espacios para tu uso</p>
        </div>
        <ReserveDialog areas={areas} />
      </div>

      {/* Available spaces */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {areas.map((area) => (
          <Card key={area.id} className="text-center">
            <CardContent className="p-4">
              <span className="text-3xl block mb-2">{areaEmojis[area.name] ?? "📍"}</span>
              <p className="text-sm font-semibold">{area.name}</p>
              {area.capacity && (
                <p className="text-xs text-muted-foreground">Cap. {area.capacity} personas</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* My reservations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Mis reservas</CardTitle>
          <CardDescription>Tus proximas reservas</CardDescription>
        </CardHeader>
        <CardContent>
          {myReservations.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">No tienes reservas activas</p>
          ) : (
            <div className="space-y-3">
              {myReservations.map((r) => {
                const areaName = Array.isArray(r.common_areas) ? r.common_areas[0]?.name : r.common_areas?.name;
                return (
                  <div key={r.id} className="flex items-center justify-between rounded-xl border p-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{areaEmojis[areaName ?? ""] ?? "📍"}</span>
                      <div>
                        <p className="text-sm font-semibold">{areaName}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(r.start_time)} — {formatTime(r.start_time)} a {formatTime(r.end_time)}
                        </p>
                        {r.notes && <p className="text-xs text-muted-foreground mt-0.5">{r.notes}</p>}
                      </div>
                    </div>
                    <CancelButton id={r.id} />
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upcoming reservations by others */}
      {otherReservations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Proximas reservas</CardTitle>
            <CardDescription>Reservas de otros residentes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {otherReservations.map((r) => {
                const areaName = Array.isArray(r.common_areas) ? r.common_areas[0]?.name : r.common_areas?.name;
                const personName = Array.isArray(r.profiles) ? r.profiles[0]?.full_name : r.profiles?.full_name;
                return (
                  <div key={r.id} className="flex items-center justify-between rounded-xl border p-3 opacity-70">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{areaEmojis[areaName ?? ""] ?? "📍"}</span>
                      <div>
                        <p className="text-sm font-semibold">{areaName}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(r.start_time)} — {formatTime(r.start_time)} a {formatTime(r.end_time)}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">{personName ?? "Residente"}</Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
