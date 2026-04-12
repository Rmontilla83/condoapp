"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const mockInvoices = [
  { id: "1", month: "Abril 2026", amount: 85.00, currency: "USD", status: "pending" as const, dueDate: "2026-04-15", description: "Cuota de mantenimiento" },
  { id: "2", month: "Marzo 2026", amount: 85.00, currency: "USD", status: "paid" as const, dueDate: "2026-03-15", description: "Cuota de mantenimiento", paidAt: "2026-03-12" },
  { id: "3", month: "Febrero 2026", amount: 85.00, currency: "USD", status: "paid" as const, dueDate: "2026-02-15", description: "Cuota de mantenimiento", paidAt: "2026-02-10" },
];

const statusConfig = {
  pending: { label: "Pendiente", variant: "outline" as const, className: "border-amber-300 text-amber-700 bg-amber-50" },
  paid: { label: "Pagado", variant: "outline" as const, className: "border-emerald-300 text-emerald-700 bg-emerald-50" },
  overdue: { label: "Vencido", variant: "outline" as const, className: "border-red-300 text-red-700 bg-red-50" },
};

export default function PagosPage() {
  const pendingTotal = mockInvoices
    .filter((i) => i.status === "pending")
    .reduce((sum, i) => sum + i.amount, 0);

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
            <p className="text-3xl font-bold text-primary">${pendingTotal.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">USD</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Último pago</p>
            <p className="text-3xl font-bold">$85.00</p>
            <p className="text-xs text-muted-foreground">12 Mar 2026</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Próximo vencimiento</p>
            <p className="text-3xl font-bold">15 Abr</p>
            <p className="text-xs text-muted-foreground">En 4 días</p>
          </CardContent>
        </Card>
      </div>

      {/* Botón de pago */}
      {pendingTotal > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="font-medium">Tienes un pago pendiente</p>
              <p className="text-sm text-muted-foreground">Cuota de Abril 2026 — ${pendingTotal.toFixed(2)} USD</p>
            </div>
            <Button size="lg">
              Pagar ${pendingTotal.toFixed(2)}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Historial */}
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">Todos</TabsTrigger>
          <TabsTrigger value="pending">Pendientes</TabsTrigger>
          <TabsTrigger value="paid">Pagados</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="mt-4 space-y-3">
          {mockInvoices.map((invoice) => (
            <InvoiceRow key={invoice.id} invoice={invoice} />
          ))}
        </TabsContent>
        <TabsContent value="pending" className="mt-4 space-y-3">
          {mockInvoices.filter((i) => i.status === "pending").map((invoice) => (
            <InvoiceRow key={invoice.id} invoice={invoice} />
          ))}
        </TabsContent>
        <TabsContent value="paid" className="mt-4 space-y-3">
          {mockInvoices.filter((i) => i.status === "paid").map((invoice) => (
            <InvoiceRow key={invoice.id} invoice={invoice} />
          ))}
        </TabsContent>
      </Tabs>

      {/* Desglose */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Desglose de cuota mensual</CardTitle>
          <CardDescription>En qué se distribuye tu pago</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span>Mantenimiento general</span>
              <span className="font-medium">$45.00</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Fondo de reserva</span>
              <span className="font-medium">$20.00</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Vigilancia</span>
              <span className="font-medium">$15.00</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Áreas comunes</span>
              <span className="font-medium">$5.00</span>
            </div>
            <div className="border-t pt-3 flex items-center justify-between font-medium">
              <span>Total</span>
              <span>$85.00</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function InvoiceRow({ invoice }: { invoice: typeof mockInvoices[number] }) {
  const config = statusConfig[invoice.status as keyof typeof statusConfig];
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div className="flex items-center gap-4">
          <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
            invoice.status === "paid" ? "bg-emerald-100" : "bg-amber-100"
          }`}>
            {invoice.status === "paid" ? (
              <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            ) : (
              <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>
          <div>
            <p className="text-sm font-medium">{invoice.description}</p>
            <p className="text-xs text-muted-foreground">{invoice.month}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-bold">${invoice.amount.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">{invoice.currency}</p>
          </div>
          <Badge variant={config.variant} className={config.className}>
            {config.label}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
