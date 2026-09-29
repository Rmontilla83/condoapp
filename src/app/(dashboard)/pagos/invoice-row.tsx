"use client";

import { usd, bs, tasa } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { isInvoiceOverdue } from "@/lib/utils";
import type { Invoice } from "@/types/database";
import { estaAbierta, numeroRecibo } from "@/lib/cuotas";

const statusConfig = {
  pending: { label: "Pendiente", className: "border-amber-300 text-amber-700 bg-amber-50" },
  partial: { label: "Abonada", className: "border-cyan-300 text-cyan-800 bg-cyan-50" },
  paid: { label: "Pagado", className: "border-emerald-300 text-emerald-700 bg-emerald-50" },
  overdue: { label: "Vencido", className: "border-red-300 text-red-700 bg-red-50" },
  cancelled: { label: "Cancelado", className: "border-gray-300 text-gray-700 bg-gray-50" },
};

interface Props {
  /** Con `monto_original` y `abonado` si viene de comoPendiente (cuota abonada en parte). */
  invoice: Invoice & { monto_original?: number; abonado?: number };
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
  /**
   * Datos del pago aprobado, para que una cuota pagada pueda DEMOSTRARSE.
   * Antes solo mostraba el badge "Pagado": sin fecha, sin referencia, sin
   * comprobante. El propietario no tenía nada que enseñar seis meses después.
   */
  payment?: {
    paid_at: string;
    reviewed_at: string | null;
    payment_method: string;
    reference: string | null;
    receipt_url: string | null;
    amount_bs: number | null;
    exchange_rate: number | null;
  };
}

export function InvoiceRow({ invoice, rate = 0, selected, onToggle, onPayClick, inReview, today, payment }: Props) {
  const isPaid = invoice.status === "paid";
  // El vencimiento se deriva de la fecha, no del status: nada en el código
  // escribe nunca 'overdue', así que este badge jamás se encendía en producción.
  const isOverdue = today
    ? isInvoiceOverdue({ status: invoice.status, due_date: invoice.due_date }, today)
    : false;
  const isPending = estaAbierta(invoice.status);
  const config = isOverdue
    ? statusConfig.overdue
    : statusConfig[invoice.status as keyof typeof statusConfig] ?? statusConfig.pending;
  const selectable = onToggle !== undefined;

  const fmt = (iso: string | null | undefined) =>
    iso ? new Date(iso).toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" }) : null;

  return (
    <div
      className={`rounded-lg border p-4 transition ${
        inReview ? "border-amber-300 bg-amber-50/50" :
        selectable && selected ? "border-cyan bg-cyan/5" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-3">
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
            {/* due_date es una fecha sin hora ("2026-09-30"). `new Date()` la lee
                como medianoche UTC y en Venezuela (UTC-4) se mostraba el día anterior. */}
            {invoice.receipt_number != null && <>Recibo {numeroRecibo(invoice.receipt_number)} · </>}
            Vence: {new Date(`${invoice.due_date}T12:00:00Z`).toLocaleDateString("es", { timeZone: "UTC" })}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <div className="text-right">
          <p className="text-sm font-bold">{usd(Number(invoice.amount))}</p>
          {invoice.abonado != null && invoice.abonado > 0 && invoice.monto_original != null && (
            <p className="text-[11px] text-cyan-ink">
              Resta de {usd(invoice.monto_original)} · abonado {usd(invoice.abonado)}
            </p>
          )}
          {/* En una cuota YA PAGADA no se muestra la conversión a la tasa de
              hoy: al lado va el monto en bolívares congelado del pago, y dos
              cifras distintas en la misma tarjeta solo generan dudas. */}
          {rate > 0 && !isPaid && (
            <p className="text-[11px] text-muted-foreground">
              {bs((Number(invoice.amount) * rate))}
            </p>
          )}
        </div>
        {inReview ? (
          <Badge variant="outline" className="border-amber-400 text-amber-800 bg-amber-100">
            EN REVISIÓN
          </Badge>
        ) : isPending && onPayClick ? (
          <Button size="sm" onClick={onPayClick}>
            Registrar pago
          </Button>
        ) : !isPending ? (
          <Badge variant="outline" className={config.className}>
            {config.label}
          </Badge>
        ) : null}
        </div>
      </div>

      {/* Comprobante de que se pagó: fecha, referencia, la captura que subió el
          propio dueño, y la constancia imprimible. */}
      {isPaid && payment && (
        <div className="mt-3 pt-3 border-t border-border flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <span className="font-meta text-mute">
            PAGADO EL {fmt(payment.paid_at)?.toUpperCase()}
          </span>
          {payment.reference && (
            <span className="font-mono text-[12px] text-mute">REF {payment.reference}</span>
          )}
          {payment.amount_bs != null && payment.amount_bs > 0 && (
            <span className="font-mono text-[12px] text-mute tabular-nums">
              ≈ {bs(payment.amount_bs)}
              {payment.exchange_rate ? ` (tasa ${tasa(payment.exchange_rate)})` : ""}
            </span>
          )}
          {payment.receipt_url && (
            <a
              href={payment.receipt_url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-meta text-cyan-ink hover:text-marine-deep transition-colors"
            >
              VER COMPROBANTE
            </a>
          )}
          <a
            href={`/pagos/${invoice.id}/constancia`}
            className="font-meta text-cyan-ink hover:text-marine-deep transition-colors"
          >
            DESCARGAR CONSTANCIA →
          </a>
        </div>
      )}
    </div>
  );
}
