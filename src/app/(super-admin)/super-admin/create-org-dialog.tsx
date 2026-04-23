"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { createOrganization } from "./actions";

export function CreateOrgDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ inviteCode: string } | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true); setError("");
    const res = await createOrganization(new FormData(e.currentTarget));
    if (res.error) { setError(res.error); setLoading(false); return; }
    setResult({ inviteCode: res.inviteCode! });
    setLoading(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setError(""); setResult(null); } }}>
      <DialogTrigger render={<Button size="sm" />}>
        <svg className="mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>
        Crear condominio
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {result ? (
          <div className="py-6 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
              <svg className="h-7 w-7 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
            </div>
            <p className="font-semibold">Condominio creado</p>
            <p className="text-sm text-muted-foreground mt-1">Codigo de invitacion:</p>
            <p className="text-2xl font-mono font-extrabold text-primary mt-2">{result.inviteCode}</p>
            <p className="text-xs text-muted-foreground mt-2">Ahora invita al admin de este condominio</p>
            <Button onClick={() => setOpen(false)} className="mt-4">Entendido</Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Crear condominio</DialogTitle>
              <DialogDescription>Se generara un codigo de invitacion automaticamente.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2"><Label htmlFor="name">Nombre</Label><Input id="name" name="name" placeholder="Ej: Residencias Los Pinos" required /></div>
              <div className="space-y-2"><Label htmlFor="address">Direccion</Label><Input id="address" name="address" placeholder="Av. Principal, Edif. Los Pinos" required /></div>
              <div className="space-y-2"><Label htmlFor="city">Ciudad</Label><Input id="city" name="city" placeholder="Caracas" required /></div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)} disabled={loading}>Cancelar</Button>
                <Button type="submit" className="flex-1" disabled={loading}>{loading ? "Creando..." : "Crear"}</Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
