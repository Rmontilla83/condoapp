"use client";

import { BankAccountCard } from "@/components/pagos/bank-account-card";
import type { BankAccount } from "@/types/database";

interface Props {
  accounts: BankAccount[];
  total: number;
  rate: number;
  pendingCount: number;
}


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
