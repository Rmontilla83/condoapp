import { notFound, redirect } from "next/navigation";
import { getCurrentProfile, getCurrentRate } from "@/lib/queries";
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

  if (invoice.status !== "paid") {
    redirect("/pagos");
  }

  const [pagoRes, orgRes, rateData] = await Promise.all([
    supabase
      .from("transactions")
      .select(
        "id, amount, amount_bs, currency_paid, exchange_rate, payment_method, reference, paid_at, reviewed_at, paid_by, profiles:paid_by(full_name)",
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

  // Autorización.
  //
  // Se incluye a QUIEN PAGÓ aunque ya no sea miembro activo de la unidad: el
  // caso de uso que motivó esta pieza es justamente el propietario que VENDIÓ
  // el apartamento y necesita demostrar que estaba solvente. Exigir membresía
  // activa dejaba afuera precisamente a quien más la necesita.
  // Membresía CON permiso: un inquilino al que el propietario le ocultó las
  // finanzas (can_see_fee=false) no puede sacar el comprobante de pago del
  // propietario, igual que no ve las cuotas en /pagos.
  const { data: miMembresia } = await supabase
    .from("unit_members")
    .select("role, permissions")
    .eq("unit_id", invoice.unit_id as string)
    .eq("profile_id", profile.id)
    .eq("active", true)
    .maybeSingle();

  const esMia =
    Boolean(miMembresia) &&
    (miMembresia!.role === "owner" ||
      (miMembresia!.permissions as { can_see_fee?: boolean } | null)?.can_see_fee !== false);

  const laPagueYo = pago?.paid_by === profile.id;
  const esAdminDelCondo =
    isAdminRole(profile) && invoice.organization_id === profile.organization_id;
  if (!esMia && !laPagueYo && !esAdminDelCondo) notFound();

  // Un documento probatorio no puede degradar en silencio a guiones: si no hay
  // transacción aprobada, no hay nada que certificar.
  if (!pago) {
    return (
      <div className="mx-auto max-w-2xl">
        <a href="/pagos" className="font-meta text-cyan-ink hover:text-marine-deep transition-colors">
          ← PAGOS
        </a>
        <div className="mt-6 rounded-2xl border border-ember/40 bg-ember/5 p-8">
          <p className="font-meta text-ember-ink">SIN REGISTRO DE PAGO VERIFICABLE</p>
          <p className="mt-3 text-[15px] text-marine-deep">
            Esta cuota figura como pagada, pero no tiene un comprobante aprobado en el sistema, así
            que no podemos emitir una constancia.
          </p>
          <p className="mt-2 text-[14px] text-mute">
            Suele pasar con cuotas cargadas manualmente por la administración. Pídeles que registren
            el comprobante para poder emitirla.
          </p>
        </div>
      </div>
    );
  }
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

  // El monto en bolívares y la tasa se derivan del MISMO hecho, o de ninguno.
  //
  // Antes el monto se ramificaba por `amount_bs` y la leyenda por
  // `exchange_rate`, que son columnas independientes: con una presente y la
  // otra NULL —combinación que existe en los datos sembrados— se imprimía un
  // monto guardado junto a la tasa de hoy, y los dos números no reconciliaban.
  const congelado =
    pago.exchange_rate != null && pago.amount_bs != null
      ? { tasa: Number(pago.exchange_rate), monto: Number(pago.amount_bs) }
      : null;

  const tasaHoy = Number(rateData?.rate) || 0;
  const equivalencia = congelado
    ? { ...congelado, referencial: false }
    : tasaHoy > 0
      ? { tasa: tasaHoy, monto: Number(invoice.amount) * tasaHoy, referencial: true }
      : null;

  const pagador =
    (Array.isArray(pago.profiles) ? pago.profiles[0] : pago.profiles) as
      | { full_name?: string }
      | null
      | undefined;

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
              {pago.id.slice(0, 8).toUpperCase()}
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
          <Fila label="FECHA DEL PAGO">{fmtFecha(pago.paid_at)}</Fila>
          {pago.reviewed_at && <Fila label="APROBADO EL">{fmtFecha(pago.reviewed_at)}</Fila>}
          <Fila label="MÉTODO">
            {PAYMENT_METHOD_LABELS[pago.payment_method] ?? pago.payment_method}
          </Fila>
          <Fila label="REFERENCIA">
            <span className="font-mono">{pago.reference || "—"}</span>
          </Fila>
          {pagador?.full_name && <Fila label="PAGADO POR">{pagador.full_name}</Fila>}
        </dl>

        <div className="py-6 space-y-2">
          <p className="font-meta text-mute">MONTO PAGADO</p>
          <p className="font-display text-[38px] leading-none tracking-[-0.03em] text-marine-deep tabular-nums">
            {invoice.currency as string} {Number(invoice.amount).toFixed(2)}
          </p>
          {equivalencia && (
            <p className="font-mono text-[14px] text-mute tabular-nums">
              Equivalente a Bs {equivalencia.monto.toFixed(2)} · tasa{" "}
              {equivalencia.tasa.toFixed(2)}
              {equivalencia.referencial
                ? " de hoy (referencial: este pago se registró antes de que la app guardara la tasa)"
                : " del día del pago"}
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
