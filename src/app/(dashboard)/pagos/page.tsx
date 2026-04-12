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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Invoice } from "@/types/database";

const statusConfig = {
  pending: { label: "Pendiente", className: "border-amber-300 text-amber-700 bg-amber-50" },
  paid: { label: "Pagado", className: "border-emerald-300 text-emerald-700 bg-emerald-50" },
  overdue: { label: "Vencido", className: "border-red-300 text-red-700 bg-red-50" },
  cancelled: { label: "Cancelado", className: "border-gray-300 text-gray-700 bg-gray-50" },
};

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

      {/* Boton de pago */}
      {pendingTotal > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="font-medium">Tienes pagos pendientes</p>
              <p className="text-sm text-muted-foreground">
                {pendingInvoices.length} cuota{pendingInvoices.length > 1 ? "s" : ""} — ${pendingTotal.toFixed(2)} USD
              </p>
            </div>
            <Button size="lg">Pagar ${pendingTotal.toFixed(2)}</Button>
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

function InvoiceRow({ invoice }: { invoice: Invoice }) {
  const config = statusConfig[invoice.status as keyof typeof statusConfig] ?? statusConfig.pending;
  const isPaid = invoice.status === "paid";
  const isOverdue = invoice.status === "overdue";

  return (
    <div className="flex items-center justify-between rounded-lg border p-4">
      <div className="flex items-center gap-4">
        <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
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
          <p className="text-xs text-muted-foreground">{invoice.currency}</p>
        </div>
        <Badge variant="outline" className={config.className}>
          {config.label}
        </Badge>
      </div>
    </div>
  );
}
