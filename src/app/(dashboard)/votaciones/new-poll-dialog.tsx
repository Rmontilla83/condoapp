"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { createPoll } from "./actions";

export function NewPollDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const formData = new FormData(e.currentTarget);
    const res = await createPoll(formData);
    if (res.error) { setError(res.error); setLoading(false); return; }
    setOpen(false);
    setLoading(false);
    window.location.reload();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setError(""); }}>
      <DialogTrigger render={<Button />}>
        <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Nueva encuesta
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Crear encuesta rapida</DialogTitle>
          <DialogDescription>Los residentes podran votar desde la app.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="question">Pregunta</Label>
            <Input id="question" name="question" placeholder="Ej: Debemos pintar la fachada este ano?" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="options">Opciones (una por linea)</Label>
            <textarea
              id="options"
              name="options"
              rows={4}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder={"Si, este ano\nNo, el proximo\nNecesito mas informacion"}
              required
            />
            <p className="text-xs text-muted-foreground">Minimo 2 opciones</p>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)} disabled={loading}>Cancelar</Button>
            <Button type="submit" className="flex-1" disabled={loading}>{loading ? "Creando..." : "Crear encuesta"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
