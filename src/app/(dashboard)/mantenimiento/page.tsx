"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

type Status = "new" | "in_review" | "in_progress" | "resolved";

const statusConfig: Record<Status, { label: string; className: string; step: number }> = {
  new: { label: "Nuevo", className: "border-blue-300 text-blue-700 bg-blue-50", step: 1 },
  in_review: { label: "En revisión", className: "border-amber-300 text-amber-700 bg-amber-50", step: 2 },
  in_progress: { label: "En progreso", className: "border-purple-300 text-purple-700 bg-purple-50", step: 3 },
  resolved: { label: "Resuelto", className: "border-emerald-300 text-emerald-700 bg-emerald-50", step: 4 },
};

const mockRequests = [
  {
    id: "1",
    title: "Fuga de agua en pasillo piso 3",
    description: "Hay una fuga visible en el techo del pasillo, cerca del apartamento 3B.",
    category: "Plomería",
    priority: "high" as const,
    status: "in_progress" as Status,
    createdAt: "2026-04-08",
    assignedTo: "Juan Martínez",
  },
  {
    id: "2",
    title: "Foco fundido en estacionamiento",
    description: "El foco del nivel -1 del estacionamiento está fundido. Zona oscura.",
    category: "Electricidad",
    priority: "medium" as const,
    status: "in_review" as Status,
    createdAt: "2026-04-10",
    assignedTo: null,
  },
];

const priorityConfig = {
  low: { label: "Baja", className: "text-slate-600" },
  medium: { label: "Media", className: "text-amber-600" },
  high: { label: "Alta", className: "text-orange-600" },
  urgent: { label: "Urgente", className: "text-red-600" },
};

export default function MantenimientoPage() {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mantenimiento</h1>
          <p className="text-muted-foreground">Reporta problemas y da seguimiento</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button />}>
              <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Nuevo reporte
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Nuevo reporte de mantenimiento</DialogTitle>
              <DialogDescription>
                Describe el problema y adjunta fotos si es posible.
              </DialogDescription>
            </DialogHeader>
            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setOpen(false); }}>
              <div className="space-y-2">
                <Label htmlFor="title">Título del problema</Label>
                <Input id="title" placeholder="Ej: Fuga de agua en el baño" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Categoría</Label>
                <select
                  id="category"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  required
                >
                  <option value="">Selecciona una categoría</option>
                  <option value="plumbing">Plomería</option>
                  <option value="electrical">Electricidad</option>
                  <option value="structural">Estructura</option>
                  <option value="elevator">Ascensor</option>
                  <option value="security">Seguridad</option>
                  <option value="cleaning">Limpieza</option>
                  <option value="other">Otro</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <textarea
                  id="description"
                  rows={3}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Describe el problema con detalle..."
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">Prioridad</Label>
                <select
                  id="priority"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="low">Baja</option>
                  <option value="medium" selected>Media</option>
                  <option value="high">Alta</option>
                  <option value="urgent">Urgente</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="photos">Fotos (opcional)</Label>
                <Input id="photos" type="file" accept="image/*" multiple />
                <p className="text-xs text-muted-foreground">Adjunta fotos del problema para agilizar la solución</p>
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1">
                  Enviar reporte
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lista de solicitudes */}
      <div className="space-y-4">
        {mockRequests.map((request) => {
          const status = statusConfig[request.status];
          const priority = priorityConfig[request.priority];
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
                      <span>Reportado: {request.createdAt}</span>
                      {request.assignedTo && (
                        <span>Asignado a: {request.assignedTo}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Progress tracker */}
                <div className="mt-4 pt-3 border-t">
                  <div className="flex items-center gap-1">
                    {(["new", "in_review", "in_progress", "resolved"] as Status[]).map((step, idx) => {
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
    </div>
  );
}
