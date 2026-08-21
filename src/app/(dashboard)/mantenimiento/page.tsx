import { getCurrentProfile, getMaintenanceForUser, getCommonAreas } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { signStorageRefRows } from "@/lib/storage";
import { NewRequestDialog } from "./new-request-dialog";
import type { CommonArea, MaintenanceStatus } from "@/types/database";
import type { UnitOption } from "./location-step";
import { UNIT_TYPE_LABELS, MAINTENANCE_CATEGORY_LABELS } from "@/lib/labels";

const statusConfig: Record<string, { label: string; tag: string; step: number }> = {
  new: { label: "NUEVO", tag: "bg-cyan/10 text-cyan-ink", step: 1 },
  in_review: { label: "EN REVISIÓN", tag: "bg-ember/15 text-ember-ink", step: 2 },
  in_progress: { label: "EN CURSO", tag: "bg-ember/15 text-ember-ink", step: 3 },
  resolved: { label: "RESUELTO", tag: "bg-cyan/10 text-cyan-ink", step: 4 },
  cancelled: { label: "DESCARTADO", tag: "bg-cloud text-mute", step: 0 },
};

const priorityConfig = {
  low: { label: "BAJA", className: "text-mute" },
  medium: { label: "MEDIA", className: "text-ember" },
  high: { label: "ALTA", className: "text-ember" },
  urgent: { label: "URGENTE", className: "text-destructive" },
};


const steps: MaintenanceStatus[] = ["new", "in_review", "in_progress", "resolved"];

export default async function MantenimientoPage() {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return null;

  const supabase = await createClient();

  const [requestsRaw, commonAreas, membersRes] = await Promise.all([
    getMaintenanceForUser(profile.id),
    getCommonAreas(profile.organization_id),
    supabase
      .from("unit_members")
      .select("unit_id, units(unit_number, block, type)")
      .eq("profile_id", profile.id)
      .eq("active", true)
      .order("joined_at", { ascending: false }),
  ]);

  // Historial de cambios. `maintenance_status_log` se escribía desde el primer
  // día y no lo leía nadie: el vecino veía el estado de HOY y ninguna señal de
  // que su reporte se estuviera moviendo, ni de por qué se descartó.
  const { data: historialRaw } = requestsRaw.length
    ? await supabase
        .from("maintenance_status_log")
        .select("request_id, old_status, new_status, note, created_at")
        .in(
          "request_id",
          requestsRaw.map((r) => r.id),
        )
        .order("created_at", { ascending: true })
    : { data: [] };

  const historialPorReporte = new Map<
    string,
    { new_status: string; note: string | null; created_at: string }[]
  >();
  for (const fila of historialRaw ?? []) {
    const clave = fila.request_id as string;
    const lista = historialPorReporte.get(clave) ?? [];
    lista.push({
      new_status: fila.new_status as string,
      note: (fila.note as string | null) ?? null,
      created_at: fila.created_at as string,
    });
    historialPorReporte.set(clave, lista);
  }

  // El bucket es privado (migration 030): `photo_urls` guarda referencias
  // `bucket/path`, no URLs navegables. Se firman en el servidor y las que
  // fallen se descartan, así nunca se renderiza un <img> roto.
  const firmasFotos = await signStorageRefRows(
    requestsRaw.map((r) => r.photo_urls as string[] | null),
  );
  const requests = requestsRaw.map((r, i) => ({ ...r, photo_urls: firmasFotos[i] }));

  const units: UnitOption[] = (membersRes.data ?? [])
    .map((m) => {
      const u = Array.isArray(m.units) ? m.units[0] : m.units;
      if (!u) return null;
      const typeLabel = UNIT_TYPE_LABELS[u.type as string] ?? "UNIDAD";
      const block = u.block ? ` · ${u.block}` : "";
      return {
        id: m.unit_id as string,
        label: `${typeLabel} ${u.unit_number}${block}`,
      };
    })
    .filter((u): u is UnitOption => u !== null);

  // Mapa para mostrar ubicación en cada request
  const commonAreaById = new Map(
    (commonAreas as CommonArea[]).map((c) => [c.id, c.name]),
  );
  const unitById = new Map(
    units.map((u) => [u.id, u.label]),
  );

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="font-meta-loose text-cyan-ink">MANTENIMIENTO</span>
          <h1 className="mt-4 font-display text-[clamp(1.75rem,3.5vw,2.5rem)] leading-[1.1] tracking-[-0.03em] text-marine-deep">
            Reporta y da <em className="font-editorial text-cyan">seguimiento</em>
          </h1>
        </div>
        <NewRequestDialog units={units} commonAreas={commonAreas as CommonArea[]} />
      </div>

      {requests.length === 0 ? (
        <div className="rounded-2xl bg-card border border-border py-16 text-center">
          <p className="text-[14px] text-mute">No tienes solicitudes de mantenimiento.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => {
            const status = statusConfig[request.status] ?? statusConfig.new;
            const priority =
              priorityConfig[request.priority as keyof typeof priorityConfig] ??
              priorityConfig.medium;

            // Resolver ubicación a mostrar
            let locationLabel: string | null = null;
            if (request.common_area_id && commonAreaById.has(request.common_area_id)) {
              locationLabel = `${commonAreaById.get(request.common_area_id)} · ÁREA COMÚN`;
            } else if (request.unit_id && unitById.has(request.unit_id)) {
              locationLabel = unitById.get(request.unit_id) ?? null;
            }

            return (
              <article
                key={request.id}
                className="rounded-2xl bg-card border border-border p-5 md:p-6"
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5 mb-2 flex-wrap">
                      <h3 className="font-display text-[18px] leading-tight tracking-[-0.02em] text-marine-deep">
                        {request.title}
                      </h3>
                      <span className={`font-meta px-2 py-0.5 rounded-md ${status.tag}`}>
                        {status.label}
                      </span>
                    </div>
                    {locationLabel && (
                      <p className="font-meta text-mute mb-2">{locationLabel}</p>
                    )}
                    <p className="text-[14.5px] text-marine-deep/80 leading-relaxed mb-4">
                      {request.description}
                    </p>

                    {request.photo_urls && request.photo_urls.length > 0 && (
                      <div className="flex gap-2 mb-4">
                        {request.photo_urls.map((url, idx) => (
                          <a
                            key={idx}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block h-16 w-16 rounded-lg overflow-hidden border border-border hover:opacity-80 transition-opacity"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={url} alt={`Foto ${idx + 1}`} className="h-full w-full object-cover" />
                          </a>
                        ))}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-4 font-meta text-mute">
                      <span>{(MAINTENANCE_CATEGORY_LABELS[request.category] ?? request.category).toUpperCase()}</span>
                      <span className={priority.className}>· {priority.label}</span>
                      <span>
                        ·{" "}
                        {new Date(request.created_at)
                          .toLocaleDateString("es", { day: "numeric", month: "short" })
                          .toUpperCase()}
                      </span>
                      {request.assigned_to && (
                        <span>· ASIGNADO A {request.assigned_to.toUpperCase()}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Historial: qué pasó y cuándo, con la nota del administrador
                    si la escribió. Es lo que convierte "reporté algo" en
                    "alguien lo está viendo". */}
                {(historialPorReporte.get(request.id) ?? []).length > 0 && (
                  <div className="mt-5 pt-5 border-t border-border">
                    <p className="font-meta text-mute mb-2.5">HISTORIAL</p>
                    <ol className="space-y-2">
                      {(historialPorReporte.get(request.id) ?? []).map((h, i) => (
                        <li key={i} className="flex gap-3 text-[13px]">
                          <span className="font-meta text-mute shrink-0 pt-0.5 w-16">
                            {new Date(h.created_at)
                              .toLocaleDateString("es", { day: "numeric", month: "short" })
                              .toUpperCase()}
                          </span>
                          <span className="text-marine-deep/80">
                            {statusConfig[h.new_status]?.label ?? h.new_status.toUpperCase()}
                            {h.note ? (
                              <span className="block text-mute mt-0.5">{h.note}</span>
                            ) : null}
                          </span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {/* Un reporte descartado no está en el camino de los cuatro
                    pasos: pintar la barra completa en gris se lee como "no ha
                    pasado nada", que es lo contrario de lo que ocurrió. */}
                {request.status === "cancelled" ? (
                  <div className="mt-5 pt-5 border-t border-border">
                    <p className="font-meta text-mute">
                      ESTE REPORTE SE CERRÓ SIN ATENDERSE
                    </p>
                    <p className="mt-1.5 text-[13px] text-mute">
                      El motivo está en el historial de arriba. Si crees que hace falta
                      revisarlo de nuevo, háblalo con la administración: pueden reabrirlo.
                    </p>
                  </div>
                ) : (
                <div className="mt-5 pt-5 border-t border-border">
                  <div className="flex gap-1.5 mb-2">
                    {steps.map((step) => {
                      const stepConfig = statusConfig[step];
                      const isCompleted = stepConfig.step <= status.step;
                      const isCurrent = step === request.status;
                      return (
                        <div
                          key={step}
                          className={`h-1 flex-1 rounded-full ${
                            isCurrent ? "bg-ember" : isCompleted ? "bg-marine-deep" : "bg-border"
                          }`}
                        />
                      );
                    })}
                  </div>
                  <div className="flex justify-between font-meta text-mute">
                    {steps.map((step) => {
                      const isCurrent = step === request.status;
                      return (
                        <span
                          key={step}
                          className={isCurrent ? "text-ember" : "text-mute"}
                        >
                          {statusConfig[step].label}
                        </span>
                      );
                    })}
                  </div>
                </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
