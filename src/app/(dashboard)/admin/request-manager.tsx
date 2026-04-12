"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateRequestStatus } from "../mantenimiento/actions";
import type { MaintenanceRequest } from "@/types/database";

const statusConfig: Record<string, { label: string; className: string }> = {
  new: { label: "Nuevo", className: "border-blue-300 text-blue-700 bg-blue-50" },
  in_review: { label: "En revision", className: "border-amber-300 text-amber-700 bg-amber-50" },
  in_progress: { label: "En progreso", className: "border-purple-300 text-purple-700 bg-purple-50" },
  resolved: { label: "Resuelto", className: "border-emerald-300 text-emerald-700 bg-emerald-50" },
};

const statusFlow = ["new", "in_review", "in_progress", "resolved"] as const;

export function RequestManager({ requests }: { requests: MaintenanceRequest[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [assignTo, setAssignTo] = useState<Record<string, string>>({});

  async function handleStatusChange(requestId: string, newStatus: string) {
    setLoading(requestId);
    await updateRequestStatus(requestId, newStatus, assignTo[requestId]);
    setLoading(null);
    setExpandedId(null);
  }

  if (requests.length === 0) {
    return <p className="py-4 text-center text-sm text-muted-foreground">No hay solicitudes pendientes</p>;
  }

  return (
    <div className="space-y-3">
      {requests.map((req) => {
        const config = statusConfig[req.status] ?? statusConfig.new;
        const isExpanded = expandedId === req.id;
        const currentIdx = statusFlow.indexOf(req.status as typeof statusFlow[number]);
        const nextStatus = currentIdx < statusFlow.length - 1 ? statusFlow[currentIdx + 1] : null;
        const nextConfig = nextStatus ? statusConfig[nextStatus] : null;
        const isLoading = loading === req.id;

        return (
          <div key={req.id} className="rounded-xl border bg-card overflow-hidden">
            <button
              onClick={() => setExpandedId(isExpanded ? null : req.id)}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                  req.priority === "urgent" || req.priority === "high" ? "bg-red-500" : "bg-amber-500"
                }`} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{req.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(req.created_at).toLocaleDateString("es", { day: "numeric", month: "short" })}
                    {req.assigned_to ? ` — ${req.assigned_to}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="outline" className={config.className}>{config.label}</Badge>
                <svg className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </div>
            </button>

            {isExpanded && (
              <div className="border-t p-4 bg-muted/20 space-y-4">
                <p className="text-sm text-muted-foreground">{req.description}</p>

                {req.photo_urls && req.photo_urls.length > 0 && (
                  <div className="flex gap-2">
                    {req.photo_urls.map((url, idx) => (
                      <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="block h-20 w-20 rounded-lg overflow-hidden border">
                        <img src={url} alt={`Foto ${idx + 1}`} className="h-full w-full object-cover" />
                      </a>
                    ))}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Asignar a</label>
                    <Input
                      placeholder="Nombre del responsable"
                      value={assignTo[req.id] ?? req.assigned_to ?? ""}
                      onChange={(e) => setAssignTo((prev) => ({ ...prev, [req.id]: e.target.value }))}
                      className="h-9 text-sm"
                    />
                  </div>
                  {nextStatus && nextConfig && (
                    <div className="flex items-end">
                      <Button
                        size="sm"
                        onClick={() => handleStatusChange(req.id, nextStatus)}
                        disabled={isLoading}
                        className="whitespace-nowrap"
                      >
                        {isLoading ? "Actualizando..." : `Mover a ${nextConfig.label}`}
                      </Button>
                    </div>
                  )}
                </div>

                {req.status !== "resolved" && (
                  <div className="flex gap-2 pt-2 border-t">
                    {statusFlow
                      .filter((s) => s !== req.status)
                      .map((s) => (
                        <button
                          key={s}
                          onClick={() => handleStatusChange(req.id, s)}
                          disabled={isLoading}
                          className={`text-xs px-2.5 py-1 rounded-full border transition-colors hover:opacity-80 ${statusConfig[s].className}`}
                        >
                          {statusConfig[s].label}
                        </button>
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
