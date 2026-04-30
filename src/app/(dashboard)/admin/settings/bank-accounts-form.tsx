"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  BANK_ACCOUNT_KIND_LABELS,
  BANK_ACCOUNT_KINDS,
  BANK_ACCOUNT_TYPES,
  MAX_BANK_ACCOUNTS_PER_ORG,
} from "@/lib/schemas/bank-account";
import type { BankAccount, BankAccountKind } from "@/types/database";
import { updateBankAccounts } from "./settings-actions";

function blankAccount(orgCurrency: string): BankAccount {
  return {
    id: crypto.randomUUID(),
    label: "",
    kind: "transfer",
    currency: orgCurrency || "USD",
    bank_name: "",
    account_number: "",
    account_type: null,
    holder_name: "",
    holder_id: "",
    extra: "",
    instructions: "",
    active: true,
    sort_order: 0,
  };
}

interface Props {
  initial: BankAccount[];
  orgCurrency: string;
}

export function BankAccountsForm({ initial, orgCurrency }: Props) {
  const [accounts, setAccounts] = useState<BankAccount[]>(initial);
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: "ok" | "error"; msg: string } | null>(null);

  function update(idx: number, patch: Partial<BankAccount>) {
    setAccounts((curr) => curr.map((a, i) => (i === idx ? { ...a, ...patch } : a)));
  }

  function remove(idx: number) {
    setAccounts((curr) => curr.filter((_, i) => i !== idx));
  }

  function add() {
    if (accounts.length >= MAX_BANK_ACCOUNTS_PER_ORG) return;
    setAccounts((curr) => [...curr, { ...blankAccount(orgCurrency), sort_order: curr.length }]);
  }

  function move(idx: number, dir: -1 | 1) {
    const target = idx + dir;
    if (target < 0 || target >= accounts.length) return;
    setAccounts((curr) => {
      const next = [...curr];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next.map((a, i) => ({ ...a, sort_order: i }));
    });
  }

  function save() {
    setFeedback(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("accounts", JSON.stringify(accounts));
      const res = await updateBankAccounts(fd);
      if ("error" in res) {
        setFeedback({ type: "error", msg: res.error });
        return;
      }
      setFeedback({ type: "ok", msg: "Cuentas guardadas" });
      setTimeout(() => window.location.reload(), 600);
    });
  }

  const canAdd = accounts.length < MAX_BANK_ACCOUNTS_PER_ORG;

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

      {accounts.length === 0 && (
        <p className="text-[13px] text-mute italic">
          Aún no has agregado cuentas. Los residentes no verán datos bancarios hasta que configures al menos una.
        </p>
      )}

      <div className="space-y-3">
        {accounts.map((acc, idx) => (
          <AccountCard
            key={acc.id}
            account={acc}
            idx={idx}
            total={accounts.length}
            disabled={pending}
            onChange={(patch) => update(idx, patch)}
            onRemove={() => remove(idx)}
            onMoveUp={() => move(idx, -1)}
            onMoveDown={() => move(idx, 1)}
          />
        ))}
      </div>

      <div className="flex items-center justify-between gap-3 pt-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={add}
          disabled={!canAdd || pending}
        >
          + Agregar cuenta {!canAdd && `(máx. ${MAX_BANK_ACCOUNTS_PER_ORG})`}
        </Button>
        <Button type="button" size="sm" onClick={save} disabled={pending}>
          {pending ? "Guardando…" : "Guardar cambios"}
        </Button>
      </div>
    </div>
  );
}

function AccountCard({
  account,
  idx,
  total,
  disabled,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  account: BankAccount;
  idx: number;
  total: number;
  disabled: boolean;
  onChange: (patch: Partial<BankAccount>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const needsBank = account.kind === "transfer" || account.kind === "mobile_payment";
  const extraPlaceholder = (() => {
    switch (account.kind) {
      case "mobile_payment":
        return "Teléfono Pago Móvil";
      case "zelle":
        return "Email Zelle";
      case "paypal":
        return "Email PayPal";
      case "binance":
        return "ID o alias Binance";
      default:
        return "Información adicional";
    }
  })();

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor={`label-${account.id}`}>Etiqueta</Label>
            <Input
              id={`label-${account.id}`}
              value={account.label}
              maxLength={60}
              placeholder="Ej: Banesco principal"
              onChange={(e) => onChange({ label: e.target.value })}
              disabled={disabled}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`kind-${account.id}`}>Tipo</Label>
            <select
              id={`kind-${account.id}`}
              value={account.kind}
              onChange={(e) => onChange({ kind: e.target.value as BankAccountKind })}
              disabled={disabled}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {BANK_ACCOUNT_KINDS.map((k) => (
                <option key={k} value={k}>
                  {BANK_ACCOUNT_KIND_LABELS[k]}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex flex-col gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={disabled || idx === 0}
            className="text-[11px] text-mute disabled:opacity-30 hover:text-foreground"
            aria-label="Subir"
          >
            ▲
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={disabled || idx === total - 1}
            className="text-[11px] text-mute disabled:opacity-30 hover:text-foreground"
            aria-label="Bajar"
          >
            ▼
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label htmlFor={`bank-${account.id}`}>
            Banco {needsBank && <span className="text-destructive">*</span>}
          </Label>
          <Input
            id={`bank-${account.id}`}
            value={account.bank_name}
            maxLength={80}
            placeholder="Banesco, Mercantil…"
            onChange={(e) => onChange({ bank_name: e.target.value })}
            disabled={disabled}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`number-${account.id}`}>Número de cuenta / ID *</Label>
          <Input
            id={`number-${account.id}`}
            value={account.account_number}
            maxLength={80}
            placeholder="0134-..."
            onChange={(e) => onChange({ account_number: e.target.value })}
            disabled={disabled}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`currency-${account.id}`}>Moneda *</Label>
          <Input
            id={`currency-${account.id}`}
            value={account.currency}
            maxLength={8}
            placeholder="USD"
            onChange={(e) => onChange({ currency: e.target.value.toUpperCase() })}
            disabled={disabled}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label htmlFor={`holder-${account.id}`}>Titular *</Label>
          <Input
            id={`holder-${account.id}`}
            value={account.holder_name}
            maxLength={120}
            placeholder="Costa de Plata C.A."
            onChange={(e) => onChange({ holder_name: e.target.value })}
            disabled={disabled}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`holder-id-${account.id}`}>RIF / Cédula</Label>
          <Input
            id={`holder-id-${account.id}`}
            value={account.holder_id ?? ""}
            maxLength={40}
            placeholder="J-12345678-9"
            onChange={(e) => onChange({ holder_id: e.target.value })}
            disabled={disabled}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`acct-type-${account.id}`}>Cuenta</Label>
          <select
            id={`acct-type-${account.id}`}
            value={account.account_type ?? ""}
            onChange={(e) =>
              onChange({
                account_type:
                  e.target.value === "" ? null : (e.target.value as "corriente" | "ahorro"),
              })
            }
            disabled={disabled}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">— No aplica —</option>
            {BANK_ACCOUNT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t === "corriente" ? "Corriente" : "Ahorro"}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor={`extra-${account.id}`}>{extraPlaceholder}</Label>
          <Input
            id={`extra-${account.id}`}
            value={account.extra ?? ""}
            maxLength={200}
            placeholder={extraPlaceholder}
            onChange={(e) => onChange({ extra: e.target.value })}
            disabled={disabled}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`instr-${account.id}`}>Instrucciones para residentes</Label>
          <Input
            id={`instr-${account.id}`}
            value={account.instructions ?? ""}
            maxLength={200}
            placeholder="Ej: Enviar capt al WhatsApp del admin"
            onChange={(e) => onChange({ instructions: e.target.value })}
            disabled={disabled}
          />
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-border">
        <label className="flex items-center gap-2 text-[13px] cursor-pointer">
          <input
            type="checkbox"
            checked={account.active}
            onChange={(e) => onChange({ active: e.target.checked })}
            disabled={disabled}
            className="h-4 w-4 cursor-pointer"
          />
          Activa (visible para residentes)
        </label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRemove}
          disabled={disabled}
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          Eliminar
        </Button>
      </div>
    </div>
  );
}
