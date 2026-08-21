import {
  getCurrentProfile,
  getUnitIdsWithFeeAccess,
  getUserUnitIds,
  getInvoicesForUser,
  getInvoiceIdsWithPendingTransactions,
  getLatestRejectionsByInvoice,
  getApprovedPaymentsByInvoice,
  getFeeBreakdown,
  getCurrentRate,
  getOrganization,
} from "@/lib/queries";
import { todayInTimeZone } from "@/lib/utils";
import { signStorageRefs } from "@/lib/storage";
import { InvoiceRow } from "./invoice-row";
import { PendingInvoices } from "./pending-invoices";
import { PaymentMethods } from "./payment-methods";
import type { BankAccount, Organization } from "@/types/database";

export default async function PagosPage() {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return null;

  // Solo las unidades cuyas cuotas puede ver: el propietario puede haberle
  // ocultado las finanzas a su inquilino desde /mi-unidad.
  const [unitIds, todasSusUnidades] = await Promise.all([
    getUnitIdsWithFeeAccess(profile.id),
    getUserUnitIds(profile.id),
  ]);

  // Un inquilino sin permiso de ver cuotas no tiene que ver un saldo en cero y
  // un "estás al día": eso le está diciendo que no debe nada, que es distinto
  // de que no le toca verlo. Se lo decimos con todas las letras.
  const sinPermisoDeVerCuotas =
    unitIds.length === 0 && todasSusUnidades.length > 0;

  if (sinPermisoDeVerCuotas) {
    return (
      <div className="space-y-6">
        <div>
          <span className="font-meta-loose text-cyan-ink">CUOTAS · ATRYUM</span>
          <h1 className="mt-4 font-display text-[clamp(1.75rem,3.5vw,2.5rem)] leading-[1.1] tracking-[-0.03em] text-marine-deep">
            Tu estado de <em className="font-editorial text-cyan-ink">cuenta</em>
          </h1>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 md:p-7 max-w-2xl">
          <p className="font-meta text-mute">SIN ACCESO A LAS CUOTAS</p>
          <p className="mt-3 text-[15px] text-marine-deep leading-relaxed">
            El propietario de tu unidad no habilitó la parte financiera para tu cuenta, así que
            desde aquí no vas a ver el saldo ni las cuotas.
          </p>
          <p className="mt-2 text-[14px] text-mute leading-relaxed">
            No quiere decir que la unidad esté al día ni que esté en deuda: quiere decir que esa
            información la maneja el propietario. Si necesitas verla, háblalo con él.
          </p>
        </div>
      </div>
    );
  }
  const [invoices, feeBreakdown, rateData, orgRaw] = await Promise.all([
    getInvoicesForUser(unitIds),
    getFeeBreakdown(profile.organization_id),
    getCurrentRate(profile.organization_id),
    getOrganization(profile.organization_id),
  ]);

  const org = orgRaw as Organization | null;
  const hoy = todayInTimeZone(org?.timezone ?? undefined);
  const bankAccounts: BankAccount[] = org && Array.isArray(org.bank_accounts) ? org.bank_accounts : [];

  const rate = Number(rateData.rate);
  const pendingInvoices = invoices
    .filter((i) => i.status === "pending" || i.status === "overdue")
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
  const paidInvoices = invoices.filter((i) => i.status === "paid");

  // Comprobantes ya subidos esperando aprobación admin
  const pendingTxInvoiceIds = await getInvoiceIdsWithPendingTransactions(
    pendingInvoices.map((i) => i.id),
  );

  const inReviewInvoices = pendingInvoices.filter((i) => pendingTxInvoiceIds.has(i.id));
  const actionableInvoices = pendingInvoices.filter((i) => !pendingTxInvoiceIds.has(i.id));

  // Cuotas que volvieron a estar pendientes porque el admin rechazó el
  // comprobante. Antes reaparecían sin explicación ninguna.
  const rechazos = await getLatestRejectionsByInvoice(actionableInvoices.map((i) => i.id));

  // Pagos aprobados del historial: fecha, referencia y el comprobante que subió
  // el propio dueño. Sin esto, una cuota pagada solo decía "Pagado" y el
  // propietario no tenía con qué demostrarlo.
  const pagos = await getApprovedPaymentsByInvoice(paidInvoices.map((i) => i.id));
  const pagosLista = [...pagos.values()];
  const firmasComprobantes = await signStorageRefs(pagosLista.map((p) => p.receipt_url));
  const urlFirmadaPorTx = new Map(
    pagosLista.map((p, i) => [p.transaction_id, firmasComprobantes[i]]),
  );

  const inReviewTotal = inReviewInvoices.reduce((sum, i) => sum + Number(i.amount), 0);
  const actionableTotal = actionableInvoices.reduce((sum, i) => sum + Number(i.amount), 0);
  const pendingTotal = actionableTotal + inReviewTotal;
  const pendingTotalBs = pendingTotal * rate;
  const feeTotal = feeBreakdown.reduce((sum, f) => sum + Number(f.amount), 0);

  const lastPaid = paidInvoices[0];
  const nextDue = actionableInvoices[0];

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-5">
        <div>
          <span className="font-meta-loose text-cyan-ink">CUOTAS · ATRYUM</span>
          <h1 className="mt-4 font-display text-[clamp(1.75rem,3.5vw,2.5rem)] leading-[1.1] tracking-[-0.03em] text-marine-deep">
            Tu estado de <em className="font-editorial text-cyan-ink">cuenta</em>
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
              actionableTotal > 0 ? "text-marine-deep" : "text-cyan-ink"
            }`}
          >
            ${actionableTotal.toFixed(2)}
          </p>
          {rate > 0 && actionableTotal > 0 && (
            <p className="mt-2 text-[13px] text-mute">Bs {(actionableTotal * rate).toFixed(2)}</p>
          )}
          {inReviewTotal > 0 && (
            <p className="mt-2 font-meta text-amber-700">
              ${inReviewTotal.toFixed(2)} EN REVISIÓN
            </p>
          )}
          {pendingTotal === 0 && (
            <p className="mt-2 font-meta text-cyan-ink">AL DÍA</p>
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

      {/* Datos bancarios reales del condo (solo si hay invoices accionables) */}
      {actionableTotal > 0 && (
        <PaymentMethods
          accounts={bankAccounts}
          total={actionableTotal}
          rate={rate}
          pendingCount={actionableInvoices.length}
        />
      )}

      {/* Comprobantes en revisión */}
      {inReviewInvoices.length > 0 && (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-6">
          <div className="mb-4">
            <p className="font-meta text-amber-800">COMPROBANTES EN REVISIÓN</p>
            <p className="mt-2 text-[15px] font-medium text-amber-900">
              {inReviewInvoices.length} cuota{inReviewInvoices.length !== 1 ? "s" : ""} esperando
              aprobación del administrador
            </p>
            <p className="mt-1 text-[12px] text-amber-700/80">
              El admin del condominio revisará tu comprobante. El estado se actualiza en esta misma pantalla.
            </p>
          </div>
          <div className="space-y-3">
            {inReviewInvoices.map((invoice) => (
              <InvoiceRow
                key={invoice.id}
                invoice={invoice}
                rate={rate}
                today={hoy}
                inReview={true}
              />
            ))}
          </div>
        </div>
      )}

      {/* Comprobantes rechazados — lo primero que tiene que ver el residente,
          porque explica por qué le reapareció una deuda que creía resuelta. */}
      {rechazos.size > 0 && (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-6">
          <p className="font-meta text-destructive">
            COMPROBANTE{rechazos.size !== 1 ? "S" : ""} RECHAZADO{rechazos.size !== 1 ? "S" : ""}
          </p>
          <p className="mt-2 text-[15px] font-medium text-marine-deep">
            {rechazos.size === 1
              ? "El administrador no pudo confirmar uno de tus pagos"
              : `El administrador no pudo confirmar ${rechazos.size} de tus pagos`}
          </p>
          <ul className="mt-4 space-y-3">
            {actionableInvoices
              .filter((inv) => rechazos.has(inv.id))
              .map((inv) => {
                const r = rechazos.get(inv.id)!;
                return (
                  <li
                    key={inv.id}
                    className="rounded-xl bg-card border border-destructive/30 p-4"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                      <p className="text-[14px] font-medium text-marine-deep">
                        {inv.description}
                      </p>
                      <p className="font-mono text-[13px] text-mute tabular-nums">
                        ${Number(r.amount).toFixed(2)}
                      </p>
                    </div>
                    <p className="mt-2 text-[14px] text-destructive">
                      {r.reason ?? "El administrador no indicó un motivo."}
                    </p>
                    {r.reviewed_at && (
                      <p className="mt-1 font-meta text-mute">
                        REVISADO EL{" "}
                        {new Date(r.reviewed_at).toLocaleDateString("es", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    )}
                  </li>
                );
              })}
          </ul>
          <p className="mt-4 text-[13px] text-mute">
            La cuota volvió a quedar pendiente. Puedes corregir lo que indica el
            motivo y volver a registrarla abajo.
          </p>
        </div>
      )}

      {/* Pendientes accionables (con selección múltiple) */}
      {actionableInvoices.length > 0 && (
        <div className="rounded-2xl bg-card border border-border p-6">
          <div className="mb-4">
            <p className="font-meta text-mute">CUOTAS PENDIENTES</p>
            <p className="mt-2 text-[15px] font-medium text-marine-deep">
              {actionableInvoices.length} pendiente{actionableInvoices.length !== 1 ? "s" : ""} de pago
            </p>
          </div>
          <PendingInvoices
            invoices={actionableInvoices}
            rate={rate}
            today={hoy}
            bankAccounts={bankAccounts}
          />
        </div>
      )}

      {/* Historial */}
      {paidInvoices.length > 0 && (
        <div className="rounded-2xl bg-card border border-border p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="font-meta text-mute">HISTORIAL</p>
              <p className="mt-2 text-[15px] font-medium text-marine-deep">
                {paidInvoices.length} cuota{paidInvoices.length !== 1 ? "s" : ""} pagada{paidInvoices.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <div className="space-y-3">
            {paidInvoices.map((invoice) => {
              const pago = pagos.get(invoice.id);
              return (
                <InvoiceRow
                  key={invoice.id}
                  invoice={invoice}
                  rate={rate}
                  today={hoy}
                  payment={
                    pago
                      ? {
                          paid_at: pago.paid_at,
                          reviewed_at: pago.reviewed_at,
                          payment_method: pago.payment_method,
                          reference: pago.reference,
                          receipt_url: urlFirmadaPorTx.get(pago.transaction_id) ?? null,
                          amount_bs: pago.amount_bs,
                          exchange_rate: pago.exchange_rate,
                        }
                      : undefined
                  }
                />
              );
            })}
          </div>
        </div>
      )}

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
