import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/queries";
import { isAdminRole } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { SaldoForm } from "./saldo-form";

const TIPO: Record<string, string> = {
  deposit: "Saldo registrado",
  applied: "Aplicado a cuota",
  reversal: "Devuelto (cuota anulada)",
  adjustment: "Corrección",
};

export default async function SaldosPage() {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return null;
  if (!isAdminRole(profile)) redirect("/dashboard");
  const orgId = profile.organization_id;

  const db = createAdminClient();
  const [{ data: unidades }, { data: movimientos }] = await Promise.all([
    db
      .from("units")
      .select("id, unit_number, block")
      .eq("organization_id", orgId)
      .order("block")
      .order("unit_number"),
    db
      .from("unit_credits")
      .select("id, unit_id, amount, kind, note, created_at")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  const etiqueta = new Map(
    (unidades ?? []).map((u) => [
      u.id as string,
      u.block ? `${u.block} · ${u.unit_number}` : (u.unit_number as string),
    ]),
  );
  const saldos = new Map<string, number>();
  for (const m of movimientos ?? []) {
    const id = m.unit_id as string;
    saldos.set(id, Math.round(((saldos.get(id) ?? 0) + Number(m.amount)) * 100) / 100);
  }
  const conSaldo = [...saldos.entries()]
    .filter(([, s]) => s !== 0)
    .sort((a, b) => b[1] - a[1]);
  const total = conSaldo.reduce((s, [, v]) => s + v, 0);

  return (
    <div className="space-y-8">
      <div>
        <span className="font-meta-loose text-cyan-ink">ADMINISTRACIÓN</span>
        <h1 className="mt-4 font-display text-[clamp(1.75rem,3.5vw,2.5rem)] leading-[1.1] tracking-[-0.03em] text-marine-deep">
          Saldos a <em className="font-editorial">favor</em>
        </h1>
        <p className="mt-3 text-[15px] text-mute max-w-2xl">
          Pagos de más, saldos de apertura o reintegros. El saldo se descuenta solo de las cuotas
          pendientes de la unidad, la más vieja primero, y de cada cuota que emitas después.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="rounded-2xl bg-card border border-border p-6">
          <p className="font-meta text-mute mb-4">REGISTRAR</p>
          <SaldoForm
            unidades={(unidades ?? []).map((u) => ({
              id: u.id as string,
              etiqueta: etiqueta.get(u.id as string)!,
            }))}
          />
        </div>

        <div className="rounded-2xl bg-card border border-border p-6">
          <div className="flex items-baseline justify-between mb-4">
            <p className="font-meta text-mute">DISPONIBLE POR UNIDAD</p>
            <p className="font-display text-[20px] text-marine-deep tabular-nums">${total.toFixed(2)}</p>
          </div>
          {conSaldo.length === 0 ? (
            <p className="text-[14px] text-mute">
              Ninguna unidad tiene saldo sin aplicar. Cuando registres uno que alcance para sus
              cuotas, se consume en el acto y no aparece aquí.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {conSaldo.map(([id, s]) => (
                <li key={id} className="flex justify-between py-2 text-[14px]">
                  <span className="text-marine-deep">{etiqueta.get(id)}</span>
                  <span className="tabular-nums text-cyan-ink font-medium">${s.toFixed(2)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="rounded-2xl bg-card border border-border p-6">
        <p className="font-meta text-mute mb-4">MOVIMIENTOS</p>
        {(movimientos ?? []).length === 0 ? (
          <p className="text-[14px] text-mute">Todavía no hay movimientos.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[14px]">
              <thead>
                <tr className="text-left font-meta text-mute">
                  <th className="py-2 pr-4 font-normal">FECHA</th>
                  <th className="py-2 pr-4 font-normal">UNIDAD</th>
                  <th className="py-2 pr-4 font-normal">MOVIMIENTO</th>
                  <th className="py-2 pr-4 font-normal">DETALLE</th>
                  <th className="py-2 text-right font-normal">MONTO</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(movimientos ?? []).slice(0, 100).map((m) => (
                  <tr key={m.id as string}>
                    <td className="py-2 pr-4 text-mute whitespace-nowrap">
                      {new Date(m.created_at as string).toLocaleDateString("es-VE")}
                    </td>
                    <td className="py-2 pr-4 whitespace-nowrap">{etiqueta.get(m.unit_id as string)}</td>
                    <td className="py-2 pr-4 whitespace-nowrap">{TIPO[m.kind as string] ?? m.kind}</td>
                    <td className="py-2 pr-4 text-mute">{m.note}</td>
                    <td
                      className={`py-2 text-right tabular-nums whitespace-nowrap ${
                        Number(m.amount) > 0 ? "text-cyan-ink" : "text-marine-deep"
                      }`}
                    >
                      {Number(m.amount) > 0 ? "+" : "−"}${Math.abs(Number(m.amount)).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
