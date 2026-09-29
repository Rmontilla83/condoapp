import { conveniosActivos } from "@/lib/contabilidad/cobranza";
import { ESTADOS_ABIERTOS, estaAbierta, pendienteDe } from "@/lib/cuotas";
import { createAdminClient } from "@/lib/supabase/admin";
import { notificar, perfilesDeUnidad } from "@/lib/notificaciones";
import { usd } from "@/lib/format";
import { isInvoiceOverdue, todayInTimeZone } from "@/lib/utils";

/**
 * Recordatorios de pago (server-only, admin client).
 *
 * - `recordarMorosidad`: la administración lo dispara desde el panel, para
 *   todas las unidades morosas o para una. Un recordatorio por unidad por día.
 * - `recordatoriosAutomaticos`: el cron diario. Avisa 3 días antes de que
 *   venza una cuota y el día siguiente a que se vence, una sola vez cada cosa.
 *
 * Van por la campana y por correo (si el correo es entregable). WhatsApp no se
 * automatiza: sin la API de WhatsApp Business, el panel arma el mensaje y la
 * administración lo envía desde su teléfono.
 */

function hoyEn(tz: string) {
  return todayInTimeZone(tz || "America/Caracas");
}

export async function recordarMorosidad(orgId: string, soloUnidad?: string): Promise<{ unidades: number; avisados: number }> {
  const db = createAdminClient();
  const { data: org } = await db.from("organizations").select("timezone").eq("id", orgId).single();
  const hoy = hoyEn(org?.timezone as string);

  let q = db
    .from("invoices")
    .select("unit_id, amount, paid_amount, due_date, status, units(unit_number, block)")
    .eq("organization_id", orgId)
    .in("status", [...ESTADOS_ABIERTOS]);
  if (soloUnidad) q = q.eq("unit_id", soloUnidad);
  const { data: cuotas } = await q;

  const porUnidad = new Map<string, { total: number; n: number; etiqueta: string }>();
  for (const c of cuotas ?? []) {
    if (!isInvoiceOverdue({ status: c.status as string, due_date: c.due_date as string }, hoy)) continue;
    const u = (Array.isArray(c.units) ? c.units[0] : c.units) as { unit_number: string; block: string | null } | null;
    const k = c.unit_id as string;
    const v = porUnidad.get(k) ?? { total: 0, n: 0, etiqueta: u ? `${u.unit_number}${u.block ? ` · ${u.block}` : ""}` : "" };
    v.total += pendienteDe(c);
    v.n += 1;
    porUnidad.set(k, v);
  }

  // Quien cumple su convenio de pago no recibe recordatorios de morosidad.
  const convenios = await conveniosActivos(db, orgId, hoy);
  let avisados = 0;
  for (const [unitId, v] of porUnidad) {
    if (convenios.get(unitId)?.alDia) continue;
    const r = await notificar(orgId, await perfilesDeUnidad(unitId), {
      tipo: "recordatorio_pago",
      titulo: `Tienes ${v.n === 1 ? "una cuota vencida" : `${v.n} cuotas vencidas`}: ${usd(v.total)}`,
      cuerpo: `Apto ${v.etiqueta}. Puedes ver el detalle y reportar tu pago en Atryum. Si ya pagaste, ignora este aviso.`,
      enlace: "/pagos",
      destacado: { etiqueta: "Pendiente", valor: usd(v.total), tono: "alerta" },
      claveUnica: `morosidad:${unitId}:${hoy}`,
    });
    avisados += r.avisados;
  }
  return { unidades: porUnidad.size, avisados };
}

/** Cron diario: 3 días antes del vencimiento y el día después de vencida. */
export async function recordatoriosAutomaticos(): Promise<{ avisos: number }> {
  const db = createAdminClient();
  const { data: orgs } = await db.from("organizations").select("id, timezone").eq("is_active", true);
  let avisos = 0;

  for (const org of orgs ?? []) {
    const hoy = hoyEn(org.timezone as string);
    const d = (n: number) => {
      const f = new Date(`${hoy}T12:00:00Z`);
      f.setUTCDate(f.getUTCDate() + n);
      return f.toISOString().slice(0, 10);
    };
    const { data: cuotas } = await db
      .from("invoices")
      .select("id, unit_id, amount, paid_amount, due_date, description")
      .eq("organization_id", org.id)
      .in("status", [...ESTADOS_ABIERTOS])
      .in("due_date", [d(3), d(-1)]);

    // Las que ya tienen un comprobante en revisión no se recuerdan: ya pagaron.
    const ids = (cuotas ?? []).map((c) => c.id as string);
    const { data: enRevision } = ids.length
      ? await db.from("transactions").select("invoice_id").in("invoice_id", ids).eq("status", "pending")
      : { data: [] };
    const revisando = new Set((enRevision ?? []).map((t) => t.invoice_id as string));

    for (const c of cuotas ?? []) {
      if (revisando.has(c.id as string)) continue;
      const vence = c.due_date === d(3);
      const fecha = new Date(`${c.due_date as string}T12:00:00Z`).toLocaleDateString("es-VE", {
        day: "numeric",
        month: "long",
        timeZone: "UTC",
      });
      const r = await notificar(org.id as string, await perfilesDeUnidad(c.unit_id as string), {
        tipo: "recordatorio_pago",
        titulo: vence
          ? `Tu cuota vence el ${fecha}: ${usd(pendienteDe(c))}`
          : `Tu cuota venció ayer: ${usd(pendienteDe(c))}`,
        cuerpo: `${c.description as string}. Puedes pagarla y reportar el comprobante en Atryum.`,
        enlace: "/pagos",
        destacado: { etiqueta: c.description as string, valor: usd(pendienteDe(c)), tono: vence ? "neutro" : "alerta" },
        claveUnica: `${vence ? "vence" : "vencida"}:${c.id as string}`,
      });
      avisos += r.avisados;
    }
  }
  return { avisos };
}
