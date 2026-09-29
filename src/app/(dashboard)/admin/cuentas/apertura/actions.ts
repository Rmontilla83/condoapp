"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/queries";
import { requireAdmin } from "@/lib/permissions";
import { claveUnidad, separarLinea } from "@/lib/contactos";
import { aplicarSaldos } from "@/lib/saldos";
import { todayInTimeZone } from "@/lib/utils";

export interface FilaApertura {
  linea: number;
  unidad: string;
  deuda: number;
  favor: number;
  estado: "ok" | "igual" | "error";
  detalle?: string;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/** «1.234,56», «1234.56», «$ 1,234.56» o vacío → número. */
function leerMonto(v: string): number | null {
  const t = v.replace(/[^\d.,-]/g, "");
  if (!t) return 0;
  let n: string;
  if (t.includes(",") && t.includes(".")) n = t.lastIndexOf(",") > t.lastIndexOf(".") ? t.replace(/\./g, "").replace(",", ".") : t.replace(/,/g, "");
  else if (t.includes(",")) n = /,\d{1,2}$/.test(t) ? t.replace(",", ".") : t.replace(/,/g, "");
  else n = t;
  const x = Number(n);
  return Number.isFinite(x) ? r2(x) : null;
}

const fechaLatina = (d: string) => d.split("-").reverse().join("/");

/**
 * Saldos de apertura: lo que cada unidad debía (o tenía a favor) al día en
 * que el condominio empezó con Atryum. La deuda entra como «Saldo anterior»
 * (sin número de recibo: no lo emitió Atryum); el saldo a favor, como abono.
 * Con `aplicar = false` solo dice qué pasaría.
 */
export async function procesarApertura(
  texto: string,
  fechaCorte: string,
  aplicar: boolean,
): Promise<{ error: string } | { filas: FilaApertura[]; aplicado: boolean }> {
  const profile = await getCurrentProfile();
  const guard = requireAdmin(profile);
  if (guard) return guard;
  const orgId = profile!.organization_id!;
  const db = createAdminClient();

  const { data: org } = await db.from("organizations").select("timezone").eq("id", orgId).single();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaCorte) || fechaCorte > todayInTimeZone((org?.timezone as string) || undefined)) {
    return { error: "La fecha de corte tiene que ser hoy o una fecha pasada." };
  }

  // ── Leer la planilla ──
  const lineas = texto.replace(/^﻿/, "").split(/\r?\n/);
  const primera = lineas.find((l) => l.trim()) ?? "";
  if (!primera) return { error: "La planilla está vacía." };
  const sep = primera.includes("\t") ? "\t" : (primera.match(/;/g)?.length ?? 0) >= (primera.match(/,/g)?.length ?? 0) ? ";" : ",";
  const cab = separarLinea(primera, sep).map((c) => c.toLowerCase());
  const col = (re: RegExp) => cab.findIndex((c) => re.test(c) && !/\d/.test(c));
  let iTorre = col(/^(torre|edificio|bloque)/);
  let iUnidad = col(/^(unidad|apto|apartamento|local)/);
  let iDeuda = col(/(deuda|debe|deudor|saldo pendiente|monto)/);
  let iFavor = col(/(favor|cr[eé]dito|anticipo)/);
  const conTitulos = iUnidad >= 0 && (iDeuda >= 0 || iFavor >= 0);
  if (!conTitulos) {
    // Sin títulos: Torre, Unidad, Deuda, Saldo a favor.
    [iTorre, iUnidad, iDeuda, iFavor] = [0, 1, 2, 3];
  }

  const { data: unidades } = await db.from("units").select("id, unit_number, block").eq("organization_id", orgId);
  const porClave = new Map((unidades ?? []).map((u) => [claveUnidad(u.block as string | null, u.unit_number as string), u]));

  const [{ data: aperturas }, { data: favores }] = await Promise.all([
    db.from("invoices").select("unit_id").eq("organization_id", orgId).eq("kind", "opening").neq("status", "cancelled"),
    db.from("unit_credits").select("unit_id").eq("organization_id", orgId).like("note", "Saldo de apertura%"),
  ]);
  const yaDeuda = new Set((aperturas ?? []).map((a) => a.unit_id as string));
  const yaFavor = new Set((favores ?? []).map((a) => a.unit_id as string));

  const filas: FilaApertura[] = [];
  const cargos: { unitId: string; deuda: number; favor: number }[] = [];
  const vistas = new Set<string>();
  lineas.forEach((l, i) => {
    if (!l.trim() || (conTitulos && l === primera)) return;
    const c = separarLinea(l, sep);
    const torre = iTorre >= 0 ? c[iTorre] ?? "" : "";
    const unidad = c[iUnidad] ?? "";
    const etiqueta = [torre, unidad].filter(Boolean).join(" · ");
    const deuda = iDeuda >= 0 ? leerMonto(c[iDeuda] ?? "") : 0;
    const favor = iFavor >= 0 ? leerMonto(c[iFavor] ?? "") : 0;
    const base = { linea: i + 1, unidad: etiqueta || "(sin unidad)", deuda: deuda ?? 0, favor: favor ?? 0 };
    if (deuda === null || favor === null) return filas.push({ ...base, estado: "error", detalle: "Monto ilegible" });
    if (deuda < 0 || favor < 0) return filas.push({ ...base, estado: "error", detalle: "Los montos van en positivo: la deuda en su columna y el saldo a favor en la suya" });
    const u = porClave.get(claveUnidad(torre, unidad));
    if (!u) return filas.push({ ...base, estado: "error", detalle: "No encontré esa unidad" });
    const id = u.id as string;
    base.unidad = `${u.block ? `${u.block as string} · ` : ""}${u.unit_number as string}`;
    if (vistas.has(id)) return filas.push({ ...base, estado: "error", detalle: "La unidad aparece dos veces en la planilla" });
    vistas.add(id);
    if (deuda === 0 && favor === 0) return filas.push({ ...base, estado: "igual", detalle: "Sin saldo" });
    if (deuda > 0 && yaDeuda.has(id)) return filas.push({ ...base, estado: "error", detalle: "Ya tiene saldo de apertura cargado" });
    if (favor > 0 && yaFavor.has(id)) return filas.push({ ...base, estado: "error", detalle: "Ya tiene saldo a favor de apertura" });
    filas.push({ ...base, estado: "ok" });
    cargos.push({ unitId: id, deuda, favor });
  });
  if (filas.length === 0) return { error: "No encontré filas con datos." };

  if (aplicar && cargos.length) {
    const { data: tasaRow } = await db
      .from("exchange_rates")
      .select("rate")
      .eq("organization_id", orgId)
      .lte("effective_date", fechaCorte)
      .order("effective_date", { ascending: false })
      .limit(1)
      .maybeSingle();
    const tasa = tasaRow ? Number(tasaRow.rate) : null;
    const deudas = cargos.filter((c) => c.deuda > 0);
    if (deudas.length) {
      const { error } = await db.from("invoices").insert(
        deudas.map((c) => ({
          organization_id: orgId,
          unit_id: c.unitId,
          amount: c.deuda,
          currency: "USD",
          description: `Saldo anterior al ${fechaLatina(fechaCorte)}`,
          due_date: fechaCorte,
          status: "pending",
          kind: "opening",
          exchange_rate: tasa,
          amount_bs: tasa ? r2(c.deuda * tasa) : null,
        })),
      );
      if (error) return { error: `No se pudo cargar la deuda: ${error.message}` };
    }
    const aFavor = cargos.filter((c) => c.favor > 0);
    if (aFavor.length) {
      const { error } = await db.from("unit_credits").insert(
        aFavor.map((c) => ({
          organization_id: orgId,
          unit_id: c.unitId,
          amount: c.favor,
          kind: "deposit",
          note: `Saldo de apertura a favor al ${fechaLatina(fechaCorte)}`,
          created_by: profile!.id,
        })),
      );
      if (error) return { error: `No se pudo cargar el saldo a favor: ${error.message}` };
    }
    // El saldo a favor se aplica a lo que la unidad deba, como siempre.
    await aplicarSaldos(db, aFavor.map((c) => c.unitId), profile!.id);
    await db.from("auth_events").insert({
      organization_id: orgId,
      actor_id: profile!.id,
      event: "opening_balances_loaded",
      payload: {
        fecha_corte: fechaCorte,
        unidades: cargos.length,
        deuda: r2(deudas.reduce((s, c) => s + c.deuda, 0)),
        favor: r2(aFavor.reduce((s, c) => s + c.favor, 0)),
      },
    });
    revalidatePath("/admin/cuentas");
    revalidatePath("/admin");
  }
  return { filas, aplicado: aplicar };
}
