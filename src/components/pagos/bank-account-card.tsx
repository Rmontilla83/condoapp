"use client";

import { useState } from "react";
import { BANK_ACCOUNT_KIND_LABELS } from "@/lib/schemas/bank-account";
import type { BankAccount, BankAccountKind } from "@/types/database";

/**
 * Tarjeta de datos bancarios con copiado de un toque.
 *
 * Vive en dos fondos distintos: el bloque oscuro de /pagos (`tone="dark"`) y el
 * diálogo de pago sobre fondo claro (`tone="light"`). Antes estaba embebida en
 * payment-methods.tsx y solo existía en /pagos, así que el residente que tocaba
 * "Pagar ahora" desde el inicio nunca veía a dónde transferir.
 */

const KIND_BADGE_DARK: Record<BankAccountKind, string> = {
  transfer: "border-cyan/40 text-cyan bg-cyan/10",
  mobile_payment: "border-emerald-300 text-emerald-700 bg-emerald-50",
  zelle: "border-blue-300 text-blue-700 bg-blue-50",
  paypal: "border-indigo-300 text-indigo-700 bg-indigo-50",
  binance: "border-amber-300 text-amber-700 bg-amber-50",
  other: "border-gray-300 text-gray-700 bg-gray-50",
};

const KIND_BADGE_LIGHT: Record<BankAccountKind, string> = {
  transfer: "border-cyan/40 text-cyan bg-cyan/10",
  mobile_payment: "border-emerald-300 text-emerald-700 bg-emerald-50",
  zelle: "border-blue-300 text-blue-700 bg-blue-50",
  paypal: "border-indigo-300 text-indigo-700 bg-indigo-50",
  binance: "border-amber-300 text-amber-700 bg-amber-50",
  other: "border-gray-300 text-gray-700 bg-gray-50",
};

export type CardTone = "dark" | "light";

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

export function BankAccountCard({
  account,
  tone = "dark",
}: {
  account: BankAccount;
  tone?: CardTone;
}) {
  const [copied, setCopied] = useState<string | null>(null);
  const dark = tone === "dark";

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

  const badge = dark ? KIND_BADGE_DARK : KIND_BADGE_LIGHT;

  return (
    <div
      className={
        dark
          ? "rounded-xl bg-frost/5 border border-frost/10 p-4 space-y-2.5"
          : "rounded-xl bg-cloud/40 border border-border p-4 space-y-2.5"
      }
    >
      <div className="flex items-center justify-between gap-2">
        <p
          className={`font-display text-[15px] truncate ${dark ? "text-frost" : "text-marine-deep"}`}
        >
          {account.label}
        </p>
        <span
          className={`text-[10px] font-meta border px-2 py-0.5 rounded-md ${badge[account.kind] ?? "border-gray-300 text-gray-500"}`}
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
            // min-h-11 = 44px: el mínimo táctil cómodo en móvil, que es donde
            // el propietario copia el número de cuenta.
            className={`w-full min-h-11 flex items-center justify-between gap-3 text-left rounded-md px-2 py-1.5 transition ${
              dark ? "hover:bg-frost/5" : "hover:bg-marine/5"
            }`}
            aria-label={`Copiar ${f.label}: ${f.value}`}
          >
            <span
              className={`text-[11px] font-meta uppercase tracking-wider shrink-0 ${
                dark ? "text-frost/60" : "text-mute"
              }`}
            >
              {f.label}
            </span>
            <span
              className={`text-[13px] truncate ${f.mono ? "font-mono" : ""} ${
                dark ? "text-frost" : "text-marine-deep"
              }`}
            >
              {copied === f.key ? "✓ Copiado" : f.value}
            </span>
          </button>
        ))}
        {account.account_type && (
          <p className={`text-[11px] font-meta uppercase ${dark ? "text-frost/60" : "text-mute"}`}>
            Tipo: {account.account_type}
          </p>
        )}
        <p className={`text-[11px] ${dark ? "text-frost/60" : "text-mute"}`}>{account.currency}</p>
      </div>
      {account.instructions && (
        <p
          className={`text-[11px] italic border-t pt-2 ${
            dark ? "text-frost/70 border-frost/10" : "text-mute border-border"
          }`}
        >
          {account.instructions}
        </p>
      )}
    </div>
  );
}
