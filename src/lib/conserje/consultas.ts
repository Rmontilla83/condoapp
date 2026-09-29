import { createAdminClient } from "@/lib/supabase/admin";
import { isInvoiceOverdue, todayInTimeZone, zonedToISO } from "@/lib/utils";
import { saldosPorUnidad } from "@/lib/saldos";
import { PAYMENT_METHOD_LABELS } from "@/lib/labels";
import { NOMBRE_CATEGORIA } from "@/lib/servicios";
import type { BankAccount } from "@/types/database";
import { hora12 } from "@/lib/format";

/**
 * Lo que el conserje sabe de QUIÉN pregunta. Se arma en el servidor a partir de
 * la sesión (ver `armarContexto` en conserje.ts) y las consultas lo reciben por
 * cierre, nunca como argumento.
 *
 * Esa es la garantía de privacidad: ninguna consulta acepta un id de unidad, de
 * persona ni de organización. Ni el modelo ni el modo demo pueden pedir la deuda
 * del 4-5 aunque se lo pidan, porque no hay por dónde pasárselo. Por eso usan el
 * cliente admin (sin RLS): el filtro está en el código, explícito, y no depende
 * del rol de quien pregunta — un super_admin viendo como residente tendría la
 * RLS abierta a todo.
 */
export interface ConserjeContexto {
  profileId: string;
  orgId: string;
  timezone: string;
  /** Unidades cuyas cuotas puede ver (propietario, o inquilino con permiso). */
  unidadesConCuotas: string[];
  /** Todas sus unidades activas, con o sin permiso de cuotas. */
  unidades: { id: string; etiqueta: string; block: string | null; rol: "owner" | "tenant" }[];
}

const r2 = (n: number) => Math.round(n * 100) / 100;

export function consultasDelConserje(ctx: ConserjeContexto) {
  const db = createAdminClient();
  const etiqueta = new Map(ctx.unidades.map((u) => [u.id, u.etiqueta]));

  async function tasaBcv() {
    const { data } = await db
      .from("exchange_rates")
      .select("rate, effective_date")
      .eq("organization_id", ctx.orgId)
      .order("effective_date", { ascending: false })
      .limit(1)
      .maybeSingle();
    const rate = Number(data?.rate) || null;
    return rate ? { bs_por_usd: rate, fecha: data?.effective_date as string } : null;
  }

  async function estadoDeCuenta() {
    if (ctx.unidadesConCuotas.length === 0) {
      return {
        sin_acceso: true as const,
        motivo:
          ctx.unidades.length === 0
            ? "La persona no está vinculada a ninguna unidad."
            : "Es inquilino y el propietario no le dio permiso para ver las cuotas.",
      };
    }

    const [{ data: cuotas }, tasa, saldos, { data: movSaldo }] = await Promise.all([
      db
        .from("invoices")
        .select("id, unit_id, description, amount, currency, due_date, status")
        .eq("organization_id", ctx.orgId)
        .in("unit_id", ctx.unidadesConCuotas)
        .in("status", ["pending", "overdue"])
        .order("due_date"),
      tasaBcv(),
      saldosPorUnidad(db, ctx.unidadesConCuotas),
      db
        .from("unit_credits")
        .select("amount, kind, note, created_at")
        .in("unit_id", ctx.unidadesConCuotas)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    const ids = (cuotas ?? []).map((c) => c.id as string);
    const { data: enRevision } = ids.length
      ? await db
          .from("transactions")
          .select("invoice_id, amount, currency, paid_at")
          .in("invoice_id", ids)
          .eq("status", "pending")
      : { data: [] };
    const idsEnRevision = new Set((enRevision ?? []).map((t) => t.invoice_id as string));

    const hoy = todayInTimeZone(ctx.timezone);
    const lista = (cuotas ?? []).map((c) => ({
      unidad: etiqueta.get(c.unit_id as string) ?? "",
      concepto: c.description as string,
      monto: Number(c.amount),
      moneda: c.currency as string,
      vence: c.due_date as string,
      vencida: isInvoiceOverdue({ status: c.status as string, due_date: c.due_date as string }, hoy),
      comprobante_en_revision: idsEnRevision.has(c.id as string),
    }));
    const total = r2(lista.reduce((s, c) => s + c.monto, 0));
    const porPagar = r2(lista.filter((c) => !c.comprobante_en_revision).reduce((s, c) => s + c.monto, 0));
    const saldoAFavor = r2([...saldos.values()].reduce((s, v) => s + Math.max(v, 0), 0));

    return {
      sin_acceso: false as const,
      tasa_bcv: tasa,
      total_pendiente_usd: total,
      por_pagar_usd: porPagar,
      por_pagar_bs: tasa ? r2(porPagar * tasa.bs_por_usd) : null,
      saldo_a_favor_usd: saldoAFavor,
      movimientos_de_saldo: (movSaldo ?? []).map((m) => ({
        monto: Number(m.amount),
        tipo:
          m.kind === "applied" ? "aplicado a una cuota"
          : m.kind === "deposit" ? "saldo registrado"
          : m.kind === "reversal" ? "devuelto por cuota anulada"
          : "corrección",
        detalle: m.note as string | null,
        fecha: m.created_at as string,
      })),
      cuotas: lista,
      pagos_en_revision: (enRevision ?? []).map((t) => ({
        monto: Number(t.amount),
        moneda: t.currency as string,
        reportado: t.paid_at as string,
      })),
    };
  }

  async function historialDePagos() {
    if (ctx.unidadesConCuotas.length === 0) return { sin_acceso: true as const, pagos: [] };
    const { data } = await db
      .from("transactions")
      .select("amount, currency, payment_method, reference, paid_at, reviewed_at, status, invoices!inner(unit_id, description, organization_id)")
      .eq("invoices.organization_id", ctx.orgId)
      .in("invoices.unit_id", ctx.unidadesConCuotas)
      .in("status", ["approved", "rejected"])
      .order("paid_at", { ascending: false })
      .limit(12);
    type Fila = {
      amount: number; currency: string; payment_method: string; reference: string | null;
      paid_at: string; status: string; invoices: { unit_id: string; description: string };
    };
    return {
      sin_acceso: false as const,
      pagos: ((data ?? []) as unknown as Fila[]).map((t) => ({
        unidad: etiqueta.get(t.invoices.unit_id) ?? "",
        concepto: t.invoices.description,
        monto: Number(t.amount),
        moneda: t.currency,
        metodo: PAYMENT_METHOD_LABELS[t.payment_method] ?? t.payment_method,
        referencia: t.reference,
        fecha: t.paid_at,
        estado: t.status === "approved" ? "aprobado" : "rechazado",
      })),
    };
  }

  async function miUnidad() {
    if (ctx.unidades.length === 0) return { unidades: [] };
    const ids = ctx.unidades.map((u) => u.id);
    const [{ data: units }, { data: totales }] = await Promise.all([
      db.from("units").select("id, unit_number, block, floor, type, aliquot, area_sqm").in("id", ids),
      db.from("units").select("aliquot").eq("organization_id", ctx.orgId),
    ]);
    const suma = (totales ?? []).reduce((s, u) => s + (Number(u.aliquot) || 0), 0);
    const rol = new Map(ctx.unidades.map((u) => [u.id, u.rol]));
    return {
      suma_alicuotas_condominio: r2(suma),
      unidades: (units ?? []).map((u) => ({
        unidad: etiqueta.get(u.id as string),
        torre: u.block,
        piso: u.floor,
        tipo: u.type,
        alicuota_pct: u.aliquot === null ? null : Number(u.aliquot),
        metros_cuadrados: u.area_sqm,
        tu_rol: rol.get(u.id as string) === "owner" ? "propietario" : "inquilino",
      })),
    };
  }

  async function comoPagar() {
    const { data: org } = await db.from("organizations").select("bank_accounts").eq("id", ctx.orgId).single();
    const cuentas = (Array.isArray(org?.bank_accounts) ? (org.bank_accounts as BankAccount[]) : [])
      .filter((c) => c.active)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((c) => ({
        nombre: c.label,
        tipo: c.kind,
        banco: c.bank_name,
        numero: c.account_number,
        tipo_cuenta: c.account_type ?? null,
        titular: c.holder_name,
        rif_o_cedula: c.holder_id ?? null,
        telefono_o_dato_extra: c.extra ?? null,
        moneda: c.currency,
        instrucciones: c.instructions ?? null,
      }));
    return {
      cuentas,
      como_reportar_en_la_app:
        "En Pagos, se eligen las cuotas y se toca «Reportar pago»: monto, número de referencia y captura del comprobante. La administración lo revisa y lo aprueba, o lo rechaza con el motivo.",
    };
  }

  async function areasComunes() {
    const { data } = await db
      .from("common_areas")
      .select("name, description, capacity, rules, max_reservations_per_week, max_duration_hours, min_advance_hours, max_advance_days")
      .eq("organization_id", ctx.orgId)
      .eq("is_active", true)
      .order("name");
    return {
      areas: data ?? [],
      como_reservar: "En la sección Reservas de la app.",
      reservas_bloqueadas_por_deuda: await bloqueoPorDeuda(),
    };
  }

  /**
   * Cuotas vencidas de sus unidades (sin pago reportado): con ellas no puede
   * reservar. Misma regla que src/lib/reservas/deuda.ts. Decírselo con tacto.
   */
  async function bloqueoPorDeuda(): Promise<{ cuotas: number; monto: number } | null> {
    const ids = ctx.unidades.map((u) => u.id);
    if (ids.length === 0) return null;
    const { data } = await db
      .from("invoices")
      .select("amount, transactions(status)")
      .in("unit_id", ids)
      .in("status", ["pending", "overdue"])
      .lt("due_date", todayInTimeZone(ctx.timezone));
    const vencidas = (data ?? []).filter(
      (c) => !((c.transactions ?? []) as { status: string }[]).some((t) => t.status === "pending"),
    );
    return vencidas.length ? { cuotas: vencidas.length, monto: r2(vencidas.reduce((s, c) => s + Number(c.amount), 0)) } : null;
  }

  async function disponibilidad(area: string, fecha: string) {
    // Comparación en JS y no con ilike: PostgREST traduce `*` a `%` y no hay
    // forma de escaparlo. Acepta coincidencia parcial ("playa" → "Playa").
    const { data: areas } = await db
      .from("common_areas")
      .select("id, name")
      .eq("organization_id", ctx.orgId)
      .eq("is_active", true);
    const norm = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").trim().toLowerCase();
    const buscado = norm(area);
    const lista = areas ?? [];
    const encontrada =
      lista.find((a) => norm(a.name as string) === buscado) ??
      lista.find((a) => norm(a.name as string).includes(buscado) || buscado.includes(norm(a.name as string)));
    if (!encontrada) {
      return { encontrada: false as const, areas_disponibles: lista.map((a) => a.name as string) };
    }

    let desde: string, hasta: string;
    try {
      desde = zonedToISO(fecha, "00:00", ctx.timezone);
      // Fin del día = medianoche siguiente, para no perder el minuto 23:59.
      hasta = new Date(Date.parse(zonedToISO(fecha, "23:59", ctx.timezone)) + 60_000).toISOString();
    } catch {
      return { encontrada: false as const, areas_disponibles: [], fecha_invalida: true };
    }

    const { data: reservas } = await db
      .from("reservations")
      .select("start_time, end_time")
      .eq("common_area_id", encontrada.id)
      .eq("status", "confirmed")
      .lt("start_time", hasta)
      .gt("end_time", desde)
      .order("start_time");

    const hora = (iso: string) => hora12(new Date(iso), ctx.timezone);

    return {
      encontrada: true as const,
      area: encontrada.name as string,
      fecha,
      reservas_bloqueadas_por_deuda: await bloqueoPorDeuda(),
      bloques_ocupados: (reservas ?? []).map((r) => ({
        desde: hora(r.start_time as string),
        hasta: hora(r.end_time as string),
      })),
    };
  }

  async function condominio() {
    const [{ data: org }, { count: unidades }] = await Promise.all([
      db
        .from("organizations")
        .select("name, address, city, contact_phone, contact_email, office_hours, concierge_notes, fee_mode, late_fee_pct, currency")
        .eq("id", ctx.orgId)
        .single(),
      db.from("units").select("id", { count: "exact", head: true }).eq("organization_id", ctx.orgId),
    ]);
    return {
      condominio: org?.name as string,
      direccion: [org?.address, org?.city].filter(Boolean).join(", ") || null,
      unidades: unidades ?? null,
      telefono: (org?.contact_phone as string) ?? null,
      correo: (org?.contact_email as string) ?? null,
      horario: (org?.office_hours as string) ?? null,
      notas_de_la_junta: (org?.concierge_notes as string) ?? null,
      como_se_calcula_la_cuota:
        org?.fee_mode === "by_aliquot"
          ? "Por alícuota: cada unidad paga su porcentaje del documento de condominio sobre el gasto del mes."
          : org?.fee_mode === "flat"
            ? "Monto fijo igual para todas las unidades."
            : "Según el tipo de unidad o montos definidos por la administración.",
      recargo_por_mora_pct: org?.late_fee_pct ? Number(org.late_fee_pct) : null,
      moneda: org?.currency as string,
    };
  }

  async function comunicados() {
    const esPropietario = ctx.unidades.some((u) => u.rol === "owner");
    const esInquilino = ctx.unidades.some((u) => u.rol === "tenant");
    const bloques = new Set(ctx.unidades.map((u) => u.block).filter(Boolean));
    const { data } = await db
      .from("announcements")
      .select("title, content, priority, target_audience, target_block, published_at")
      .eq("organization_id", ctx.orgId)
      .order("published_at", { ascending: false })
      .limit(20);
    const suyos = (data ?? []).filter((a) => {
      switch (a.target_audience) {
        case "all": return true;
        case "owners": return esPropietario;
        case "tenants": return esInquilino;
        case "specific_block": return bloques.has(a.target_block as string);
        default: return false;
      }
    });
    return {
      comunicados: suyos.slice(0, 8).map((a) => ({
        titulo: a.title as string,
        contenido: (a.content as string).slice(0, 1500),
        prioridad: a.priority as string,
        publicado: a.published_at as string,
      })),
    };
  }

  async function misSolicitudes() {
    const { data } = await db
      .from("maintenance_requests")
      .select("title, status, priority, created_at, estimated_date, resolved_at")
      .eq("organization_id", ctx.orgId)
      .eq("reported_by", ctx.profileId)
      .order("created_at", { ascending: false })
      .limit(8);
    const ESTADO: Record<string, string> = {
      new: "recibida", in_review: "en revisión", in_progress: "en proceso",
      resolved: "resuelta", cancelled: "cancelada",
    };
    return {
      solicitudes: (data ?? []).map((r) => ({
        titulo: r.title as string,
        estado: ESTADO[r.status as string] ?? (r.status as string),
        creada: r.created_at as string,
        fecha_estimada: r.estimated_date as string | null,
      })),
      como_reportar: "En la sección Mantenimiento: título, descripción y fotos.",
    };
  }

  async function directorioDeServicios(categoria?: string | null) {
    let q = db
      .from("service_providers")
      .select("category, name, phone, whatsapp, notes, recommended_by")
      .eq("organization_id", ctx.orgId)
      .eq("active", true)
      .order("name");
    if (categoria) q = q.eq("category", categoria);
    const { data } = await q.limit(30);
    return {
      aviso: "Proveedores recomendados, no contratados por el condominio: precio y garantía se acuerdan con ellos.",
      servicios: (data ?? []).map((s) => ({
        categoria: NOMBRE_CATEGORIA[s.category as string] ?? (s.category as string),
        nombre: s.name as string,
        telefono: (s.phone as string) ?? null,
        whatsapp: (s.whatsapp as string) || (s.phone as string) || null,
        detalle: (s.notes as string) ?? null,
        recomendado_por: (s.recommended_by as string) ?? null,
      })),
    };
  }

  async function misPaquetes() {
    if (ctx.unidades.length === 0) return { paquetes: [] };
    const { data } = await db
      .from("packages")
      .select("unit_id, description, carrier, received_at")
      .eq("organization_id", ctx.orgId)
      .in("unit_id", ctx.unidades.map((u) => u.id))
      .eq("status", "waiting")
      .order("received_at", { ascending: false });
    return {
      paquetes: (data ?? []).map((p) => ({
        unidad: etiqueta.get(p.unit_id as string) ?? "",
        que: p.description as string,
        empresa: (p.carrier as string) ?? null,
        llego: p.received_at as string,
      })),
      donde: "Se retiran en la garita.",
    };
  }

  return {
    misPaquetes,
    directorioDeServicios,
    tasaBcv, estadoDeCuenta, historialDePagos, miUnidad, comoPagar, areasComunes,
    disponibilidad, condominio, comunicados, misSolicitudes, bloqueoPorDeuda,
  };
}

export type Consultas = ReturnType<typeof consultasDelConserje>;
