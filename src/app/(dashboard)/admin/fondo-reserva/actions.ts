"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/queries";
import { requireAdmin } from "@/lib/permissions";
import { NOMBRE_FONDO, resumenFondo, type Fondo } from "@/lib/contabilidad/fondo-reserva";
import { registrarEvento } from "@/lib/historial";
import { usd } from "@/lib/format";

type Resultado = { error: string } | { success: true };

function refrescar() {
  revalidatePath("/admin/fondo-reserva");
  revalidatePath("/admin/libro");
  revalidatePath("/finanzas");
}

const fondoDe = (v: unknown): Fondo => (v === "contingencia" ? "contingencia" : "reserva");

export async function guardarConfigFondo(fondoCrudo: string, pct: number | null, acta: string): Promise<Resultado> {
  const fondo = fondoDe(fondoCrudo);
  const profile = await getCurrentProfile();
  const guard = requireAdmin(profile);
  if (guard) return guard;
  if (pct !== null && !(pct >= 0 && pct <= 100)) return { error: "El porcentaje va de 0 a 100." };
  const { error } = await createAdminClient()
    .from("organizations")
    .update(
      fondo === "contingencia"
        ? { contingency_fund_pct: pct, contingency_fund_acta: acta.trim().slice(0, 200) || null }
        : { reserve_fund_pct: pct, reserve_fund_acta: acta.trim().slice(0, 200) || null },
    )
    .eq("id", profile!.organization_id!);
  if (error) return { error: error.message };
  await registrarEvento({
    orgId: profile!.organization_id!,
    actorId: profile!.id,
    evento: "fund_config_updated",
    datos: { fondo: NOMBRE_FONDO[fondo], porcentaje: pct, acta: acta.trim().slice(0, 200) || null },
  });
  refrescar();
  revalidatePath("/admin");
  return { success: true };
}

export async function registrarMovimientoFondo(fd: FormData): Promise<Resultado> {
  const profile = await getCurrentProfile();
  const guard = requireAdmin(profile);
  if (guard) return guard;
  const orgId = profile!.organization_id!;

  const fondo = fondoDe(fd.get("fund"));
  const kind = String(fd.get("kind") ?? "");
  if (!["opening", "contribution", "adjustment"].includes(kind)) return { error: "Tipo de movimiento inválido." };
  const fecha = String(fd.get("movement_date") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return { error: "Indica la fecha." };
  const monto = Math.round(Number(String(fd.get("amount") ?? "").replace(",", ".")) * 100) / 100;
  if (!Number.isFinite(monto) || monto === 0) return { error: "Indica el monto en dólares." };
  if (kind !== "adjustment" && monto < 0) return { error: "Este monto debe ser positivo. Para restar, usa un ajuste." };
  const concepto = String(fd.get("concept") ?? "").trim().slice(0, 200);
  if (concepto.length < 3) return { error: "Escribe el concepto." };
  const referencia = String(fd.get("reference") ?? "").trim().slice(0, 200) || null;

  const db = createAdminClient();
  if (monto < 0) {
    const { saldo } = await resumenFondo(db, orgId, fondo);
    if (saldo + monto < 0) return { error: `El fondo tiene ${usd(saldo)}: el ajuste lo dejaría en negativo.` };
  }
  const { error } = await db.from("reserve_fund_movements").insert({
    organization_id: orgId,
    fund: fondo,
    kind,
    movement_date: fecha,
    amount: monto,
    concept: concepto,
    reference: referencia,
    created_by: profile!.id,
  });
  if (error) {
    return { error: error.code === "23505" ? "El saldo inicial ya está cargado. Anúlalo si necesitas corregirlo." : error.message };
  }
  await registrarEvento({
    orgId,
    actorId: profile!.id,
    evento: "fund_movement_recorded",
    datos: { fondo: NOMBRE_FONDO[fondo], tipo: kind, monto, concepto, soporte: referencia },
  });
  refrescar();
  return { success: true };
}

export async function anularMovimientoFondo(id: string, motivo: string): Promise<Resultado> {
  const profile = await getCurrentProfile();
  const guard = requireAdmin(profile);
  if (guard) return guard;
  const orgId = profile!.organization_id!;
  const razon = motivo.trim();
  if (razon.length < 10) return { error: "Escribe el motivo: al menos 10 caracteres." };

  const db = createAdminClient();
  const { data: mov } = await db
    .from("reserve_fund_movements")
    .select("amount, voided_at, fund, concept")
    .eq("id", id)
    .eq("organization_id", orgId)
    .maybeSingle();
  if (!mov) return { error: "Ese movimiento no existe." };
  if (mov.voided_at) return { error: "Ese movimiento ya está anulado." };
  const { saldo } = await resumenFondo(db, orgId, fondoDe(mov.fund));
  if (saldo - Number(mov.amount) < 0) return { error: `El fondo tiene ${usd(saldo)}: anularlo lo dejaría en negativo.` };

  const { error } = await db
    .from("reserve_fund_movements")
    .update({ voided_at: new Date().toISOString(), voided_reason: razon, voided_by: profile!.id })
    .eq("id", id)
    .eq("organization_id", orgId);
  if (error) return { error: error.message };
  await registrarEvento({
    orgId,
    actorId: profile!.id,
    evento: "fund_movement_voided",
    datos: { fondo: NOMBRE_FONDO[fondoDe(mov.fund)], monto: Number(mov.amount), concepto: mov.concept, motivo: razon },
  });
  refrescar();
  return { success: true };
}
