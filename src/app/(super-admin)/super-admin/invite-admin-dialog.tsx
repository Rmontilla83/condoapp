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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true); setError("");
    const fd = new FormData(e.currentTarget);
    fd.set("org_id", orgId);
    const res = await inviteAdmin(fd);
    if (res.error) { setError(res.error); setLoading(false); return; }
    setSuccess(true);
    setLoading(false);
    router.refresh();
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
            <p className="font-semibold">Invitacion enviada</p>
            <p className="text-xs text-muted-foreground mt-1">Cuando inicie sesion sera admin de {orgName}</p>
            <Button onClick={() => setOpen(false)} className="mt-4" size="sm">Listo</Button>
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
