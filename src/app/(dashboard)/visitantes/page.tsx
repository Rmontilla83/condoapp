import { getCurrentProfile } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NewPassDialog } from "./new-pass-dialog";
import type { AccessPass } from "@/types/database";

const statusConfig: Record<string, { label: string; className: string }> = {
  active: { label: "Activo", className: "border-emerald-300 text-emerald-700 bg-emerald-50" },
  used: { label: "Usado", className: "border-blue-300 text-blue-700 bg-blue-50" },
  expired: { label: "Expirado", className: "border-gray-300 text-gray-700 bg-gray-50" },
  cancelled: { label: "Cancelado", className: "border-red-300 text-red-700 bg-red-50" },
};

export default async function VisitantesPage() {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("access_passes")
    .select("*")
    .eq("created_by", profile.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const passes = (data ?? []) as AccessPass[];

  // Mark expired passes
  const now = new Date();
  const displayPasses = passes.map((p) => {
    if (p.status === "active" && new Date(p.valid_until) < now) {
      return { ...p, status: "expired" as const };
    }
    return p;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "Outfit, sans-serif" }}>
            Visitantes
          </h1>
          <p className="text-muted-foreground">Genera QR de acceso para tus visitantes</p>
        </div>
        <NewPassDialog />
      </div>

      {/* How it works */}
      <Card>
        <CardContent className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { step: "1", title: "Registra", desc: "Ingresa nombre y cedula de tu visitante" },
              { step: "2", title: "Comparte", desc: "Envia el QR por WhatsApp a tu visitante" },
              { step: "3", title: "Acceso", desc: "El vigilante escanea y verifica al instante" },
            ].map((s) => (
              <div key={s.step} className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary text-sm font-bold">
                  {s.step}
                </div>
                <div>
                  <p className="text-sm font-semibold">{s.title}</p>
                  <p className="text-xs text-muted-foreground">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Passes list */}
      {displayPasses.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5z" />
              </svg>
            </div>
            <p className="text-muted-foreground">No has generado pases de visitante aun</p>
            <p className="text-xs text-muted-foreground mt-1">Toca "Nuevo visitante" para crear tu primer QR</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-muted-foreground">{displayPasses.length} pases recientes</p>
          {displayPasses.map((pass) => {
            const config = statusConfig[pass.status] ?? statusConfig.expired;
            return (
              <Card key={pass.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{pass.visitor_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {pass.visitor_id_number}
                          {pass.unit_number ? ` → Apto ${pass.unit_number}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right hidden sm:block">
                        <p className="text-xs text-muted-foreground">
                          {new Date(pass.created_at).toLocaleDateString("es", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                      <Badge variant="outline" className={config.className}>
                        {config.label}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
