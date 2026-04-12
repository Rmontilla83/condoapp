"use client";

import { Badge } from "@/components/ui/badge";
import { PayDialog } from "./pay-dialog";
import type { Invoice } from "@/types/database";

const statusConfig = {
  pending: { label: "Pendiente", className: "border-amber-300 text-amber-700 bg-amber-50" },
  paid: { label: "Pagado", className: "border-emerald-300 text-emerald-700 bg-emerald-50" },
  overdue: { label: "Vencido", className: "border-red-300 text-red-700 bg-red-50" },
  cancelled: { label: "Cancelado", className: "border-gray-300 text-gray-700 bg-gray-50" },
};

export function InvoiceRow({ invoice, rate = 0 }: { invoice: Invoice; rate?: number }) {
  const config = statusConfig[invoice.status as keyof typeof statusConfig] ?? statusConfig.pending;
  const isPaid = invoice.status === "paid";
  const isOverdue = invoice.status === "overdue";
  const isPending = invoice.status === "pending" || invoice.status === "overdue";

  return (
    <div className="flex items-center justify-between rounded-lg border p-4">
      <div className="flex items-center gap-4">
        <div className={`flex h-10 w-10 items-center justify-center rounded-full shrink-0 ${
          isPaid ? "bg-emerald-100" : isOverdue ? "bg-red-100" : "bg-amber-100"
        }`}>
          {isPaid ? (
            <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          ) : (
            <svg className={`h-5 w-5 ${isOverdue ? "text-red-600" : "text-amber-600"}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
        </div>
        <div>
          <p className="text-sm font-medium">{invoice.description}</p>
          <p className="text-xs text-muted-foreground">
            Vence: {new Date(invoice.due_date).toLocaleDateString("es")}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-sm font-bold">${Number(invoice.amount).toFixed(2)}</p>
          {rate > 0 && (
            <p className="text-[11px] text-muted-foreground">Bs {(Number(invoice.amount) * rate).toFixed(2)}</p>
          )}
        </div>
        {isPending ? (
          <PayDialog
            invoiceId={invoice.id}
            amount={Number(invoice.amount)}
            description={invoice.description}
          />
        ) : (
          <Badge variant="outline" className={config.className}>
            {config.label}
          </Badge>
        )}
      </div>
    </div>
  );
}
