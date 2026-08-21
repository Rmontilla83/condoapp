"use client";

import { useState } from "react";
import { BankAccountCard } from "./bank-account-card";
import type { BankAccount } from "@/types/database";

/**
 * Bloque "Transferir a" para el diálogo de pago.
 *
 * Resuelve la fricción más cara del producto: el botón "Pagar ahora" abría un
 * formulario que pedía el comprobante de una transferencia que el propietario
 * todavía no podía hacer, porque en esa pantalla no aparecían ni el banco, ni la
 * cuenta, ni el titular. Los datos solo se renderizaban en /pagos, así que había
 * que cerrar, buscar y volver.
 *
 * Va colapsado por defecto (quien ya transfirió no necesita verlo otra vez) pero
 * se abre solo cuando hay una única cuenta configurada.
 */
export function PayToBlock({
  accounts,
  totalUsd,
  totalBs,
  currency,
}: {
  accounts: BankAccount[];
  totalUsd: number;
  totalBs: number;
  currency: string;
}) {
  const visibles = accounts
    .filter((a) => a.active)
    .sort((a, b) => a.sort_order - b.sort_order);

  const [abierto, setAbierto] = useState(visibles.length === 1);
  const [copiado, setCopiado] = useState<string | null>(null);

  function copiarMonto(clave: string, valor: string) {
    navigator.clipboard.writeText(valor);
    setCopiado(clave);
    setTimeout(() => setCopiado((c) => (c === clave ? null : c)), 1400);
  }

  if (visibles.length === 0) {
    return (
      <div className="rounded-lg border border-ember/30 bg-ember/5 p-3">
        <p className="text-[13px] text-marine-deep">
          Tu condominio todavía no cargó los datos bancarios. Pídeselos al
          administrador antes de transferir; igual puedes registrar aquí un pago
          que ya hayas hecho.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        className="w-full min-h-11 flex items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-cloud/40 transition"
      >
        <span className="font-meta text-mute">TRANSFERIR A</span>
        <span className="text-[13px] text-marine flex items-center gap-1.5">
          {abierto ? "Ocultar" : `Ver ${visibles.length > 1 ? `${visibles.length} cuentas` : "los datos"}`}
          <svg
            className={`h-3.5 w-3.5 transition-transform ${abierto ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </span>
      </button>

      {/* El monto exacto va SIEMPRE visible, abierto o cerrado: es el dato que
          el propietario teclea en la app del banco. */}
      <div className="border-t border-border px-3 py-2.5 flex flex-wrap items-center gap-2">
        <span className="font-meta text-mute">MONTO EXACTO</span>
        <div className="flex flex-wrap gap-2 ml-auto">
          <button
            type="button"
            onClick={() => copiarMonto("usd", totalUsd.toFixed(2))}
            className="min-h-11 rounded-md border border-border px-2.5 py-1 font-mono text-[13px] text-marine-deep tabular-nums hover:bg-cloud/60 transition"
            aria-label={`Copiar monto en ${currency}: ${totalUsd.toFixed(2)}`}
          >
            {copiado === "usd" ? "✓ Copiado" : `$${totalUsd.toFixed(2)}`}
          </button>
          {totalBs > 0 && (
            <button
              type="button"
              onClick={() => copiarMonto("bs", totalBs.toFixed(2))}
              className="min-h-11 rounded-md border border-border px-2.5 py-1 font-mono text-[13px] text-marine-deep tabular-nums hover:bg-cloud/60 transition"
              aria-label={`Copiar monto en bolívares: ${totalBs.toFixed(2)}`}
            >
              {copiado === "bs" ? "✓ Copiado" : `Bs ${totalBs.toFixed(2)}`}
            </button>
          )}
        </div>
      </div>

      {abierto && (
        <div className="border-t border-border p-3 space-y-3">
          {visibles.map((acc) => (
            <BankAccountCard key={acc.id} account={acc} tone="light" />
          ))}
        </div>
      )}
    </div>
  );
}
