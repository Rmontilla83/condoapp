"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MultiPayDialog } from "@/app/(dashboard)/pagos/multi-pay-dialog";
import type { BankAccount, Invoice } from "@/types/database";

interface Props {
  actionable: Invoice[];
  inReview: Invoice[];
  rate: number;
  canSeeFee: boolean;
  bankAccounts?: BankAccount[];
}

export function PendingPayFab({
  actionable,
  inReview,
  rate,
  canSeeFee,
  bankAccounts = [],
}: Props) {
  const pathname = usePathname();
  const [target, setTarget] = useState<{ invoices: Invoice[] } | null>(null);

  // Oculto en /pagos (la pantalla ya muestra todos los pagos) y si tenant sin permission
  if (!canSeeFee) return null;
  if (pathname?.startsWith("/pagos")) return null;

  // Sin nada accionable y nada en revisión → no FAB
  if (actionable.length === 0 && inReview.length === 0) return null;

  // Solo en revisión: FAB informativo no clickeable
  if (actionable.length === 0 && inReview.length > 0) {
    const total = inReview.reduce((s, i) => s + Number(i.amount), 0);
    const currency = inReview[0]?.currency ?? "USD";
    return (
      <div className="md:hidden fixed bottom-20 left-3 right-3 z-40">
        <div className="rounded-full bg-amber-100 border border-amber-300 px-5 py-3 shadow-lg flex items-center justify-between gap-2">
          <span className="font-meta text-amber-800">EN REVISIÓN</span>
          <span className="font-display text-[15px] text-amber-900">
            ${total.toFixed(2)} {currency}
          </span>
        </div>
      </div>
    );
  }

  const total = actionable.reduce((s, i) => s + Number(i.amount), 0);
  const currency = actionable[0]?.currency ?? "USD";
  const currencies = new Set(actionable.map((i) => i.currency));
  const mixedCurrency = currencies.size > 1;

  // Render content function (compartido entre los 2 paths abajo)
  const fabInner = (
    <div className="rounded-full bg-marine-deep text-frost px-5 py-3 shadow-[0_18px_40px_-12px_rgb(15,46,90,0.55)] flex items-center justify-between gap-3">
      <span className="font-meta text-ember">PAGAR</span>
      <span className="font-display text-[15px] tabular-nums">
        {mixedCurrency ? "MÚLTIPLE" : `$${total.toFixed(2)} ${currency}`}
      </span>
    </div>
  );

  // 1 accionable misma moneda → click abre dialog directo
  if (actionable.length === 1 && !mixedCurrency) {
    return (
      <>
        <button
          type="button"
          onClick={() => setTarget({ invoices: actionable })}
          className="md:hidden fixed bottom-20 left-3 right-3 z-40 cursor-pointer press-spring"
        >
          {fabInner}
        </button>
        <MultiPayDialog
        target={target}
        rate={rate}
        bankAccounts={bankAccounts}
        onClose={() => setTarget(null)}
      />
      </>
    );
  }

  // N>=2 o currency mixing → navega a /pagos
  return (
    <Link
      href="/pagos"
      className="md:hidden fixed bottom-20 left-3 right-3 z-40 press-spring"
    >
      {fabInner}
    </Link>
  );
}
