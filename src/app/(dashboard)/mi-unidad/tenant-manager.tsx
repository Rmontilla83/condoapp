"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { MemberRole, OwnershipMode, TenantPermissions } from "@/types/database";
import {
  inviteUnitMember,
  generateAccessCode,
  revokeAccessCode,
  removeUnitMember,
  setTenantPermissions,
} from "../admin/units/actions";

interface Tenant {
  id: string;
  full_name: string;
  email: string;
  permissions: TenantPermissions;
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

export function TenantManager({
  unit,
  tenants,
  invites,
  codes,
}: {
  unit: { id: string; unit_number: string; ownership_mode: OwnershipMode };
  tenants: Tenant[];
  invites: Invite[];
  codes: Code[];
}) {
  const router = useRouter();
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
        window.location.reload();
      }
    });
  }

  const canHaveTenant = unit.ownership_mode !== "owner_occupied";

  if (!canHaveTenant) {
    return (
      <div className="text-sm text-muted-foreground">
        Esta unidad está marcada como habitada por ti. Si vas a arrendarla, pide al
        administrador que cambie el modo de ocupación.
      </div>
    );
  }

  return (
    <div className="space-y-4">
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

      {/* Inquilino actual */}
      <div>
        <div className="text-xs font-semibold text-muted-foreground uppercase mb-2">
          Inquilino actual
        </div>
        {tenants.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin inquilino asignado.</p>
        ) : (
          tenants.map((t) => (
            <div key={t.id} className="rounded-lg border p-3 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">{t.full_name || t.email}</p>
                  <p className="text-xs text-muted-foreground truncate">{t.email}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  disabled={pending}
                  onClick={() => {
                    if (confirm(`¿Remover a ${t.full_name || t.email}?`)) {
                      run(() => removeUnitMember(t.id), "Inquilino removido");
                    }
                  }}
                >
                  Remover
                </Button>
              </div>

              <div className="space-y-2 pt-2 border-t">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Permisos</p>
                <PermissionToggle
                  memberId={t.id}
                  permissions={t.permissions}
                  permissionKey="can_see_fee"
                  label="Puede ver mi cuota mensual"
                  pending={pending}
                  onRun={run}
                />
                <PermissionToggle
                  memberId={t.id}
                  permissions={t.permissions}
                  permissionKey="can_pay_fee"
                  label="Puede pagar la cuota"
                  pending={pending}
                  onRun={run}
                />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Invitaciones pendientes */}
      {invites.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-muted-foreground uppercase mb-2">
            Invitaciones pendientes
          </div>
          {invites.map((i) => (
            <div
              key={i.id}
              className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 p-2.5"
            >
              <div>
                <span className="text-sm">{i.email}</span>
                <p className="text-xs text-muted-foreground">
                  Expira: {new Date(i.expires_at).toLocaleDateString("es")}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Códigos activos */}
      {codes.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-muted-foreground uppercase mb-2">
            Códigos activos
          </div>
          {codes.map((c) => (
            <div key={c.id} className="flex items-center justify-between rounded-lg border p-2.5">
              <div>
                <span className="font-mono text-sm font-bold">{c.code}</span>
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
        </div>
      )}

      {/* Invitar nuevo */}
      {tenants.length === 0 && (
        <div className="space-y-4 pt-2 border-t">
          <div className="space-y-2">
            <div className="text-xs font-semibold text-muted-foreground uppercase">
              Invitar inquilino por email
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const email = (fd.get("email") as string)?.trim();
                if (!email) return;
                run(
                  () => inviteUnitMember({ unitId: unit.id, email, role: "tenant" }),
                  "Invitación enviada"
                );
                (e.target as HTMLFormElement).reset();
              }}
              className="flex gap-2"
            >
              <Input name="email" type="email" placeholder="inquilino@ejemplo.com" required />
              <Button type="submit" disabled={pending}>
                {pending ? "..." : "Invitar"}
              </Button>
            </form>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-semibold text-muted-foreground uppercase">
              O genera un código para darle por WhatsApp
            </div>
            <Button
              variant="secondary"
              className="w-full"
              disabled={pending}
              onClick={() => {
                startTransition(async () => {
                  const res = await generateAccessCode({ unitId: unit.id, role: "tenant" });
                  if (res.error) {
                    showFeedback("error", res.error);
                    setNewCode(null);
                  } else if (res.code) {
                    setNewCode({ code: res.code, expires_at: res.expires_at! });
                    showFeedback("ok", "Código generado");
                  }
                });
              }}
            >
              {pending ? "Generando..." : "Generar código de acceso"}
            </Button>

            {newCode && (
              <div className="rounded-lg border-2 border-primary bg-primary/5 p-3 text-center">
                <p className="text-2xl font-mono font-extrabold text-primary">{newCode.code}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Expira: {new Date(newCode.expires_at).toLocaleDateString("es")}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  onClick={() => {
                    navigator.clipboard.writeText(newCode.code);
                    showFeedback("ok", "Copiado");
                  }}
                >
                  Copiar código
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function PermissionToggle({
  memberId,
  permissions,
  permissionKey,
  label,
  pending,
  onRun,
}: {
  memberId: string;
  permissions: TenantPermissions;
  permissionKey: keyof TenantPermissions;
  label: string;
  pending: boolean;
  onRun: (
    fn: () => Promise<{ error?: string; success?: boolean }>,
    successMsg: string
  ) => void;
}) {
  const checked = !!permissions[permissionKey];
  return (
    <label className="flex items-center justify-between cursor-pointer">
      <span className="text-sm">{label}</span>
      <input
        type="checkbox"
        className="h-4 w-4 cursor-pointer"
        checked={checked}
        disabled={pending}
        onChange={(e) => {
          const next = { ...permissions, [permissionKey]: e.target.checked };
          onRun(
            () => setTenantPermissions({ memberId, permissions: next }),
            "Permisos actualizados"
          );
        }}
      />
    </label>
  );
}
