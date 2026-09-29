import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/queries";
import { isAdminRole } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { fechaLarga, membreteDe } from "@/lib/documentos";
import { todayInTimeZone } from "@/lib/utils";
import { usd } from "@/lib/format";
import { Documento } from "@/components/documentos/documento";
import { IconoCategoria } from "@/components/ui/icono";
import { Pestanas, PESTANAS_CUENTAS } from "@/components/contabilidad/ui";
import { SelectorPeriodo } from "@/components/contabilidad/selector-periodo";

const r2 = (n: number) => Math.round(n * 100) / 100;
const corta = (d: string) =>
  new Date(`${d}T12:00:00Z`).toLocaleDateString("es-VE", { day: "2-digit", month: "2-digit", timeZone: "UTC" });

/**
 * Relación de gastos del período: lo que se presenta en asamblea. Gastos por
 * categoría con su soporte, y al lado lo facturado y lo cobrado, para que la
 * junta vea en una hoja de dónde salió y a dónde fue el dinero.
 */
export default async function RelacionDeGastosPage({ searchParams }: { searchParams: Promise<{ desde?: string; hasta?: string }> }) {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return null;
  if (!isAdminRole(profile)) redirect("/dashboard");
  const orgId = profile.organization_id;
  const membrete = await membreteDe(orgId);
  const hoy = todayInTimeZone(membrete.timezone);

  const sp = await searchParams;
  const [y, m] = hoy.split("-").map(Number);
  const iniMes = new Date(Date.UTC(y, m - 1, 1)).toISOString().slice(0, 10);
  const valida = (s?: string) => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null);
  const desde = valida(sp.desde) ?? iniMes;
  const hasta = valida(sp.hasta) ?? hoy;
  const hastaFin = new Date(Date.parse(`${hasta}T12:00:00Z`) + 86_400_000).toISOString().slice(0, 10);

  const db = createAdminClient();
  const [{ data: gastos }, { data: cats }, { data: tasas }, { data: cuotas }, { data: pagos }, { data: notas }] = await Promise.all([
    db
      .from("expense_records")
      .select("id, description, amount, currency, expense_date, receipt_url, category_id, vendors(name)")
      .eq("organization_id", orgId)
      .is("voided_at", null)
      .gte("expense_date", desde)
      .lte("expense_date", hasta)
      .order("expense_date"),
    db.from("expense_categories").select("id, label, icon, position").eq("organization_id", orgId),
    db.from("exchange_rates").select("rate, effective_date").eq("organization_id", orgId).lte("effective_date", hasta).order("effective_date"),
    db
      .from("invoices")
      .select("amount, kind")
      .eq("organization_id", orgId)
      .neq("kind", "opening")
      .gte("created_at", desde)
      .lt("created_at", hastaFin),
    db
      .from("transactions")
      .select("amount, payment_method, invoices!inner(organization_id)")
      .eq("status", "approved")
      .neq("payment_method", "credit")
      .eq("invoices.organization_id", orgId)
      .gte("paid_at", desde)
      .lt("paid_at", hastaFin),
    db.from("credit_notes").select("amount").eq("organization_id", orgId).gte("created_at", desde).lt("created_at", hastaFin),
  ]);

  const tasaEn = (fecha: string) => {
    let t = 0;
    for (const r of tasas ?? []) if ((r.effective_date as string) <= fecha) t = Number(r.rate);
    return t;
  };
  const enUsd = (g: { amount: unknown; currency: unknown; expense_date: unknown }) => {
    if (g.currency === "USD") return Number(g.amount);
    const t = tasaEn(g.expense_date as string);
    return t > 0 ? r2(Number(g.amount) / t) : 0;
  };

  const porCat = new Map<string, { label: string; icon: string | null; pos: number; items: typeof gastos; total: number }>();
  for (const c of cats ?? []) porCat.set(c.id as string, { label: c.label as string, icon: c.icon as string | null, pos: Number(c.position ?? 99), items: [], total: 0 });
  for (const g of gastos ?? []) {
    const c = porCat.get(g.category_id as string) ?? { label: "Sin categoría", icon: null, pos: 999, items: [], total: 0 };
    c.items!.push(g);
    c.total = r2(c.total + enUsd(g));
    porCat.set((g.category_id as string) ?? "x", c);
  }
  const grupos = [...porCat.values()].filter((c) => c.items!.length).sort((a, b) => a.pos - b.pos);
  const gastado = r2(grupos.reduce((s, c) => s + c.total, 0));
  const facturado = r2((cuotas ?? []).reduce((s, c) => s + Number(c.amount), 0) - (notas ?? []).reduce((s, n) => s + Number(n.amount), 0));
  const cobrado = r2((pagos ?? []).reduce((s, p) => s + Number(p.amount), 0));
  const sinSoporte = (gastos ?? []).filter((g) => !g.receipt_url).length;

  return (
    <div className="space-y-6">
      <div className="print:hidden space-y-6">
        <Pestanas items={PESTANAS_CUENTAS} actual="/admin/informes/relacion-de-gastos" />
        <SelectorPeriodo desde={desde} hasta={hasta} hoy={hoy} />
      </div>
      <Documento
        membrete={membrete}
        tipo="Relación de gastos"
        numero={`${corta(desde)} al ${corta(hasta)}`}
        fecha={`Emitida el ${fechaLarga(hoy)}`}
        ancho="max-w-4xl"
        pie={
          <>
            Montos en dólares; los gastos en bolívares se convierten a la tasa BCV del día del gasto. Facturado: recibos emitidos en el
            período, menos notas de crédito. Cobrado: pagos aprobados en el período (sin saldo a favor aplicado).
            {sinSoporte > 0 && ` ${sinSoporte} gasto${sinSoporte !== 1 ? "s" : ""} sin factura adjunta.`}
          </>
        }
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["FACTURADO", facturado],
            ["COBRADO", cobrado],
            ["GASTADO", gastado],
            ["COBRADO − GASTADO", r2(cobrado - gastado)],
          ].map(([t, v]) => (
            <div key={t as string} className="rounded-xl bg-frost px-3 py-2.5">
              <p className="font-meta text-mute">{t}</p>
              <p className={`mt-1 font-display text-[17px] tabular-nums ${(v as number) < 0 ? "text-destructive" : ""}`}>{usd(v as number)}</p>
            </div>
          ))}
        </div>

        {grupos.length === 0 ? (
          <p className="mt-8 text-center text-[14px] text-mute">No hay gastos registrados en este período.</p>
        ) : (
          <table className="mt-7 w-full text-[12.5px]">
            <thead>
              <tr className="border-b border-marine-deep/30 text-left text-[10.5px] uppercase tracking-[0.06em] text-mute">
                <th className="py-2 pr-2 font-medium">Fecha</th>
                <th className="py-2 pr-2 font-medium">Concepto</th>
                <th className="py-2 pr-2 font-medium">Proveedor</th>
                <th className="py-2 pr-2 text-center font-medium">Soporte</th>
                <th className="py-2 pl-2 text-right font-medium">Monto</th>
              </tr>
            </thead>
            {grupos.map((c) => (
              <tbody key={c.label} className="break-inside-avoid">
                <tr>
                  <td colSpan={4} className="pt-4 pb-1.5 font-semibold">
                    <span className="inline-flex items-center gap-2">
                      <IconoCategoria icono={c.icon} className="h-4 w-4 text-cyan-ink" />
                      {c.label}
                    </span>
                  </td>
                  <td className="pt-4 pb-1.5 text-right font-semibold tabular-nums">{usd(c.total)}</td>
                </tr>
                {c.items!.map((g) => {
                  const v = (Array.isArray(g.vendors) ? g.vendors[0] : g.vendors) as { name: string } | null;
                  return (
                    <tr key={g.id as string} className="border-b border-border">
                      <td className="py-1.5 pr-2 whitespace-nowrap">{corta(g.expense_date as string)}</td>
                      <td className="py-1.5 pr-2">{g.description as string}</td>
                      <td className="py-1.5 pr-2 text-mute">{v?.name ?? "—"}</td>
                      <td className="py-1.5 pr-2 text-center">{g.receipt_url ? "Sí" : <span className="text-ember-ink">No</span>}</td>
                      <td className="py-1.5 pl-2 text-right tabular-nums">
                        {usd(enUsd(g))}
                        {g.currency !== "USD" && (
                          <span className="block text-[10.5px] text-mute">
                            {Number(g.amount).toLocaleString("es-VE", { minimumFractionDigits: 2 })} {g.currency as string}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            ))}
            <tfoot>
              <tr>
                <td colSpan={4} className="pt-4 text-right font-meta text-mute">
                  TOTAL DE GASTOS
                </td>
                <td className="pt-4 text-right font-display text-[18px] tabular-nums">{usd(gastado)}</td>
              </tr>
            </tfoot>
          </table>
        )}

        <div className="mt-14 grid grid-cols-2 gap-10 text-center text-[12px] text-mute print:mt-20">
          <div className="border-t border-marine-deep/40 pt-2">Administración</div>
          <div className="border-t border-marine-deep/40 pt-2">Junta de condominio</div>
        </div>
      </Documento>
    </div>
  );
}
