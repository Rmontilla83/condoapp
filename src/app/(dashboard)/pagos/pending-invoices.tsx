"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { InvoiceRow } from "./invoice-row";
import { MultiPayDialog } from "./multi-pay-dialog";
import type { BankAccount, Invoice } from "@/types/database";

interface PaymentTarget {
  invoices: Invoice[];
}

export function PendingInvoices({
  invoices,
  rate,
  today,
  bankAccounts = [],
}: {
  invoices: Invoice[];
  rate: number;
  /** Hoy en la zona horaria del condominio, calculado en el servidor. */
  today?: string;
  bankAccounts?: BankAccount[];
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [target, setTarget] = useState<PaymentTarget | null>(null);

  const selectedInvoices = useMemo(
    () => invoices.filter((i) => selected.has(i.id)),
    [invoices, selected],
  );

  const total = selectedInvoices.reduce((s, i) => s + Number(i.amount), 0);
  const currencies = new Set(selectedInvoices.map((i) => i.currency));
  const mixed = currencies.size > 1;

  function toggle(id: string) {
    setSelected((curr) => {
      const next = new Set(curr);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(invoices.map((i) => i.id)));
  }
  function clearAll() {
    setSelected(new Set());
  }

  function payOne(invoice: Invoice) {
    setTarget({ invoices: [invoice] });
  }

  function paySelected() {
    if (selectedInvoices.length === 0) return;
    setTarget({ invoices: selectedInvoices });
  }

  if (invoices.length === 0) {
    return (
      <div className="py-6 text-center">
        <p className="font-meta text-cyan-ink">SIN CUOTAS PENDIENTES</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-3 gap-2">
        <p className="font-meta text-mute text-[12px]">
          Selecciona varias para pagar con un solo comprobante
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={selectAll}
            className="text-[12px] text-cyan hover:underline"
          >
            Todas
          </button>
          {selected.size > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="text-[12px] text-mute hover:underline"
            >
              Ninguna
            </button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {invoices.map((invoice) => (
          <InvoiceRow
            key={invoice.id}
            invoice={invoice}
            rate={rate}
            today={today}
            selected={selected.has(invoice.id)}
            onToggle={() => toggle(invoice.id)}
            onPayClick={() => payOne(invoice)}
          />
        ))}
      </div>

      {selected.size > 0 && (
        <div className="sticky bottom-24 md:bottom-4 mt-5 rounded-2xl bg-marine-deep text-frost p-4 shadow-lg flex items-center justify-between gap-3 z-10">
          <div className="min-w-0">
            <p className="font-meta text-ember text-[11px]">SELECCIONADAS</p>
            <p className="mt-0.5 text-[14px] truncate">
              {selected.size} cuota{selected.size !== 1 ? "s" : ""} · ${total.toFixed(2)}
              {mixed && (
                <span className="ml-2 text-amber-300 text-[12px]">(monedas distintas)</span>
              )}
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={paySelected}
            disabled={mixed}
            className="bg-ember hover:bg-ember/90 text-marine-deep"
          >
            Registrar pago
          </Button>
        </div>
      )}

      <MultiPayDialog
        bankAccounts={bankAccounts} target={target} rate={rate} onClose={() => setTarget(null)} />
    </>
  );
}
