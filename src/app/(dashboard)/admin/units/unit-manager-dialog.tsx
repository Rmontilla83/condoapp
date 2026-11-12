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
  const [newCode, setNewCode] = useState<{ code: string; expires_at: string; assigned_role: MemberRole } | null>(null);

  function showFeedback(type: "ok" | "error", msg: string) {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 4000);
  }

  /**
   * Copia el código completo y solo dice «copiado» si de verdad se copió. Si el
   * navegador no deja usar el portapapeles (pasa en algunos teléfonos y dentro
   * de un diálogo), prueba la vía antigua; si tampoco, pide copiarlo a mano.
   */
  /** El mensaje completo para el vecino: lo que la administración le manda por WhatsApp junto con el código. */
  function instrucciones(c: { code: string; assigned_role: MemberRole; expires_at: string }) {
    const vence = new Date(c.expires_at).toLocaleDateString("es-VE", { day: "numeric", month: "long" });
    return [
      `Hola. Este es tu acceso a Atryum como ${c.assigned_role === "owner" ? "propietario" : "inquilino"} del apartamento ${unit.unit_number}.`,
      "",
      "1. Abre portal.atryum.net y escribe tu correo. Te llega un código de números a ese correo: pégalo para entrar.",
      "2. Ya dentro, abre portal.atryum.net/join",
      `3. Pega ahí este código de apartamento: ${c.code}`,
      "",
      `El código sirve una sola vez y vence el ${vence}. Ojo: el código de números del correo es para entrar; este, con letras, es para asociarte al apartamento.`,
    ].join("\n");
  }

  async function copiar(texto: string, hechoMsg?: string) {
    let hecho = false;
    try {
      await navigator.clipboard.writeText(texto);
      hecho = true;
    } catch {
      hecho = false;
    }
    if (!hecho) {
      const caja = document.createElement("textarea");
      caja.value = texto;
      caja.setAttribute("readonly", "");
      caja.style.position = "fixed";
      caja.style.opacity = "0";
      document.body.appendChild(caja);
      caja.select();
      try {
        hecho = document.execCommand("copy");
      } catch {
        hecho = false;
      }
      caja.remove();
    }
    showFeedback(hecho ? "ok" : "error", hecho ? (hechoMsg ?? `Código ${texto} copiado`) : "No se pudo copiar. Toca el código para marcarlo entero y cópialo a mano.");
  }

  function run(fn: () => Promise<{ error?: string; success?: boolean }>, successMsg: string) {
    startTransition(async () => {
      const res = await fn();
      if (res.error) {
        showFeedback("error", res.error);
      } else {
        showFeedback("ok", successMsg);
        window.location.reload();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" className="shrink-0" />}>
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
            <div className="space-y-2 rounded-lg border bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
              <p className="text-foreground font-semibold">Cómo funciona</p>
              <p>
                El código asocia a una persona con este apartamento, como propietario o como inquilino. Sirve una sola vez y vence a los 7 días. Úsalo cuando no tengas su
                correo o cuando las invitaciones por correo estén apagadas.
              </p>
              <ol className="list-decimal space-y-1 pl-4">
                <li>Elige si la persona es propietario o inquilino y toca «Generar código».</li>
                <li>Toca «Copiar instrucciones» y envíaselas por WhatsApp. Ya llevan el código y los pasos.</li>
                <li>
                  La persona entra a <span className="font-mono">portal.atryum.net</span> con su correo, abre <span className="font-mono">portal.atryum.net/join</span> y pega el
                  código.
                </li>
                <li>Cuando lo canjea, aparece en la pestaña «Miembros» y el código deja de estar activo.</li>
              </ol>
              <p>
                No es el código para iniciar sesión: ese es de números y le llega a cada quien a su correo. El de aquí tiene letras y guiones.
              </p>
            </div>

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
                    setNewCode({ code: res.code, expires_at: res.expires_at!, assigned_role: role });
                    showFeedback("ok", "Código generado. Copia las instrucciones y envíalas por WhatsApp.");
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
                {/* select-all: un clic o doble clic marca el código entero, con sus guiones. */}
                <p className="text-2xl font-mono font-extrabold text-primary mt-1" style={{ userSelect: "all", WebkitUserSelect: "all" }}>{newCode.code}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Expira: {new Date(newCode.expires_at).toLocaleDateString("es")}
                </p>
                <div className="mt-2 flex flex-wrap justify-center gap-2">
                  <Button size="sm" onClick={() => void copiar(instrucciones(newCode), "Instrucciones copiadas: pégalas en WhatsApp")}>
                    Copiar instrucciones
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => void copiar(newCode.code)}>
                    Solo el código
                  </Button>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">Las instrucciones llevan el código y los pasos para la persona.</p>
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
                    className="flex flex-wrap items-center justify-between gap-1 rounded-lg border p-2.5"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{c.assigned_role === "owner" ? "Propietario" : "Inquilino"}</Badge>
                        <span className="font-mono text-sm font-bold" style={{ userSelect: "all", WebkitUserSelect: "all" }}>{c.code}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Expira: {new Date(c.expires_at).toLocaleDateString("es")}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" className="ml-auto" onClick={() => void copiar(instrucciones(c), "Instrucciones copiadas: pégalas en WhatsApp")}>
                      Copiar instrucciones
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => void copiar(c.code)}>
                      Solo el código
                    </Button>
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
