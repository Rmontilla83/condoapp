import { getCurrentProfile } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { NewPassDialog } from "./new-pass-dialog";
import type { AccessPass } from "@/types/database";

const statusConfig: Record<string, { label: string; tag: string }> = {
  active: { label: "ACTIVO", tag: "bg-cyan/10 text-cyan" },
  used: { label: "USADO", tag: "bg-mute/15 text-mute" },
  expired: { label: "EXPIRADO", tag: "bg-mute/15 text-mute" },
  cancelled: { label: "CANCELADO", tag: "bg-destructive/10 text-destructive" },
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

  const now = new Date();
  const displayPasses = passes.map((p) => {
    if (p.status === "active" && new Date(p.valid_until) < now) {
      return { ...p, status: "expired" as const };
    }
    return p;
  });

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="font-meta-loose text-cyan">ACCESO · VISITANTES</span>
          <h1 className="mt-4 font-display text-[clamp(1.75rem,3.5vw,2.5rem)] leading-[1.1] tracking-[-0.03em] text-marine-deep">
            Genera <em className="font-editorial text-cyan">QR</em> de acceso
          </h1>
        </div>
        <NewPassDialog />
      </div>

      {/* How it works */}
      <div className="rounded-2xl bg-marine-deep text-frost p-6 md:p-7">
        <p className="font-meta text-ember">CÓMO FUNCIONA</p>
        <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            { step: "01", title: "Registra", desc: "Ingresa nombre y cédula de tu visitante." },
            { step: "02", title: "Comparte", desc: "Envía el QR por WhatsApp a tu visitante." },
            { step: "03", title: "Acceso", desc: "El vigilante escanea y verifica al instante." },
          ].map((s) => (
            <div key={s.step} className="flex items-start gap-3">
              <span className="font-meta text-ember shrink-0">{s.step}</span>
              <div>
                <p className="font-display text-[17px] leading-tight text-frost">{s.title}</p>
                <p className="mt-1.5 text-[13px] text-frost/60 leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Passes list */}
      {displayPasses.length === 0 ? (
        <div className="rounded-2xl bg-card border border-border py-16 text-center">
          <p className="text-[14px] text-mute">No has generado pases de visitante aún.</p>
          <p className="mt-2 font-meta text-mute">
            TOCA &ldquo;NUEVO VISITANTE&rdquo; PARA CREAR TU PRIMER QR
          </p>
        </div>
      ) : (
        <div>
          <p className="font-meta text-mute mb-4">
            {displayPasses.length} PASE{displayPasses.length !== 1 ? "S" : ""} RECIENTE{displayPasses.length !== 1 ? "S" : ""}
          </p>
          <div className="space-y-3">
            {displayPasses.map((pass) => {
              const config = statusConfig[pass.status] ?? statusConfig.expired;
              return (
                <div
                  key={pass.id}
                  className="rounded-2xl bg-card border border-border p-5 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-marine-deep text-frost shrink-0">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                      </svg>
                    </span>
                    <div className="min-w-0">
                      <p className="text-[14px] font-medium text-marine-deep truncate">{pass.visitor_name}</p>
                      <p className="mt-0.5 font-meta text-mute truncate">
                        {pass.visitor_id_number}
                        {pass.unit_number ? ` · APTO ${pass.unit_number}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-meta text-mute hidden sm:inline">
                      {new Date(pass.created_at)
                        .toLocaleDateString("es", {
                          day: "numeric",
                          month: "short",
                        })
                        .toUpperCase()}
                    </span>
                    <span className={`font-meta px-2.5 py-1 rounded-md ${config.tag}`}>
                      {config.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
