"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { OwnershipMode, MemberRole } from "@/types/database";
import {
  setUnitOwnershipMode,
  inviteUnitMember,
  generateAccessCode,
  revokeAccessCode,
  removeUnitMember,
} from "./actions";

interface Member {
  id: string;
  role: MemberRole;
  full_name: string;
  email: string;
}
interface Invite {
  id: string;
  email: string;
  assigned_role: MemberRole;
  expires_at: string;
}
interface Code {
  id: string;
  code: string;
  assigned_role: MemberRole;
  expires_at: string;
}

export function UnitManagerDialog({
  unit,
  members,
  invites,
  codes,
}: {
  unit: { id: string; unit_number: string; ownership_mode: OwnershipMode };
  members: Member[];
  invites: Invite[];
  codes: Code[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: "ok" | "error"; msg: string } | null>(null);
  const [newCode, setNewCode] = useState<{ code: string; expires_at: string } | null>(null);

  function showFeedback(type: "ok" | "error", msg: string) {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 4000);
  }

  function run(fn: () => Promise<{ error?: string; success?: boolean }>, successMsg: string) {
    startTransition(async () => {
      const res = await fn();
      if (res.error) {
        showFeedback("error", res.error);
      } else {
        showFeedback("ok", successMsg);
        router.refresh();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" className="w-full" />}>
        Gestionar
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Apto {unit.unit_number}</DialogTitle>
          <DialogDescription>
            Configura modo de ocupación, miembros, invitaciones y códigos.
          </DialogDescription>
        </DialogHeader>

        {feedback && (
          <div
            className={`rounded-lg border p-2.5 text-sm ${
              feedback.type === "ok"
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border-destructive/30 bg-destructive/5 text-destructive"
            }`}
          >
            {feedback.msg}
          </div>
        )}

        <Tabs defaultValue="mode" className="mt-2">
          <TabsList className="w-full grid grid-cols-4 h-auto">
            <TabsTrigger value="mode" className="text-xs">Modo</TabsTrigger>
            <TabsTrigger value="members" className="text-xs">Miembros</TabsTrigger>
            <TabsTrigger value="invite" className="text-xs">Invitar</TabsTrigger>
            <TabsTrigger value="code" className="text-xs">Código</TabsTrigger>
          </TabsList>

          <TabsContent value="mode" className="space-y-3 pt-4">
            <p className="text-xs text-muted-foreground">Elige quién ocupa la unidad:</p>
            {(
              [
                ["owner_occupied", "Propietario habita aquí", "Un solo usuario con rol Propietario"],
                [
                  "tenant_with_active_owner",
                  "Arrendada (propietario activo)",
                  "Propietario usa la app + invita a su inquilino",
                ],
                [
                  "tenant_only",
                  "Arrendada (propietario ausente)",
                  "Solo inquilino, gestionado por admin",
                ],
              ] as [OwnershipMode, string, string][]
            ).map(([mode, title, desc]) => (
              <label
                key={mode}
                className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:border-primary transition ${
                  unit.ownership_mode === mode ? "border-primary bg-primary/5" : ""
                }`}
              >
                <input
                  type="radio"
                  name="ownership_mode"
                  value={mode}
                  defaultChecked={unit.ownership_mode === mode}
                  className="mt-1"
                  onChange={(e) => {
                    if (e.target.checked) {
                      run(() => setUnitOwnershipMode(unit.id, mode), "Modo actualizado");
                    }
                  }}
                  disabled={pending}
                />
                <div>
                  <div className="text-sm font-semibold">{title}</div>
                  <div className="text-xs text-muted-foreground">{desc}</div>
                </div>
              </label>
            ))}
          </TabsContent>

          <TabsContent value="members" className="space-y-3 pt-4">
            {members.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Sin miembros activos todavía.
              </p>
            )}
            {members.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between rounded-lg border p-2.5"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={m.role === "owner" ? "default" : "secondary"}>
                      {m.role === "owner" ? "Propietario" : "Inquilino"}
                    </Badge>
                    <span className="text-sm font-semibold truncate">
                      {m.full_name || m.email}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{m.email}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  disabled={pending}
                  onClick={() => {
                    if (confirm(`¿Remover a ${m.full_name || m.email} de esta unidad?`)) {
                      run(() => removeUnitMember(m.id), "Miembro removido");
                    }
                  }}
                >
                  Remover
                </Button>
              </div>
            ))}

            {invites.length > 0 && (
              <>
                <div className="text-xs font-semibold text-muted-foreground uppercase pt-2">
                  Invitaciones pendientes
                </div>
                {invites.map((i) => (
                  <div key={i.id} className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 p-2.5">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{i.assigned_role === "owner" ? "Propietario" : "Inquilino"}</Badge>
                        <span className="text-sm truncate">{i.email}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Expira: {new Date(i.expires_at).toLocaleDateString("es")}
                      </p>
                    </div>
                  </div>
                ))}
              </>
            )}
          </TabsContent>

          <TabsContent value="invite" className="space-y-3 pt-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const email = (fd.get("email") as string)?.trim();
                const role = fd.get("role") as MemberRole;
                if (!email) {
                  showFeedback("error", "Ingresa un email");
                  return;
                }
                run(
                  () => inviteUnitMember({ unitId: unit.id, email, role }),
                  "Invitación enviada"
                );
                (e.target as HTMLFormElement).reset();
              }}
              className="space-y-3"
            >
              <div className="space-y-1.5">
                <Label htmlFor={`email-${unit.id}`}>Email del residente</Label>
                <Input
                  id={`email-${unit.id}`}
                  name="email"
                  type="email"
                  placeholder="residente@ejemplo.com"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Rol</Label>
                <div className="flex gap-2">
                  <label className="flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer flex-1">
                    <input type="radio" name="role" value="owner" defaultChecked />
                    <span className="text-sm">Propietario</span>
                  </label>
                  <label className="flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer flex-1">
                    <input type="radio" name="role" value="tenant" />
                    <span className="text-sm">Inquilino</span>
                  </label>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? "Enviando..." : "Enviar invitación por email"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="code" className="space-y-3 pt-4">
            <p className="text-xs text-muted-foreground">
              Genera un código de un solo uso que el residente puede canjear en{" "}
              <span className="font-mono">/join</span>. Útil cuando no tienes su email.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const role = fd.get("code_role") as MemberRole;
                startTransition(async () => {
                  const res = await generateAccessCode({ unitId: unit.id, role });
                  if (res.error) {
                    showFeedback("error", res.error);
                    setNewCode(null);
                  } else if (res.code) {
                    setNewCode({ code: res.code, expires_at: res.expires_at! });
                    showFeedback("ok", "Código generado — compártelo por WhatsApp");
                  }
                });
              }}
              className="space-y-3"
            >
              <div className="flex gap-2">
                <label className="flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer flex-1">
                  <input type="radio" name="code_role" value="owner" defaultChecked />
                  <span className="text-sm">Propietario</span>
                </label>
                <label className="flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer flex-1">
                  <input type="radio" name="code_role" value="tenant" />
                  <span className="text-sm">Inquilino</span>
                </label>
              </div>
              <Button type="submit" variant="secondary" className="w-full" disabled={pending}>
                {pending ? "Generando..." : "Generar código"}
              </Button>
            </form>

            {newCode && (
              <div className="rounded-lg border-2 border-primary bg-primary/5 p-3 text-center">
                <p className="text-xs text-muted-foreground uppercase font-semibold">Código nuevo</p>
                <p className="text-2xl font-mono font-extrabold text-primary mt-1">{newCode.code}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Expira: {new Date(newCode.expires_at).toLocaleDateString("es")}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  onClick={() => {
                    navigator.clipboard.writeText(newCode.code);
                    showFeedback("ok", "Copiado al portapapeles");
                  }}
                >
                  Copiar
                </Button>
              </div>
            )}

            {codes.length > 0 && (
              <>
                <div className="text-xs font-semibold text-muted-foreground uppercase pt-2">
                  Códigos activos
                </div>
                {codes.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between rounded-lg border p-2.5"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{c.assigned_role === "owner" ? "Propietario" : "Inquilino"}</Badge>
                        <span className="font-mono text-sm font-bold">{c.code}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Expira: {new Date(c.expires_at).toLocaleDateString("es")}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      disabled={pending}
                      onClick={() => {
                        if (confirm("¿Revocar este código?")) {
                          run(() => revokeAccessCode(c.id), "Código revocado");
                        }
                      }}
                    >
                      Revocar
                    </Button>
                  </div>
                ))}
              </>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
