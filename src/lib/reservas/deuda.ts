import { createAdminClient } from "@/lib/supabase/admin";
import { todayInTimeZone, DEFAULT_TIME_ZONE } from "@/lib/utils";
import { getEffectiveRole } from "@/lib/queries";
import { usd } from "@/lib/format";
import type { Profile } from "@/types/database";

export interface DeudaReserva {
  cuotas: number;
  monto: number;
}

/**
 * Cuotas VENCIDAS de las unidades del vecino en este condominio: lo que le
 * impide reservar áreas comunes (pedido de Rafael, 2026-09-29).
 *
 * - Solo cuenta lo vencido: la cuota del mes que todavía no vence no bloquea.
 * - Una cuota con el pago ya reportado (en revisión) no cuenta: el vecino hizo
 *   su parte y no se le castiga por lo que tarda la administración.
 * - La administración no tiene este límite.
 *
 * Devuelve null si puede reservar.
 */
export async function deudaQueImpideReservar(
  profile: Profile & { view_as?: string | null },
): Promise<DeudaReserva | null> {
  if (!profile.organization_id) return null;
  const rol = getEffectiveRole(profile);
  if (rol === "admin" || rol === "super_admin") return null;

  const db = createAdminClient();
  const [{ data: miembros }, { data: org }] = await Promise.all([
    db
      .from("unit_members")
      .select("unit_id, units!inner(organization_id)")
      .eq("profile_id", profile.id)
      .eq("active", true)
      .eq("units.organization_id", profile.organization_id),
    db.from("organizations").select("timezone").eq("id", profile.organization_id).maybeSingle(),
  ]);
  const unidades = (miembros ?? []).map((m) => m.unit_id as string);
  if (unidades.length === 0) return null;

  const hoy = todayInTimeZone((org?.timezone as string) || DEFAULT_TIME_ZONE);
  const { data: cuotas } = await db
    .from("invoices")
    .select("id, amount, transactions(status)")
    .in("unit_id", unidades)
    .in("status", ["pending", "overdue"])
    .lt("due_date", hoy);

  const vencidas = (cuotas ?? []).filter(
    (c) => !((c.transactions ?? []) as { status: string }[]).some((t) => t.status === "pending"),
  );
  if (vencidas.length === 0) return null;
  return { cuotas: vencidas.length, monto: vencidas.reduce((s, c) => s + Number(c.amount), 0) };
}

/** El mensaje, en un tono amable: se lee justo cuando el vecino quería reservar. */
export function mensajeDeudaReserva(d: DeudaReserva): string {
  const cuotas = d.cuotas === 1 ? "una cuota vencida" : `${d.cuotas} cuotas vencidas`;
  return (
    `Por ahora no podemos confirmar reservas para tu apartamento: tiene ${cuotas} por ${usd(d.monto)}. ` +
    "Apenas te pongas al día vas a poder reservar sin problema. Si ya pagaste, repórtalo en Pagos: " +
    "mientras la administración lo revisa, las reservas quedan habilitadas."
  );
}
