"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { inviteAdmin } from "./actions";

export function InviteAdminDialog({ orgId, orgName }: { orgId: string; orgName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [sinCorreo, setSinCorreo] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true); setError("");
    const fd = new FormData(e.currentTarget);
    fd.set("org_id", orgId);
    const res = await inviteAdmin(fd);
    if (res.error) { setError(res.error); setLoading(false); return; }
    setSinCorreo("sinCorreo" in res && !!res.sinCorreo);
    setSuccess(true);
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setError(""); setSuccess(false); } }}>
      <DialogTrigger render={<Button variant="outline" size="sm" className="text-xs" />}>
        Invitar admin
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        {success ? (
          <div className="py-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
              <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
            </div>
            <p className="font-semibold">{sinCorreo ? "Cuenta creada, sin correo" : "Invitación enviada"}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {sinCorreo
                ? `Los correos están apagados: no se le envió nada. Ya es parte de la administración de ${orgName} y entra pidiendo su enlace en la pantalla de inicio de sesión.`
                : `Cuando inicie sesión será parte de la administración de ${orgName}.`}
            </p>
            <Button onClick={() => window.location.reload()} className="mt-4" size="sm">Listo</Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Invitar admin</DialogTitle>
              <DialogDescription>{orgName}</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email del administrador</Label>
                <Input id="email" name="email" type="email" placeholder="admin@email.com" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="funcion">Función</Label>
                <select id="funcion" name="funcion" defaultValue="" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  <option value="">Administración completa</option>
                  <option value="administradora">Administradora</option>
                  <option value="junta">Junta de Condominio</option>
                  <option value="asistente">Asistente administrativo</option>
                  <option value="contador">Contador (solo lectura)</option>
                </select>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex gap-3">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)} disabled={loading}>Cancelar</Button>
                <Button type="submit" className="flex-1" disabled={loading}>{loading ? "Enviando..." : "Invitar"}</Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
