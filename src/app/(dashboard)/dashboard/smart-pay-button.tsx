"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MultiPayDialog } from "@/app/(dashboard)/pagos/multi-pay-dialog";
import type { Invoice } from "@/types/database";

interface Props {
  actionable: Invoice[];
  inReview: Invoice[];
  rate: number;
  canSeeFee: boolean;
}

export function SmartPayButton({ actionable, inReview, rate, canSeeFee }: Props) {
  const [target, setTarget] = useState<{ invoices: Invoice[] } | null>(null);

  if (!canSeeFee) return null;

  // 0 accionables: si hay en revisión muestra info; si no, nada (saldo card ya muestra "AL DÍA")
  if (actionable.length === 0) {
    if (inReview.length > 0) {
      return (
        <Button disabled variant="outline" className="h-11 px-5">
          EN REVISIÓN
        </Button>
      );
    }
    return null;
  }

  const currencies = new Set(actionable.map((i) => i.currency));
  const mixedCurrency = currencies.size > 1;

  // 1 accionable misma moneda → abrir dialog directo
  if (actionable.length === 1 && !mixedCurrency) {
    return (
      <>
        <Button
          className="h-11 px-5 press-spring"
          onClick={() => setTarget({ invoices: actionable })}
        >
          Pagar ahora
        </Button>
        <MultiPayDialog target={target} rate={rate} onClose={() => setTarget(null)} />
      </>
    );
  }

  // N>=2 o currency mixing → navega a /pagos
  return (
    <Link href="/pagos">
      <Button className="h-11 px-5 press-spring">
        {mixedCurrency ? "Pagar · Múltiple" : `Pagar ${actionable.length}`}
      </Button>
    </Link>
  );
}
