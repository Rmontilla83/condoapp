import { getCurrentProfile, getMaintenanceForUser } from "@/lib/queries";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NewRequestDialog } from "./new-request-dialog";
import type { MaintenanceStatus } from "@/types/database";

const statusConfig: Record<string, { label: string; className: string; step: number }> = {
  new: { label: "Nuevo", className: "border-blue-300 text-blue-700 bg-blue-50", step: 1 },
  in_review: { label: "En revision", className: "border-amber-300 text-amber-700 bg-amber-50", step: 2 },
  in_progress: { label: "En progreso", className: "border-purple-300 text-purple-700 bg-purple-50", step: 3 },
  resolved: { label: "Resuelto", className: "border-emerald-300 text-emerald-700 bg-emerald-50", step: 4 },
};

const priorityConfig = {
  low: { label: "Baja", className: "text-slate-600" },
  medium: { label: "Media", className: "text-amber-600" },
  high: { label: "Alta", className: "text-orange-600" },
  urgent: { label: "Urgente", className: "text-red-600" },
};

const steps: MaintenanceStatus[] = ["new", "in_review", "in_progress", "resolved"];

export default async function MantenimientoPage() {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return null;

  const requests = await getMaintenanceForUser(profile.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mantenimiento</h1>
          <p className="text-muted-foreground">Reporta problemas y da seguimiento</p>
        </div>
        <NewRequestDialog />
      </div>

      {requests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No tienes solicitudes de mantenimiento</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => {
            const status = statusConfig[request.status] ?? statusConfig.new;
            const priority = priorityConfig[request.priority as keyof typeof priorityConfig] ?? priorityConfig.medium;
            return (
              <Card key={request.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium">{request.title}</h3>
                        <Badge variant="outline" className={status.className}>
                          {status.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{request.description}</p>
                      {request.photo_urls && request.photo_urls.length > 0 && (
                        <div className="flex gap-2 mb-3">
                          {request.photo_urls.map((url, idx) => (
                            <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="block h-16 w-16 rounded-lg overflow-hidden border hover:opacity-80 transition-opacity">
                              <img src={url} alt={`Foto ${idx + 1}`} className="h-full w-full object-cover" />
                            </a>
                          ))}
                        </div>
                      )}
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
                          </svg>
                          {request.category}
                        </span>
                        <span className={`flex items-center gap-1 font-medium ${priority.className}`}>
                          Prioridad: {priority.label}
                        </span>
                        <span>Reportado: {new Date(request.created_at).toLocaleDateString("es")}</span>
                        {request.assigned_to && (
                          <span>Asignado a: {request.assigned_to}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Progress tracker */}
                  <div className="mt-4 pt-3 border-t">
                    <div className="flex items-center gap-1">
                      {steps.map((step) => {
                        const stepConfig = statusConfig[step];
                        const isCompleted = stepConfig.step <= status.step;
                        const isCurrent = step === request.status;
                        return (
                          <div key={step} className="flex items-center flex-1">
                            <div className="flex flex-col items-center flex-1">
                              <div className={`h-2 w-full rounded-full ${
                                isCompleted ? "bg-primary" : "bg-muted"
                              }`} />
                              <span className={`text-[10px] mt-1 ${
                                isCurrent ? "font-bold text-primary" : "text-muted-foreground"
                              }`}>
                                {stepConfig.label}
                              </span>
                            </div>
                          </div>
                        );
                      })}
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
