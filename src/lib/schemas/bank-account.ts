import type { BankAccount, BankAccountKind } from "@/types/database";

export const BANK_ACCOUNT_KINDS: BankAccountKind[] = [
  "transfer",
  "mobile_payment",
  "zelle",
  "paypal",
  "binance",
  "other",
];

export const BANK_ACCOUNT_KIND_LABELS: Record<BankAccountKind, string> = {
  transfer: "Transferencia bancaria",
  mobile_payment: "Pago móvil",
  zelle: "Zelle",
  paypal: "PayPal",
  binance: "Binance Pay",
  other: "Otro",
};

export const BANK_ACCOUNT_TYPES = ["corriente", "ahorro"] as const;
export type BankAccountType = (typeof BANK_ACCOUNT_TYPES)[number];

export const MAX_BANK_ACCOUNTS_PER_ORG = 12;

export interface BankAccountValidationResult {
  ok: boolean;
  account?: BankAccount;
  error?: string;
}

function trim(v: unknown, max: number): string {
  if (typeof v !== "string") return "";
  return v.trim().slice(0, max);
}

/**
 * Valida una cuenta candidata. Retorna account normalizado o error.
 * No valida formato de account_number ni holder_id (varía por país).
 */
export function validateBankAccount(input: unknown): BankAccountValidationResult {
  if (!input || typeof input !== "object") {
    return { ok: false, error: "Cuenta inválida" };
  }
  const o = input as Record<string, unknown>;

  const id = trim(o.id, 64);
  if (!id) return { ok: false, error: "Falta id de la cuenta" };

  const label = trim(o.label, 60);
  if (!label) return { ok: false, error: "Etiqueta requerida" };

  const kind = o.kind;
  if (typeof kind !== "string" || !BANK_ACCOUNT_KINDS.includes(kind as BankAccountKind)) {
    return { ok: false, error: `Tipo de cuenta inválido: ${kind}` };
  }

  const currency = trim(o.currency, 8).toUpperCase();
  if (!currency) return { ok: false, error: "Moneda requerida" };

  const bank_name = trim(o.bank_name, 80);
  if (!bank_name && (kind === "transfer" || kind === "mobile_payment")) {
    return { ok: false, error: "Banco requerido para transferencia y pago móvil" };
  }

  const account_number = trim(o.account_number, 80);
  if (!account_number) return { ok: false, error: "Número de cuenta requerido" };

  const account_type =
    o.account_type === "corriente" || o.account_type === "ahorro"
      ? (o.account_type as BankAccountType)
      : null;

  const holder_name = trim(o.holder_name, 120);
  if (!holder_name) return { ok: false, error: "Titular requerido" };

  const holder_id = trim(o.holder_id, 40) || undefined;
  const extra = trim(o.extra, 200) || undefined;
  const instructions = trim(o.instructions, 200) || undefined;

  const active = o.active !== false; // default true
  const sort_order = typeof o.sort_order === "number" ? Math.floor(o.sort_order) : 0;

  return {
    ok: true,
    account: {
      id,
      label,
      kind: kind as BankAccountKind,
      currency,
      bank_name,
      account_number,
      account_type,
      holder_name,
      holder_id,
      extra,
      instructions,
      active,
      sort_order,
    },
  };
}

export function validateBankAccountList(input: unknown): {
  ok: boolean;
  accounts?: BankAccount[];
  error?: string;
} {
  if (!Array.isArray(input)) return { ok: false, error: "Formato inválido" };
  if (input.length > MAX_BANK_ACCOUNTS_PER_ORG) {
    return {
      ok: false,
      error: `Máximo ${MAX_BANK_ACCOUNTS_PER_ORG} cuentas por organización`,
    };
  }

  const accounts: BankAccount[] = [];
  const seenIds = new Set<string>();

  for (let i = 0; i < input.length; i++) {
    const r = validateBankAccount(input[i]);
    if (!r.ok || !r.account) {
      return { ok: false, error: `Cuenta #${i + 1}: ${r.error ?? "inválida"}` };
    }
    if (seenIds.has(r.account.id)) {
      return { ok: false, error: `IDs duplicados en cuentas` };
    }
    seenIds.add(r.account.id);
    accounts.push(r.account);
  }

  return { ok: true, accounts };
}
