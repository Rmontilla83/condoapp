import {
  getCurrentProfile,
  getUserUnitIds,
  getInvoicesForUser,
  getFeeBreakdown,
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
  const [invoices, feeBreakdown] = await Promise.all([
    getInvoicesForUser(unitIds),
    getFeeBreakdown(profile.organization_id),
  ]);

  const pendingInvoices = invoices.filter((i) => i.status === "pending" || i.status === "overdue");
  const paidInvoices = invoices.filter((i) => i.status === "paid");
  const pendingTotal = pendingInvoices.reduce((sum, i) => sum + Number(i.amount), 0);
  const feeTotal = feeBreakdown.reduce((sum, f) => sum + Number(f.amount), 0);

  const lastPaid = paidInvoices[0];
  const nextDue = pendingInvoices.sort(
    (a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
  )[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pagos</h1>
        <p className="text-muted-foreground">Tu estado de cuenta y pagos realizados</p>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Saldo pendiente</p>
            <p className={`text-3xl font-bold ${pendingTotal > 0 ? "text-destructive" : "text-primary"}`}>
              ${pendingTotal.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground">USD</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Ultimo pago</p>
            {lastPaid ? (
              <>
                <p className="text-3xl font-bold">${Number(lastPaid.amount).toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">{lastPaid.description}</p>
              </>
            ) : (
              <p className="text-lg text-muted-foreground">Sin pagos</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Proximo vencimiento</p>
            {nextDue ? (
              <>
                <p className="text-3xl font-bold">
                  {new Date(nextDue.due_date).toLocaleDateString("es", { day: "numeric", month: "short" })}
                </p>
                <p className="text-xs text-muted-foreground">${Number(nextDue.amount).toFixed(2)} USD</p>
              </>
            ) : (
              <p className="text-lg text-muted-foreground">Sin pendientes</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alerta de pagos pendientes */}
      {pendingTotal > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <p className="font-medium">Tienes {pendingInvoices.length} cuota{pendingInvoices.length > 1 ? "s" : ""} pendiente{pendingInvoices.length > 1 ? "s" : ""}</p>
            <p className="text-sm text-muted-foreground">
              Total: ${pendingTotal.toFixed(2)} USD — Toca &ldquo;Reportar pago&rdquo; en cada cuota para enviar tu comprobante
            </p>
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
            invoices.map((invoice) => <InvoiceRow key={invoice.id} invoice={invoice} />)
          )}
        </CardContent>
      </Card>

      {/* Desglose */}
      {feeBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Desglose de cuota mensual</CardTitle>
            <CardDescription>En que se distribuye tu pago</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {feeBreakdown.map((fee) => (
                <div key={fee.id} className="flex items-center justify-between text-sm">
                  <span>{fee.concept}</span>
                  <span className="font-medium">${Number(fee.amount).toFixed(2)}</span>
                </div>
              ))}
              <div className="border-t pt-3 flex items-center justify-between font-medium">
                <span>Total</span>
                <span>${feeTotal.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

