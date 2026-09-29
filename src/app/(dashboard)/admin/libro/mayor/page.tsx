import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/queries";
import { isAdminRole } from "@/lib/permissions";
import { fechaLarga, membreteDe } from "@/lib/documentos";
import { todayInTimeZone } from "@/lib/utils";
import { balanceDeComprobacion, GRUPOS_CUENTA, lineasDelLibro } from "@/lib/contabilidad/libro";
import { bs, usd } from "@/lib/format";
import { Documento } from "@/components/documentos/documento";
import { Pestanas, PESTANAS_CUENTAS } from "@/components/contabilidad/ui";
import { SelectorPeriodo } from "@/components/contabilidad/selector-periodo";

const corta = (d: string) =>
  new Date(`${d}T12:00:00Z`).toLocaleDateString("es-VE", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });

/**
 * Balance de comprobación del período y, al elegir una cuenta, su mayor:
 * saldo inicial, cada movimiento y el saldo corrido.
 */
export default async function MayorPage({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string; hasta?: string; moneda?: string; cuenta?: string }>;
}) {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return null;
  if (!isAdminRole(profile)) redirect("/dashboard");
  const orgId = profile.organization_id;
  const membrete = await membreteDe(orgId);
  const hoy = todayInTimeZone(membrete.timezone);
  const sp = await searchParams;
  const [y] = hoy.split("-").map(Number);
  const valida = (s?: string) => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null);
  const desde = valida(sp.desde) ?? `${y}-01-01`;
  const hasta = valida(sp.hasta) ?? hoy;
  const enBs = sp.moneda === "bs";
  const fmt = enBs ? bs : usd;
  const q = (extra: Record<string, string | undefined>) => {
    const p = new URLSearchParams({ desde, hasta, ...(enBs ? { moneda: "bs" } : {}) });
    for (const [k, v] of Object.entries(extra)) (v === undefined ? p.delete(k) : p.set(k, v));
    return `?${p.toString()}`;
  };

  const balance = await balanceDeComprobacion(orgId, desde, hasta);
  const cuenta = sp.cuenta ? balance.find((c) => c.cuenta === sp.cuenta) ?? null : null;
  const movimientos = cuenta ? (await lineasDelLibro(orgId, desde, hasta)).filter((l) => l.cuenta === cuenta.cuenta) : [];

  const v = (c: (typeof balance)[number], campo: "inicial" | "debe" | "haber" | "final") =>
    enBs ? c[`${campo}Bs` as const] : c[`${campo}Usd` as const];
  const grupos = Object.entries(GRUPOS_CUENTA)
    .map(([g, nombre]) => ({ g, nombre, cuentas: balance.filter((c) => c.cuenta.startsWith(`${g}.`)) }))
    .filter((x) => x.cuentas.length);
  const suma = (campo: "debe" | "haber") => balance.reduce((s, c) => s + v(c, campo), 0);
  const ingresos = -balance.filter((c) => c.cuenta.startsWith("4.")).reduce((s, c) => s + v(c, "debe") - v(c, "haber"), 0);
  const gastos = balance.filter((c) => c.cuenta.startsWith("5.")).reduce((s, c) => s + v(c, "debe") - v(c, "haber"), 0);
  const cambiario = -balance.filter((c) => c.cuenta.startsWith("7.")).reduce((s, c) => s + v(c, "debe") - v(c, "haber"), 0);

  let corrido = cuenta ? v(cuenta, "inicial") : 0;

  return (
    <div className="space-y-6">
      <div className="space-y-6 print:hidden">
        <Pestanas items={PESTANAS_CUENTAS} actual="/admin/libro/mayor" />
        <div className="flex flex-wrap items-end justify-between gap-3">
          <SelectorPeriodo desde={desde} hasta={hasta} hoy={hoy} />
          <div className="flex rounded-full border border-border p-0.5 text-[13px]">
            <Link href={q({ moneda: undefined })} className={`rounded-full px-3 py-1 ${!enBs ? "bg-marine-deep text-frost" : "text-marine-deep"}`}>
              Dólares
            </Link>
            <Link href={q({ moneda: "bs" })} className={`rounded-full px-3 py-1 ${enBs ? "bg-marine-deep text-frost" : "text-marine-deep"}`}>
              Bolívares
            </Link>
          </div>
        </div>
      </div>

      {cuenta ? (
        <Documento
          membrete={membrete}
          tipo="Mayor de la cuenta"
          numero={`${cuenta.cuenta} ${cuenta.nombre}`}
          fecha={`${corta(desde)} al ${corta(hasta)}`}
          ancho="max-w-5xl"
          acciones={
            <Link href={q({ cuenta: undefined })} className="inline-flex h-9 items-center rounded-lg border border-border px-3.5 text-[13px] font-medium text-marine-deep hover:bg-frost">
              Volver al balance
            </Link>
          }
          pie={`Emitido el ${fechaLarga(hoy)}. Saldo = debe − haber.`}
        >
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="border-b border-marine-deep/30 text-left text-[10.5px] uppercase tracking-[0.06em] text-mute">
                <th className="py-2 pr-2 font-medium">Fecha</th>
                <th className="py-2 pr-2 font-medium">Documento</th>
                <th className="py-2 pr-2 font-medium">Concepto</th>
                <th className="py-2 pl-2 text-right font-medium">Debe</th>
                <th className="py-2 pl-2 text-right font-medium">Haber</th>
                <th className="py-2 pl-2 text-right font-medium">Saldo</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border bg-frost/60">
                <td colSpan={5} className="py-1.5 pr-2 font-medium">Saldo inicial al {corta(desde)}</td>
                <td className="py-1.5 pl-2 text-right font-medium tabular-nums">{fmt(corrido)}</td>
              </tr>
              {movimientos.map((l, i) => {
                const d = enBs ? l.debe_bs : l.debe_usd;
                const h = enBs ? l.haber_bs : l.haber_usd;
                corrido = Math.round((corrido + d - h) * 100) / 100;
                return (
                  <tr key={i} className="border-b border-border break-inside-avoid">
                    <td className="py-1.5 pr-2 whitespace-nowrap">{corta(l.fecha)}</td>
                    <td className="py-1.5 pr-2 whitespace-nowrap">{l.documento}</td>
                    <td className="py-1.5 pr-2 text-mute">{l.descripcion}</td>
                    <td className="py-1.5 pl-2 text-right tabular-nums">{d ? fmt(d) : ""}</td>
                    <td className="py-1.5 pl-2 text-right tabular-nums">{h ? fmt(h) : ""}</td>
                    <td className="py-1.5 pl-2 text-right tabular-nums">{fmt(corrido)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} className="pt-3 text-right font-meta text-mute">MOVIMIENTOS Y SALDO FINAL</td>
                <td className="pt-3 pl-2 text-right tabular-nums">{fmt(v(cuenta, "debe"))}</td>
                <td className="pt-3 pl-2 text-right tabular-nums">{fmt(v(cuenta, "haber"))}</td>
                <td className="pt-3 pl-2 text-right font-display text-[15px] tabular-nums">{fmt(v(cuenta, "final"))}</td>
              </tr>
            </tfoot>
          </table>
        </Documento>
      ) : (
        <Documento
          membrete={membrete}
          tipo="Balance de comprobación"
          numero={`${corta(desde)} al ${corta(hasta)}`}
          fecha={`En ${enBs ? "bolívares" : "dólares"}`}
          ancho="max-w-5xl"
          pie={`Emitido el ${fechaLarga(hoy)}. Saldo inicial: todo lo anterior al ${corta(desde)}. Toca una cuenta para ver su mayor.`}
        >
          <div className="grid grid-cols-3 gap-3">
            {[
              ["INGRESOS DEL PERÍODO", ingresos],
              ["GASTOS DEL PERÍODO", gastos],
              ["RESULTADO", ingresos - gastos + cambiario],
            ].map(([t, x]) => (
              <div key={t as string} className="rounded-xl bg-frost px-3 py-2.5">
                <p className="font-meta text-mute">{t}</p>
                <p className={`mt-1 font-display text-[17px] tabular-nums ${(x as number) < 0 ? "text-destructive" : ""}`}>{fmt(x as number)}</p>
              </div>
            ))}
          </div>
          <table className="mt-7 w-full text-[12.5px]">
            <thead>
              <tr className="border-b border-marine-deep/30 text-left text-[10.5px] uppercase tracking-[0.06em] text-mute">
                <th className="py-2 pr-2 font-medium">Cuenta</th>
                <th className="py-2 pl-2 text-right font-medium">Saldo inicial</th>
                <th className="py-2 pl-2 text-right font-medium">Debe</th>
                <th className="py-2 pl-2 text-right font-medium">Haber</th>
                <th className="py-2 pl-2 text-right font-medium">Saldo final</th>
              </tr>
            </thead>
            {grupos.map((gr) => (
              <tbody key={gr.g}>
                <tr>
                  <td colSpan={5} className="pt-4 pb-1 font-meta text-cyan-ink">
                    {gr.nombre.toUpperCase()}
                  </td>
                </tr>
                {gr.cuentas.map((c) => (
                  <tr key={c.cuenta} className="border-b border-border">
                    <td className="py-1.5 pr-2">
                      <Link href={q({ cuenta: c.cuenta })} className="hover:underline">
                        <span className="font-mono text-[11px] text-mute">{c.cuenta}</span> {c.nombre}
                      </Link>
                    </td>
                    <td className="py-1.5 pl-2 text-right tabular-nums">{fmt(v(c, "inicial"))}</td>
                    <td className="py-1.5 pl-2 text-right tabular-nums">{fmt(v(c, "debe"))}</td>
                    <td className="py-1.5 pl-2 text-right tabular-nums">{fmt(v(c, "haber"))}</td>
                    <td className="py-1.5 pl-2 text-right font-medium tabular-nums">{fmt(v(c, "final"))}</td>
                  </tr>
                ))}
              </tbody>
            ))}
            <tfoot>
              <tr>
                <td className="pt-4 text-right font-meta text-mute">SUMAS {Math.abs(suma("debe") - suma("haber")) < 0.005 ? "· CUADRADO" : "· NO CUADRA"}</td>
                <td />
                <td className="pt-4 pl-2 text-right font-display text-[15px] tabular-nums">{fmt(suma("debe"))}</td>
                <td className="pt-4 pl-2 text-right font-display text-[15px] tabular-nums">{fmt(suma("haber"))}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </Documento>
      )}
    </div>
  );
}
