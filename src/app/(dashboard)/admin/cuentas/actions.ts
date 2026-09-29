"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/queries";
import { requireAdmin } from "@/lib/permissions";
import { ESTADOS_ABIERTOS, pendienteDe } from "@/lib/cuotas";
import { calcularIntereses } from "@/lib/contabilidad/cobranza";
import { notificar, perfilesDeUnidad } from "@/lib/notificaciones";
import { todayInTimeZone, zonedToISO } from "@/lib/utils";
import { usd } from "@/lib/format";

type Resultado = { error: string } | { success: true; mensaje?: string };

const r2 = (n: number) => Math.round(n * 100) / 100;

async function admin() {
  const profile = await getCurrentProfile();
  const guard = requireAdmin(profile);
  if (guard) return { guard };
  const db = createAdminClient();
  const { data: org } = await db
    .from("organizations")
    .select("id, timezone, late_fee_pct")
    .eq("id", profile!.organization_id!)
    .single();
  return { profile: profile!, db, orgId: profile!.organization_id!, tz: (org?.timezone as string) || "America/Caracas", org };
}

async function unidadDelCondominio(db: ReturnType<typeof createAdminClient>, unitId: string, orgId: string) {
  const { data } = await db.from("units").select("id").eq("id", unitId).eq("organization_id", orgId).maybeSingle();
  return !!data;
}

/** Tasa BCV vigente en una fecha (la última publicada hasta ese día). */
async function tasaEn(db: ReturnType<typeof createAdminClient>, orgId: string, fecha: string): Promise<number | null> {
  const { data } = await db
    .from("exchange_rates")
    .select("rate")
    .eq("organization_id", orgId)
    .lte("effective_date", fecha)
    .order("effective_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ? Number(data.rate) : null;
}

function refrescar(unitId?: string) {
  revalidatePath("/admin/cuentas");
  if (unitId) revalidatePath(`/admin/cuentas/${unitId}`);
  revalidatePath("/admin");
  revalidatePath("/pagos");
  revalidatePath("/dashboard");
}

// ─── Pago recibido por la administración ─────────────────────────────────────

/**
 * Un pago que la administración recibió directamente (efectivo en la oficina,
 * una transferencia que el vecino no reportó). Se aplica a los recibos más
 * antiguos primero; lo que sobre queda como saldo a favor. Entra aprobado.
 */
export async function registrarPagoRecibido(fd: FormData): Promise<Resultado> {
  const a = await admin();
  if ("guard" in a) return a.guard!;
  const { db, orgId, profile, tz } = a;

  const unitId = String(fd.get("unit_id") ?? "");
  const monto = r2(Number(String(fd.get("monto") ?? "").replace(",", ".")));
  const metodo = String(fd.get("metodo") ?? "transfer");
  const referencia = String(fd.get("referencia") ?? "").trim().slice(0, 60) || null;
  const fecha = String(fd.get("fecha") ?? "") || todayInTimeZone(tz);
  const nota = String(fd.get("nota") ?? "").trim().slice(0, 200) || null;

  if (!(await unidadDelCondominio(db, unitId, orgId))) return { error: "Esa unidad no es de este condominio." };
  if (!(monto > 0)) return { error: "Escribe un monto mayor que cero." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || fecha > todayInTimeZone(tz)) return { error: "La fecha no puede ser futura." };
  if (metodo !== "cash" && !referencia) return { error: "Escribe la referencia bancaria: es lo que permite conciliar con el banco." };

  const { data: cuotas } = await db
    .from("invoices")
    .select("id, amount, paid_amount, currency, due_date, receipt_number, transactions(status)")
    .eq("unit_id", unitId)
    .in("status", [...ESTADOS_ABIERTOS])
    .order("due_date")
    .order("receipt_number", { nullsFirst: true });

  const tasa = await tasaEn(db, orgId, fecha);
  const cuando = zonedToISO(fecha, "12:00", tz);
  let resta = monto;
  const filas: Record<string, unknown>[] = [];
  for (const c of cuotas ?? []) {
    if (resta <= 0) break;
    // Una cuota con comprobante en revisión se salta: lo resuelve esa revisión.
    if (((c.transactions ?? []) as { status: string }[]).some((t) => t.status === "pending")) continue;
    const falta = pendienteDe(c);
    if (falta <= 0) continue;
    const aplica = r2(Math.min(resta, falta));
    filas.push({
      invoice_id: c.id,
      amount: aplica,
      currency: c.currency,
      payment_method: metodo,
      reference: referencia,
      paid_by: null,
      paid_at: cuando,
      status: "approved",
      reviewed_by: profile.id,
      reviewed_at: new Date().toISOString(),
      notes: nota ? `Registrado por la administración. ${nota}` : "Registrado por la administración",
      currency_paid: c.currency,
      exchange_rate: tasa,
      amount_bs: tasa ? r2(aplica * tasa) : null,
    });
    resta = r2(resta - aplica);
  }

  if (filas.length) {
    const { error } = await db.from("transactions").insert(filas);
    if (error) return { error: error.message };
  }
  if (resta > 0) {
    const { error } = await db.from("unit_credits").insert({
      organization_id: orgId,
      unit_id: unitId,
      amount: resta,
      kind: "deposit",
      note: `Pago recibido${referencia ? ` (ref. ${referencia})` : ""}: excedente sobre los recibos pendientes`,
      created_by: profile.id,
    });
    if (error) return { error: error.message };
  }

  await notificar(orgId, await perfilesDeUnidad(unitId), {
    tipo: "pago_revisado",
    titulo: `La administración registró tu pago de ${usd(monto)}`,
    cuerpo:
      resta > 0
        ? `Se aplicó a tus recibos pendientes y ${usd(resta)} quedó como saldo a favor.`
        : "Se aplicó a tus recibos pendientes, empezando por el más antiguo.",
    enlace: "/pagos",
    correo: false,
  });

  refrescar(unitId);
  return {
    success: true,
    mensaje:
      filas.length === 0
        ? `No había recibos pendientes: ${usd(monto)} quedó como saldo a favor.`
        : `Aplicado a ${filas.length} recibo${filas.length !== 1 ? "s" : ""}${resta > 0 ? `; ${usd(resta)} quedó como saldo a favor` : ""}.`,
  };
}

// ─── Anular un recibo ────────────────────────────────────────────────────────

export async function anularRecibo(invoiceId: string, motivo: string): Promise<Resultado> {
  const a = await admin();
  if ("guard" in a) return a.guard!;
  const { db, orgId, profile } = a;
  const m = motivo.replace(/\s+/g, " ").trim().slice(0, 200);
  if (m.length < 10) return { error: "Escribe el motivo (mínimo 10 caracteres). Queda en la nota de crédito." };

  const { data: cuota } = await db
    .from("invoices")
    .select("id, unit_id, organization_id")
    .eq("id", invoiceId)
    .eq("organization_id", orgId)
    .maybeSingle();
  if (!cuota) return { error: "Ese recibo no existe." };

  const { data, error } = await db.rpc("anular_recibos", { p_invoices: [invoiceId], p_actor: profile.id, p_motivo: m });
  if (error) return { error: error.message };
  const r = (data ?? {}) as { anuladas?: number; saltadas?: number };
  if (!r.anuladas) {
    return {
      error: r.saltadas
        ? "Este recibo tiene pagos en dinero aplicados: no se puede anular. Si el cobro estuvo mal, emite un ajuste en un recibo nuevo."
        : "Ese recibo ya estaba anulado.",
    };
  }
  refrescar(cuota.unit_id as string);
  return { success: true, mensaje: "Recibo anulado. Se emitió la nota de crédito." };
}

// ─── Convenios de pago ───────────────────────────────────────────────────────

export async function crearConvenio(fd: FormData): Promise<Resultado> {
  const a = await admin();
  if ("guard" in a) return a.guard!;
  const { db, orgId, profile, tz } = a;

  const unitId = String(fd.get("unit_id") ?? "");
  const total = r2(Number(String(fd.get("total") ?? "").replace(",", ".")));
  const cuotas = Math.round(Number(fd.get("cuotas")));
  const primera = String(fd.get("primera") ?? "");
  const notas = String(fd.get("notas") ?? "").trim().slice(0, 500) || null;

  if (!(await unidadDelCondominio(db, unitId, orgId))) return { error: "Esa unidad no es de este condominio." };
  if (!(total > 0)) return { error: "El total del convenio tiene que ser mayor que cero." };
  if (!(cuotas >= 2 && cuotas <= 36)) return { error: "El convenio va de 2 a 36 cuotas mensuales." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(primera) || primera < todayInTimeZone(tz)) {
    return { error: "La primera cuota tiene que ser hoy o una fecha futura." };
  }

  const { error } = await db.from("payment_plans").insert({
    organization_id: orgId,
    unit_id: unitId,
    total,
    installments: cuotas,
    first_due: primera,
    notes: notas,
    created_by: profile.id,
  });
  if (error) {
    return { error: error.code === "23505" ? "Esta unidad ya tiene un convenio activo." : error.message };
  }
  await notificar(orgId, await perfilesDeUnidad(unitId), {
    tipo: "recordatorio_pago",
    titulo: `Convenio de pago registrado: ${cuotas} cuotas de ${usd(r2(total / cuotas))}`,
    cuerpo: "Mientras cumplas el calendario, tu cuenta figura al día y puedes reservar las áreas comunes.",
    enlace: "/pagos",
    correo: false,
  });
  refrescar(unitId);
  return { success: true, mensaje: "Convenio registrado." };
}

export async function cerrarConvenio(planId: string, estado: "completed" | "cancelled", motivo: string): Promise<Resultado> {
  const a = await admin();
  if ("guard" in a) return a.guard!;
  const { db, orgId } = a;
  const m = motivo.trim().slice(0, 200);
  if (estado === "cancelled" && m.length < 5) return { error: "Escribe por qué se deja sin efecto el convenio." };
  const { data, error } = await db
    .from("payment_plans")
    .update({ status: estado, closed_at: new Date().toISOString(), closed_reason: m || null })
    .eq("id", planId)
    .eq("organization_id", orgId)
    .eq("status", "active")
    .select("unit_id")
    .maybeSingle();
  if (error) return { error: error.message };
  if (!data) return { error: "Ese convenio ya no está activo." };
  refrescar(data.unit_id as string);
  return { success: true };
}

// ─── Intereses de mora ───────────────────────────────────────────────────────

export async function guardarTasaMora(pct: number | null, acta: string): Promise<Resultado> {
  const a = await admin();
  if ("guard" in a) return a.guard!;
  if (pct !== null && !(pct >= 0 && pct <= 99)) return { error: "La tasa va de 0 a 99 % anual." };
  const actaLimpia = acta.trim().slice(0, 200);
  if (pct !== null && pct > 3 && actaLimpia.length < 5) {
    return { error: "Una tasa mayor al 3 % anual necesita el acta o el artículo del documento de condominio que la aprueba." };
  }
  const { error } = await a.db
    .from("organizations")
    .update({ late_fee_pct: pct, late_fee_acta: actaLimpia || null })
    .eq("id", a.orgId);
  if (error) return { error: error.message };
  revalidatePath("/admin/cuentas/intereses");
  return { success: true };
}

export async function emitirIntereses(params: {
  desde: string;
  hasta: string;
  vence: string;
  excluirConvenioAlDia: boolean;
}): Promise<Resultado> {
  const a = await admin();
  if ("guard" in a) return a.guard!;
  const { db, orgId, tz, org } = a;
  const tasaAnual = Number(org?.late_fee_pct ?? 0);
  if (!(tasaAnual > 0)) return { error: "Primero configura la tasa de interés de mora." };
  if (!(params.desde <= params.hasta) || params.hasta > todayInTimeZone(tz)) {
    return { error: "El período tiene que terminar hoy o antes, y empezar antes de terminar." };
  }
  if (!(params.vence >= todayInTimeZone(tz))) return { error: "El vencimiento de los recibos de interés no puede ser pasado." };

  const filas = (await calcularIntereses(db, orgId, { ...params, tasaAnual, hoy: todayInTimeZone(tz) })).filter(
    (f) => !f.excluida,
  );
  if (filas.length === 0) return { error: "No hay intereses que cobrar en ese período." };

  const [y, mo] = params.hasta.split("-");
  const concepto = `Intereses de mora ${mo}/${y}`;
  const tasa = await tasaEn(db, orgId, todayInTimeZone(tz));
  const { error } = await db.from("invoices").insert(
    filas.map((f) => ({
      organization_id: orgId,
      unit_id: f.unitId,
      amount: f.interes,
      currency: "USD",
      description: concepto,
      due_date: params.vence,
      status: "pending",
      kind: "interest",
      exchange_rate: tasa,
      amount_bs: tasa ? r2(f.interes * tasa) : null,
    })),
  );
  if (error) {
    return {
      error: error.code === "23505" ? `Ya se emitieron «${concepto}» con ese vencimiento.` : error.message,
    };
  }
  await db.from("auth_events").insert({
    organization_id: orgId,
    actor_id: a.profile.id,
    event: "late_fees_issued",
    payload: { ...params, tasa_anual: tasaAnual, unidades: filas.length, total: r2(filas.reduce((s, f) => s + f.interes, 0)) },
  });
  refrescar();
  return { success: true, mensaje: `Se emitieron ${filas.length} recibos de intereses.` };
}

/** Para la vista previa del cálculo (no escribe nada). */
export async function previsualizarIntereses(params: {
  desde: string;
  hasta: string;
  excluirConvenioAlDia: boolean;
}) {
  const a = await admin();
  if ("guard" in a) return a.guard!;
  const tasaAnual = Number(a.org?.late_fee_pct ?? 0);
  if (!(tasaAnual > 0)) return { error: "Primero configura la tasa de interés de mora." };
  const filas = await calcularIntereses(a.db, a.orgId, { ...params, tasaAnual, hoy: todayInTimeZone(a.tz) });
  return { filas, tasaAnual };
}
