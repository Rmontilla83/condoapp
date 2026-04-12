import {
  getCurrentProfile,
  getUserUnitIds,
  getInvoicesForUser,
  getFeeBreakdown,
  getCurrentRate,
} from "@/lib/queries";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "Outfit, sans-serif" }}>Pagos</h1>
          <p className="text-muted-foreground">Tu estado de cuenta y pagos realizados</p>
        </div>
        {rate > 0 && (
          <div className="text-right">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tasa BCV</p>
            <p className="text-lg font-bold text-primary" style={{ fontFamily: "Outfit, sans-serif" }}>
              Bs {rate.toFixed(2)}/$
            </p>
            <p className="text-[10px] text-muted-foreground">{rateData.effective_date}</p>
          </div>
        )}
      </div>

      {/* Resumen dual currency */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Saldo pendiente</p>
            <p className={`text-2xl font-extrabold mt-1 ${pendingTotal > 0 ? "text-destructive" : "text-primary"}`} style={{ fontFamily: "Outfit, sans-serif" }}>
              ${pendingTotal.toFixed(2)}
            </p>
            {rate > 0 && pendingTotal > 0 && (
              <p className="text-sm text-muted-foreground">Bs {pendingTotalBs.toFixed(2)}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ultimo pago</p>
            {lastPaid ? (
              <>
                <p className="text-2xl font-extrabold mt-1" style={{ fontFamily: "Outfit, sans-serif" }}>${Number(lastPaid.amount).toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">{lastPaid.description}</p>
              </>
            ) : (
              <p className="text-lg text-muted-foreground mt-1">Sin pagos</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Proximo vencimiento</p>
            {nextDue ? (
              <>
                <p className="text-2xl font-extrabold mt-1" style={{ fontFamily: "Outfit, sans-serif" }}>
                  {new Date(nextDue.due_date).toLocaleDateString("es", { day: "numeric", month: "short" })}
                </p>
                <p className="text-xs text-muted-foreground">
                  ${Number(nextDue.amount).toFixed(2)}
                  {rate > 0 ? ` / Bs ${(Number(nextDue.amount) * rate).toFixed(2)}` : ""}
                </p>
              </>
            ) : (
              <p className="text-lg text-muted-foreground mt-1">Sin pendientes</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alerta + metodos de pago */}
      {pendingTotal > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <p className="font-medium">Tienes {pendingInvoices.length} cuota{pendingInvoices.length > 1 ? "s" : ""} pendiente{pendingInvoices.length > 1 ? "s" : ""}</p>
            <p className="text-sm text-muted-foreground mb-3">
              Total: ${pendingTotal.toFixed(2)}{rate > 0 ? ` (Bs ${pendingTotalBs.toFixed(2)})` : ""}
            </p>
            <div className="flex flex-wrap gap-2">
              <div className="inline-flex items-center gap-1.5 bg-white/80 rounded-lg px-3 py-1.5 text-xs font-medium border">
                <span className="h-2 w-2 rounded-full bg-blue-500" />
                Debito Inmediato (Bs)
              </div>
              <div className="inline-flex items-center gap-1.5 bg-white/80 rounded-lg px-3 py-1.5 text-xs font-medium border">
                <span className="h-2 w-2 rounded-full bg-purple-500" />
                Stripe (USD)
              </div>
              <div className="inline-flex items-center gap-1.5 bg-white/80 rounded-lg px-3 py-1.5 text-xs font-medium border">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Transferencia + comprobante
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Historial */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Historial de cuotas</CardTitle>
          <CardDescription>{invoices.length} cuotas registradas</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {invoices.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">No hay cuotas registradas</p>
          ) : (
            invoices.map((invoice) => (
              <InvoiceRow key={invoice.id} invoice={invoice} rate={rate} />
            ))
          )}
        </CardContent>
      </Card>

      {/* Desglose dual currency */}
      {feeBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Desglose de cuota mensual</CardTitle>
            <CardDescription>Referencia en USD — equivalente en Bs a tasa BCV</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {feeBreakdown.map((fee) => (
                <div key={fee.id} className="flex items-center justify-between text-sm">
                  <span>{fee.concept}</span>
                  <div className="text-right">
                    <span className="font-medium">${Number(fee.amount).toFixed(2)}</span>
                    {rate > 0 && (
                      <span className="text-xs text-muted-foreground ml-2">
                        Bs {(Number(fee.amount) * rate).toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              <div className="border-t pt-3 flex items-center justify-between font-medium">
                <span>Total</span>
                <div className="text-right">
                  <span>${feeTotal.toFixed(2)}</span>
                  {rate > 0 && (
                    <span className="text-sm text-muted-foreground ml-2">
                      Bs {(feeTotal * rate).toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
