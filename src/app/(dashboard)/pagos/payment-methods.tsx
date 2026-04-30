"use client";

import { useState } from "react";
import {
  BANK_ACCOUNT_KIND_LABELS,
} from "@/lib/schemas/bank-account";
import type { BankAccount, BankAccountKind } from "@/types/database";

interface Props {
  accounts: BankAccount[];
  total: number;
  rate: number;
  pendingCount: number;
}

const KIND_BADGE_CLASS: Record<BankAccountKind, string> = {
  transfer: "border-cyan/40 text-cyan bg-cyan/10",
  mobile_payment: "border-emerald-300 text-emerald-700 bg-emerald-50",
  zelle: "border-blue-300 text-blue-700 bg-blue-50",
  paypal: "border-indigo-300 text-indigo-700 bg-indigo-50",
  binance: "border-amber-300 text-amber-700 bg-amber-50",
  other: "border-gray-300 text-gray-700 bg-gray-50",
};

export function PaymentMethods({ accounts, total, rate, pendingCount }: Props) {
  const visible = accounts.filter((a) => a.active).sort((a, b) => a.sort_order - b.sort_order);

  if (visible.length === 0) {
    return (
      <div className="rounded-2xl bg-marine-deep text-frost p-6 md:p-7">
        <p className="font-meta text-ember">DATOS DE PAGO</p>
        <p className="mt-3 text-[14px] text-frost/70 leading-relaxed">
          Tu condominio aún no ha configurado los datos bancarios. Pídele al administrador
          que los agregue en su panel para que puedas pagar.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-marine-deep text-frost p-6 md:p-7 space-y-5">
      <div>
        <p className="font-meta text-ember">DATOS DE PAGO DEL CONDO</p>
        <p className="mt-2 font-display text-[20px] leading-tight">
          Tienes {pendingCount} cuota{pendingCount !== 1 ? "s" : ""}{" "}
          <em className="font-editorial text-ember">pendiente{pendingCount !== 1 ? "s" : ""}</em>
        </p>
        <p className="mt-1 text-[13px] text-frost/60">
          Total: ${total.toFixed(2)}
          {rate > 0 ? ` (Bs ${(total * rate).toFixed(2)})` : ""}
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {visible.map((acc) => (
          <BankAccountCard key={acc.id} account={acc} />
        ))}
      </div>
    </div>
  );
}

function BankAccountCard({ account }: { account: BankAccount }) {
  const [copied, setCopied] = useState<string | null>(null);

  function copy(field: string, value: string) {
    if (!value) return;
    navigator.clipboard.writeText(value);
    setCopied(field);
    setTimeout(() => setCopied((c) => (c === field ? null : c)), 1400);
  }

  const fields: Array<{ key: string; label: string; value?: string | null; mono?: boolean }> = [
    { key: "bank", label: "Banco", value: account.bank_name },
    { key: "number", label: "Cuenta", value: account.account_number, mono: true },
    { key: "holder", label: "Titular", value: account.holder_name },
    { key: "holder_id", label: "RIF / Cédula", value: account.holder_id, mono: true },
    { key: "extra", label: extraLabel(account.kind), value: account.extra, mono: true },
  ].filter((f) => f.value && f.value.length > 0);

  return (
    <div className="rounded-xl bg-frost/5 border border-frost/10 p-4 space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <p className="font-display text-[15px] text-frost truncate">{account.label}</p>
        <span
          className={`text-[10px] font-meta border px-2 py-0.5 rounded-md ${KIND_BADGE_CLASS[account.kind] ?? "border-gray-300 text-gray-300"}`}
        >
          {BANK_ACCOUNT_KIND_LABELS[account.kind].toUpperCase()}
        </span>
      </div>
      <div className="space-y-1.5">
        {fields.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => copy(f.key, f.value!)}
            className="w-full flex items-center justify-between gap-3 text-left rounded-md px-2 py-1.5 hover:bg-frost/5 transition group"
          >
            <span className="text-[11px] text-frost/50 font-meta uppercase tracking-wider shrink-0">
              {f.label}
            </span>
            <span
              className={`text-[13px] text-frost truncate ${f.mono ? "font-mono" : ""}`}
            >
              {copied === f.key ? "✓ Copiado" : f.value}
            </span>
          </button>
        ))}
        {account.account_type && (
          <p className="text-[11px] text-frost/50 font-meta uppercase">
            Tipo: {account.account_type}
          </p>
        )}
        <p className="text-[11px] text-frost/50">{account.currency}</p>
      </div>
      {account.instructions && (
        <p className="text-[11px] text-frost/60 italic border-t border-frost/10 pt-2">
          {account.instructions}
        </p>
      )}
    </div>
  );
}

function extraLabel(kind: BankAccountKind): string {
  switch (kind) {
    case "mobile_payment":
      return "Teléfono";
    case "zelle":
      return "Email Zelle";
    case "paypal":
      return "Email PayPal";
    case "binance":
      return "Alias Binance";
    default:
      return "Información";
  }
}
