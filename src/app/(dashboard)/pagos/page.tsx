import {
  getCurrentProfile,
  getUserUnitIds,
  getInvoicesForUser,
  getFeeBreakdown,
  getCurrentRate,
} from "@/lib/queries";
import { InvoiceRow } from "./invoice-row";

export default async function PagosPage() {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return null;

  const unitIds = await getUserUnitIds(profile.id);
  const [invoices, feeBreakdown, rateData] = await Promise.all([
    getInvoicesForUser(unitIds),
    getFeeBreakdown(profile.organization_id),
    getCurrentRate(profile.organization_id),
  ]);

  const rate = Number(rateData.rate);
  const pendingInvoices = invoices.filter((i) => i.status === "pending" || i.status === "overdue");
  const paidInvoices = invoices.filter((i) => i.status === "paid");
  const pendingTotal = pendingInvoices.reduce((sum, i) => sum + Number(i.amount), 0);
  const pendingTotalBs = pendingTotal * rate;
  const feeTotal = feeBreakdown.reduce((sum, f) => sum + Number(f.amount), 0);

  const lastPaid = paidInvoices[0];
  const nextDue = pendingInvoices.sort(
    (a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
  )[0];

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-5">
        <div>
          <span className="font-meta-loose text-cyan">CUOTAS · ATRYUM</span>
          <h1 className="mt-4 font-display text-[clamp(1.75rem,3.5vw,2.5rem)] leading-[1.1] tracking-[-0.03em] text-marine-deep">
            Tu estado de <em className="font-editorial text-cyan">cuenta</em>
          </h1>
        </div>
        {rate > 0 && (
          <div className="text-right shrink-0">
            <p className="font-meta text-mute">TASA BCV</p>
            <p className="mt-1 font-display text-[20px] text-marine-deep">
              Bs {rate.toFixed(2)}
              <span className="text-mute text-sm">/$</span>
            </p>
            <p className="font-meta text-mute">{rateData.effective_date}</p>
          </div>
        )}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-2xl bg-card border border-border p-5">
          <p className="font-meta text-mute">SALDO PENDIENTE</p>
          <p
            className={`mt-3 font-display text-[32px] leading-none tracking-[-0.02em] ${
              pendingTotal > 0 ? "text-marine-deep" : "text-cyan"
            }`}
          >
            ${pendingTotal.toFixed(2)}
          </p>
          {rate > 0 && pendingTotal > 0 && (
            <p className="mt-2 text-[13px] text-mute">Bs {pendingTotalBs.toFixed(2)}</p>
          )}
          {pendingTotal === 0 && (
            <p className="mt-2 font-meta text-cyan">AL DÍA</p>
          )}
        </div>
        <div className="rounded-2xl bg-card border border-border p-5">
          <p className="font-meta text-mute">ÚLTIMO PAGO</p>
          {lastPaid ? (
            <>
              <p className="mt-3 font-display text-[32px] leading-none tracking-[-0.02em] text-marine-deep">
                ${Number(lastPaid.amount).toFixed(2)}
              </p>
              <p className="mt-2 text-[13px] text-mute truncate">{lastPaid.description}</p>
            </>
          ) : (
            <p className="mt-3 text-[15px] text-mute">Sin pagos</p>
          )}
        </div>
        <div className="rounded-2xl bg-card border border-border p-5">
          <p className="font-meta text-mute">PRÓXIMO VENCIMIENTO</p>
          {nextDue ? (
            <>
              <p className="mt-3 font-display text-[28px] leading-none tracking-[-0.02em] text-marine-deep">
                {new Date(nextDue.due_date).toLocaleDateString("es", { day: "numeric", month: "long" })}
              </p>
              <p className="mt-2 text-[13px] text-mute">
                ${Number(nextDue.amount).toFixed(2)}
                {rate > 0 ? ` · Bs ${(Number(nextDue.amount) * rate).toFixed(2)}` : ""}
              </p>
            </>
          ) : (
            <p className="mt-3 text-[15px] text-mute">Sin pendientes</p>
          )}
        </div>
      </div>

      {/* Métodos de pago */}
      {pendingTotal > 0 && (
        <div className="rounded-2xl bg-marine-deep text-frost p-6 md:p-7">
          <p className="font-meta text-ember">MÉTODOS DISPONIBLES</p>
          <p className="mt-3 font-display text-[20px] leading-tight">
            Tienes {pendingInvoices.length} cuota{pendingInvoices.length > 1 ? "s" : ""}{" "}
            <em className="font-editorial text-ember">pendiente{pendingInvoices.length > 1 ? "s" : ""}</em>
          </p>
          <p className="mt-1 text-[13px] text-frost/60">
            Total: ${pendingTotal.toFixed(2)}{rate > 0 ? ` (Bs ${pendingTotalBs.toFixed(2)})` : ""}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {[
              "Débito Inmediato (Bs)",
              "Stripe (USD)",
              "Transferencia + comprobante",
            ].map((method) => (
              <span key={method} className="font-meta bg-frost/5 border border-frost/10 text-frost/80 px-3 py-1.5 rounded-md">
                {method.toUpperCase()}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Historial */}
      <div className="rounded-2xl bg-card border border-border p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="font-meta text-mute">HISTORIAL</p>
            <p className="mt-2 text-[15px] font-medium text-marine-deep">
              {invoices.length} cuota{invoices.length !== 1 ? "s" : ""} registrada{invoices.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="space-y-3">
          {invoices.length === 0 ? (
            <p className="py-6 text-center text-[13px] text-mute">No hay cuotas registradas</p>
          ) : (
            invoices.map((invoice) => (
              <InvoiceRow key={invoice.id} invoice={invoice} rate={rate} />
            ))
          )}
        </div>
      </div>

      {/* Desglose */}
      {feeBreakdown.length > 0 && (
        <div className="rounded-2xl bg-card border border-border p-6">
          <p className="font-meta text-mute">DESGLOSE MENSUAL</p>
          <p className="mt-2 text-[15px] font-medium text-marine-deep mb-5">
            Referencia en USD · equivalente en Bs a tasa BCV
          </p>
          <div className="space-y-0">
            {feeBreakdown.map((fee) => (
              <div key={fee.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                <span className="text-[14px] text-mute">{fee.concept}</span>
                <div className="text-right">
                  <span className="text-[14px] font-medium text-marine-deep">${Number(fee.amount).toFixed(2)}</span>
                  {rate > 0 && (
                    <span className="font-meta text-mute ml-3">
                      BS {(Number(fee.amount) * rate).toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between py-4 mt-1">
              <span className="text-[14px] font-medium text-marine-deep">Total</span>
              <div className="text-right">
                <span className="font-display text-[20px] text-marine-deep">${feeTotal.toFixed(2)}</span>
                {rate > 0 && (
                  <span className="font-meta text-mute ml-3">BS {(feeTotal * rate).toFixed(2)}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
