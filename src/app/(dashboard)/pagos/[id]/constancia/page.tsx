import { notFound, redirect } from "next/navigation";
import { getCurrentProfile, getUserUnitIds, getCurrentRate } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { isAdminRole } from "@/lib/permissions";
import { PAYMENT_METHOD_LABELS } from "@/lib/labels";
import { PrintButton } from "./print-button";
import type { Organization } from "@/types/database";

/**
 * Constancia de pago.
 *
 * Es lo que le piden al propietario cuando vende o alquila el apartamento, y
 * hasta ahora la app no tenía nada que darle: una cuota pagada mostraba el
 * badge "Pagado" y punto — sin fecha, sin referencia, sin monto en bolívares.
 *
 * Se renderiza como página imprimible en vez de generar un PDF: no agrega
 * dependencias, sale idéntica en cualquier dispositivo, y "Imprimir → Guardar
 * como PDF" es un gesto que la gente ya conoce.
 */
export default async function ConstanciaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const profile = await getCurrentProfile();
  if (!profile?.organization_id) redirect("/login");

  const supabase = await createClient();

  const { data: invoice } = await supabase
    .from("invoices")
    .select(
      "id, organization_id, unit_id, amount, currency, description, due_date, status, units(unit_number, block, type)",
    )
    .eq("id", id)
    .maybeSingle();

  if (!invoice) notFound();

  // Solo el propietario/inquilino de la unidad, o un admin del condominio.
  const misUnidades = await getUserUnitIds(profile.id);
  const esMia = misUnidades.includes(invoice.unit_id as string);
  const esAdminDelCondo =
    isAdminRole(profile) && invoice.organization_id === profile.organization_id;
  if (!esMia && !esAdminDelCondo) notFound();

  if (invoice.status !== "paid") {
    redirect("/pagos");
  }

  const [pagoRes, orgRes, rateData] = await Promise.all([
    supabase
      .from("transactions")
      .select(
        "id, amount, amount_bs, currency_paid, exchange_rate, payment_method, reference, paid_at, reviewed_at",
      )
      .eq("invoice_id", id)
      .eq("status", "approved")
      .order("paid_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("organizations")
      .select("*")
      .eq("id", invoice.organization_id)
      .single<Organization>(),
    getCurrentRate(invoice.organization_id as string),
  ]);

  const pago = pagoRes.data;
  const org = orgRes.data;
  const unidad = Array.isArray(invoice.units) ? invoice.units[0] : invoice.units;

  const zona = org?.timezone ?? "America/Caracas";
  const fmtFecha = (iso: string | null | undefined) =>
    iso
      ? new Date(iso).toLocaleDateString("es", {
          day: "2-digit",
          month: "long",
          year: "numeric",
          timeZone: zona,
        })
      : "—";

  // Si el pago no guardó su tasa (pagos anteriores a la migration 036), se
  // muestra la vigente y se dice explícitamente que es referencial.
  const tasaDelPago = pago?.exchange_rate ? Number(pago.exchange_rate) : null;
  const tasaReferencial = tasaDelPago === null ? Number(rateData?.rate) || 0 : 0;
  const montoBs =
    pago?.amount_bs != null
      ? Number(pago.amount_bs)
      : tasaReferencial > 0
        ? Number(invoice.amount) * tasaReferencial
        : 0;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="print:hidden mb-6 flex flex-wrap items-center justify-between gap-3">
        <a href="/pagos" className="font-meta text-cyan-ink hover:text-marine-deep transition-colors">
          ← PAGOS
        </a>
        <PrintButton />
      </div>

      <div className="rounded-2xl bg-card border border-border p-8 md:p-10 print:border-0 print:p-0">
        <div className="flex items-start justify-between gap-6 pb-6 border-b border-border">
          <div className="min-w-0">
            <p className="font-meta text-mute">CONSTANCIA DE PAGO</p>
            <h1 className="mt-3 font-display text-[26px] leading-tight tracking-[-0.02em] text-marine-deep">
              {org?.name ?? "Condominio"}
            </h1>
            {org?.address && <p className="mt-1 text-[13px] text-mute">{org.address}</p>}
          </div>
          <p className="font-meta text-mute shrink-0 text-right">
            N.º
            <br />
            <span className="font-mono text-marine-deep">
              {(pago?.id ?? invoice.id).slice(0, 8).toUpperCase()}
            </span>
          </p>
        </div>

        <dl className="py-6 space-y-4 border-b border-border">
          <Fila label="UNIDAD">
            {unidad?.unit_number ?? "—"}
            {unidad?.block ? ` · ${unidad.block}` : ""}
          </Fila>
          <Fila label="CONCEPTO">{invoice.description as string}</Fila>
          <Fila label="VENCIMIENTO">{fmtFecha(`${invoice.due_date}T12:00:00Z`)}</Fila>
          <Fila label="FECHA DEL PAGO">{fmtFecha(pago?.paid_at)}</Fila>
          {pago?.reviewed_at && <Fila label="APROBADO EL">{fmtFecha(pago.reviewed_at)}</Fila>}
          <Fila label="MÉTODO">
            {PAYMENT_METHOD_LABELS[pago?.payment_method ?? ""] ?? pago?.payment_method ?? "—"}
          </Fila>
          <Fila label="REFERENCIA">
            <span className="font-mono">{pago?.reference || "—"}</span>
          </Fila>
        </dl>

        <div className="py-6 space-y-2">
          <p className="font-meta text-mute">MONTO PAGADO</p>
          <p className="font-display text-[38px] leading-none tracking-[-0.03em] text-marine-deep tabular-nums">
            {invoice.currency as string} {Number(invoice.amount).toFixed(2)}
          </p>
          {montoBs > 0 && (
            <p className="font-mono text-[14px] text-mute tabular-nums">
              Bs {montoBs.toFixed(2)}
              {tasaDelPago
                ? ` · tasa ${tasaDelPago.toFixed(2)} del día del pago`
                : ` · tasa ${tasaReferencial.toFixed(2)} de hoy (referencial: este pago se registró antes de que la app guardara la tasa)`}
            </p>
          )}
        </div>

        <div className="pt-6 border-t border-border">
          <p className="text-[13px] text-mute leading-relaxed">
            Esta constancia certifica que la cuota descrita fue pagada y aprobada por la
            administración de {org?.name ?? "el condominio"}. Documento generado
            automáticamente por Atryum; su validez se puede verificar contra el registro de
            pagos del condominio.
          </p>
          <p className="mt-4 font-meta text-mute">
            EMITIDA EL {fmtFecha(new Date().toISOString())} · ATRYUM
          </p>
        </div>
      </div>
    </div>
  );
}

function Fila({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
      <dt className="font-meta text-mute w-36 shrink-0">{label}</dt>
      <dd className="text-[15px] text-marine-deep min-w-0">{children}</dd>
    </div>
  );
}
