"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateRequestStatus } from "../mantenimiento/actions";
import type { MaintenanceRequest } from "@/types/database";

const statusConfig: Record<string, { label: string; tag: string }> = {
  new: { label: "NUEVO", tag: "bg-cyan/10 text-cyan" },
  in_review: { label: "EN REVISIÓN", tag: "bg-ember/15 text-ember" },
  in_progress: { label: "EN CURSO", tag: "bg-ember/15 text-ember" },
  resolved: { label: "RESUELTO", tag: "bg-cyan/10 text-cyan" },
};

const statusFlow = ["new", "in_review", "in_progress", "resolved"] as const;

export function RequestManager({ requests }: { requests: MaintenanceRequest[] }) {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [assignTo, setAssignTo] = useState<Record<string, string>>({});

  async function handleStatusChange(requestId: string, newStatus: string) {
    setLoadingId(requestId);
    setErrors((prev) => {
      const next = { ...prev };
      delete next[requestId];
      return next;
    });

    try {
      const result = await updateRequestStatus(requestId, newStatus, assignTo[requestId]);

      if ("error" in result && result.error) {
        setErrors((prev) => ({ ...prev, [requestId]: result.error! }));
        setLoadingId(null);
        return;
      }

      setExpandedId(null);
      setLoadingId(null);
      window.location.reload();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      setErrors((prev) => ({ ...prev, [requestId]: msg }));
      setLoadingId(null);
    }
  }

  if (requests.length === 0) {
    return (
      <p className="py-4 text-center text-[13px] text-mute">
        No hay solicitudes pendientes.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {requests.map((req) => {
        const config = statusConfig[req.status] ?? statusConfig.new;
        const isExpanded = expandedId === req.id;
        const currentIdx = statusFlow.indexOf(req.status as typeof statusFlow[number]);
        const nextStatus = currentIdx < statusFlow.length - 1 ? statusFlow[currentIdx + 1] : null;
        const nextConfig = nextStatus ? statusConfig[nextStatus] : null;
        const isLoading = loadingId === req.id;
        const error = errors[req.id];
        const priorityDot =
          req.priority === "urgent" || req.priority === "high"
            ? "bg-destructive"
            : "bg-ember";

        return (
          <div key={req.id} className="rounded-xl bg-card border border-border overflow-hidden">
            <button
              onClick={() => setExpandedId(isExpanded ? null : req.id)}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-cloud/30 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className={`h-2 w-2 rounded-full shrink-0 ${priorityDot}`} />
                <div className="min-w-0">
                  <p className="text-[14px] font-medium text-marine-deep truncate">{req.title}</p>
                  <p className="mt-0.5 font-meta text-mute truncate">
                    {new Date(req.created_at)
                      .toLocaleDateString("es", { day: "numeric", month: "short" })
                      .toUpperCase()}
                    {req.assigned_to ? ` · ${req.assigned_to.toUpperCase()}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`font-meta px-2 py-0.5 rounded-md ${config.tag}`}>
                  {config.label}
                </span>
                <svg
                  className={`h-4 w-4 text-mute transition-transform ${isExpanded ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </div>
            </button>

            {isExpanded && (
              <div className="border-t border-border p-4 bg-cloud/20 space-y-4">
                <p className="text-[13.5px] text-marine-deep/80 leading-relaxed">{req.description}</p>

                {req.photo_urls && req.photo_urls.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {req.photo_urls.map((url, idx) => (
                      <a
                        key={idx}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block h-20 w-20 rounded-lg overflow-hidden border border-border hover:opacity-80 transition-opacity"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt={`Foto ${idx + 1}`} className="h-full w-full object-cover" />
                      </a>
                    ))}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <label className="font-meta text-mute mb-1.5 block">ASIGNAR A</label>
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
                        className="whitespace-nowrap h-9"
                      >
                        {isLoading ? "Actualizando..." : `Mover a ${nextConfig.label}`}
                      </Button>
                    </div>
                  )}
                </div>

                {req.status !== "resolved" && (
                  <div className="flex gap-2 pt-3 border-t border-border flex-wrap">
                    {statusFlow
                      .filter((s) => s !== req.status)
                      .map((s) => {
                        const cfg = statusConfig[s];
                        return (
                          <button
                            key={s}
                            onClick={() => handleStatusChange(req.id, s)}
                            disabled={isLoading}
                            className={`font-meta px-2.5 py-1 rounded-md transition-opacity hover:opacity-80 disabled:opacity-40 ${cfg.tag}`}
                          >
                            {cfg.label}
                          </button>
                        );
                      })}
                  </div>
                )}

                {error && (
                  <p className="rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2 text-[13px] text-destructive">
                    {error}
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
