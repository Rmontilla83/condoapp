import type { ExpenseCategory, Vendor } from "@/types/database";

const SLUG_RE = /^[a-z0-9_-]+$/;

export interface CategoryDraft {
  id?: string;
  code: string;
  label: string;
  icon?: string | null;
  is_active?: boolean;
  position?: number;
}

export function validateCategoryDraft(input: unknown): {
  ok: boolean;
  draft?: CategoryDraft;
  error?: string;
} {
  if (!input || typeof input !== "object") return { ok: false, error: "Inválido" };
  const o = input as Record<string, unknown>;

  const code = typeof o.code === "string" ? o.code.trim().toLowerCase() : "";
  if (!code) return { ok: false, error: "Code requerido" };
  if (!SLUG_RE.test(code)) return { ok: false, error: "Code solo permite a-z, 0-9, _ y -" };

  const label = typeof o.label === "string" ? o.label.trim().slice(0, 80) : "";
  if (!label) return { ok: false, error: "Label requerido" };

  const icon = typeof o.icon === "string" && o.icon.length > 0 ? o.icon.trim().slice(0, 8) : null;
  const id = typeof o.id === "string" && o.id ? o.id : undefined;
  const is_active = o.is_active !== false;
  const position = typeof o.position === "number" ? Math.floor(o.position) : 0;

  return { ok: true, draft: { id, code, label, icon, is_active, position } };
}

export interface VendorDraft {
  id?: string;
  name: string;
  rif?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  notes?: string | null;
  active?: boolean;
}

export function validateVendorDraft(input: unknown): {
  ok: boolean;
  draft?: VendorDraft;
  error?: string;
} {
  if (!input || typeof input !== "object") return { ok: false, error: "Inválido" };
  const o = input as Record<string, unknown>;

  const name = typeof o.name === "string" ? o.name.trim().slice(0, 120) : "";
  if (!name) return { ok: false, error: "Nombre requerido" };

  const rif = typeof o.rif === "string" && o.rif.trim() ? o.rif.trim().slice(0, 40) : null;
  const contact_phone = typeof o.contact_phone === "string" && o.contact_phone.trim() ? o.contact_phone.trim().slice(0, 40) : null;
  const contact_email = typeof o.contact_email === "string" && o.contact_email.trim() ? o.contact_email.trim().slice(0, 120) : null;
  const notes = typeof o.notes === "string" && o.notes.trim() ? o.notes.trim().slice(0, 500) : null;
  const id = typeof o.id === "string" && o.id ? o.id : undefined;
  const active = o.active !== false;

  return { ok: true, draft: { id, name, rif, contact_phone, contact_email, notes, active } };
}

export interface VoidReasonResult {
  ok: boolean;
  reason?: string;
  error?: string;
}

export function validateVoidReason(input: unknown): VoidReasonResult {
  const reason = typeof input === "string" ? input.trim() : "";
  if (reason.length < 10) {
    return { ok: false, error: "La razón debe tener al menos 10 caracteres" };
  }
  if (reason.length > 500) {
    return { ok: false, error: "La razón excede 500 caracteres" };
  }
  return { ok: true, reason };
}

// Re-exports para tipos
export type { ExpenseCategory, Vendor };
