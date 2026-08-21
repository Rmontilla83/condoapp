"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { isInvoiceOverdue } from "@/lib/utils";
import type { Invoice } from "@/types/database";

const statusConfig = {
  pending: { label: "Pendiente", className: "border-amber-300 text-amber-700 bg-amber-50" },
  paid: { label: "Pagado", className: "border-emerald-300 text-emerald-700 bg-emerald-50" },
  overdue: { label: "Vencido", className: "border-red-300 text-red-700 bg-red-50" },
  cancelled: { label: "Cancelado", className: "border-gray-300 text-gray-700 bg-gray-50" },
};

interface Props {
  invoice: Invoice;
  rate?: number;
  /** Si se pasa, la fila muestra checkbox y permite seleccionar. */
  selected?: boolean;
  onToggle?: () => void;
  onPayClick?: () => void;
  /** True si la invoice tiene un comprobante en revisión por el admin. */
  inReview?: boolean;
  /**
   * Hoy como `YYYY-MM-DD` en la zona horaria del condominio, calculado en el
   * servidor. Se pasa como prop en vez de hacer `new Date()` acá para no
   * introducir un desajuste de hidratación (el servidor está en UTC).
   */
  today?: string;
}

export function InvoiceRow({ invoice, rate = 0, selected, onToggle, onPayClick, inReview, today }: Props) {
  const isPaid = invoice.status === "paid";
  // El vencimiento se deriva de la fecha, no del status: nada en el código
  // escribe nunca 'overdue', así que este badge jamás se encendía en producción.
  const isOverdue = today
    ? isInvoiceOverdue({ status: invoice.status, due_date: invoice.due_date }, today)
    : false;
  const isPending = invoice.status === "pending" || invoice.status === "overdue";
  const config = isOverdue
    ? statusConfig.overdue
    : statusConfig[invoice.status as keyof typeof statusConfig] ?? statusConfig.pending;
  const selectable = onToggle !== undefined;

  return (
    <div
      className={`flex items-center justify-between rounded-lg border p-4 gap-3 transition ${
        inReview ? "border-amber-300 bg-amber-50/50" :
        selectable && selected ? "border-cyan bg-cyan/5" : ""
      }`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {selectable && (
          <input
            type="checkbox"
            checked={selected ?? false}
            onChange={onToggle}
            aria-label="Seleccionar para pago múltiple"
            className="h-5 w-5 cursor-pointer shrink-0"
          />
        )}
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-full shrink-0 ${
            inReview ? "bg-amber-200" :
            isPaid ? "bg-emerald-100" : isOverdue ? "bg-red-100" : "bg-amber-100"
          }`}
        >
          {inReview ? (
            <svg className="h-5 w-5 text-amber-700 animate-pulse" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
          ) : isPaid ? (
            <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          ) : (
            <svg className={`h-5 w-5 ${isOverdue ? "text-red-600" : "text-amber-600"}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium truncate">{invoice.description}</p>
            {invoice.kind === "extraordinary" && (
              <Badge variant="outline" className="border-ember/50 text-ember bg-ember/5 text-[10px]">
                EXTRAORDINARIA
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Vence: {new Date(invoice.due_date).toLocaleDateString("es")}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <div className="text-right">
          <p className="text-sm font-bold">${Number(invoice.amount).toFixed(2)}</p>
          {rate > 0 && (
            <p className="text-[11px] text-muted-foreground">
              Bs {(Number(invoice.amount) * rate).toFixed(2)}
            </p>
          )}
        </div>
        {inReview ? (
          <Badge variant="outline" className="border-amber-400 text-amber-800 bg-amber-100">
            EN REVISIÓN
          </Badge>
        ) : isPending && onPayClick ? (
          <Button size="sm" onClick={onPayClick}>
            Subir comprobante
          </Button>
        ) : !isPending ? (
          <Badge variant="outline" className={config.className}>
            {config.label}
          </Badge>
        ) : null}
      </div>
    </div>
  );
}
