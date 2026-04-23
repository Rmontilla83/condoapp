import { getCurrentProfile, getMaintenanceForUser } from "@/lib/queries";
import { NewRequestDialog } from "./new-request-dialog";
import type { MaintenanceStatus } from "@/types/database";

const statusConfig: Record<string, { label: string; tag: string; step: number }> = {
  new: { label: "NUEVO", tag: "bg-cyan/10 text-cyan", step: 1 },
  in_review: { label: "EN REVISIÓN", tag: "bg-ember/15 text-ember", step: 2 },
  in_progress: { label: "EN CURSO", tag: "bg-ember/15 text-ember", step: 3 },
  resolved: { label: "RESUELTO", tag: "bg-cyan/10 text-cyan", step: 4 },
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

  const requests = await getMaintenanceForUser(profile.id);

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="font-meta-loose text-cyan">MANTENIMIENTO</span>
          <h1 className="mt-4 font-display text-[clamp(1.75rem,3.5vw,2.5rem)] leading-[1.1] tracking-[-0.03em] text-marine-deep">
            Reporta y da <em className="font-editorial text-cyan">seguimiento</em>
          </h1>
        </div>
        <NewRequestDialog />
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
                      <span>{request.category.toUpperCase()}</span>
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

                {/* Progress tracker */}
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
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
