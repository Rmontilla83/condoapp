import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { isInvoiceOverdue, todayInTimeZone, zonedToISO } from "@/lib/utils";
import type { BankAccount } from "@/types/database";

/**
 * Lo que el conserje sabe de QUIÉN pregunta. Se arma en el servidor a partir de
 * la sesión (ver `armarContexto` en conserje.ts) y las herramientas lo reciben
 * por cierre, nunca como argumento del modelo.
 *
 * Esa es la garantía de privacidad: ninguna herramienta acepta un id de unidad,
 * de persona ni de organización. El modelo no puede pedir la deuda del 4-5
 * aunque se lo pidan, porque no hay por dónde pasárselo. Por eso las consultas
 * usan el cliente admin (sin RLS): el filtro está en el código, explícito, y no
 * depende del rol de quien pregunta — un super_admin viendo como residente
 * tendría RLS abierta a todo.
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

function json(x: unknown) {
  return JSON.stringify(x);
}

export function herramientasDelConserje(ctx: ConserjeContexto) {
  const db = createAdminClient();

  const estadoDeCuenta = betaZodTool({
    name: "mi_estado_de_cuenta",
    description:
      "Cuotas pendientes o vencidas de las unidades de la persona que pregunta, con el total en USD y su equivalente en bolívares a la tasa BCV de hoy, y los pagos que reportó y todavía están en revisión. Úsala para '¿cuánto debo?', '¿ya me aprobaron el pago?', '¿cuándo vence?'. Solo devuelve datos de SUS unidades.",
    inputSchema: z.object({}),
    run: async () => {
      if (ctx.unidadesConCuotas.length === 0) {
        return json({
          sin_acceso: true,
          motivo:
            ctx.unidades.length === 0
              ? "La persona no está vinculada a ninguna unidad."
              : "Es inquilino y el propietario no le dio permiso para ver las cuotas.",
        });
      }

      const [{ data: cuotas }, { data: tasa }] = await Promise.all([
        db
          .from("invoices")
          .select("id, unit_id, description, amount, currency, due_date, status")
          .eq("organization_id", ctx.orgId)
          .in("unit_id", ctx.unidadesConCuotas)
          .in("status", ["pending", "overdue"])
          .order("due_date"),
        db
          .from("exchange_rates")
          .select("rate, effective_date")
          .eq("organization_id", ctx.orgId)
          .order("effective_date", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      const ids = (cuotas ?? []).map((c) => c.id as string);
      const { data: enRevision } = ids.length
        ? await db
            .from("transactions")
            .select("invoice_id, amount, currency, paid_at, status")
            .in("invoice_id", ids)
            .eq("status", "pending")
        : { data: [] };

      const hoy = todayInTimeZone(ctx.timezone);
      const etiqueta = new Map(ctx.unidades.map((u) => [u.id, u.etiqueta]));
      const rate = Number(tasa?.rate) || null;
      const total = r2((cuotas ?? []).reduce((s, c) => s + Number(c.amount), 0));

      return json({
        tasa_bcv: rate ? { bs_por_usd: rate, fecha: tasa?.effective_date } : null,
        total_pendiente_usd: total,
        total_pendiente_bs: rate ? r2(total * rate) : null,
        cuotas: (cuotas ?? []).map((c) => ({
          unidad: etiqueta.get(c.unit_id as string),
          concepto: c.description,
          monto: Number(c.amount),
          moneda: c.currency,
          vence: c.due_date,
          vencida: isInvoiceOverdue(
            { status: c.status as string, due_date: c.due_date as string },
            hoy,
          ),
        })),
        pagos_en_revision: (enRevision ?? []).map((t) => ({
          monto: Number(t.amount),
          moneda: t.currency,
          reportado: t.paid_at,
        })),
      });
    },
  });

  const comoPagar = betaZodTool({
    name: "como_pagar",
    description:
      "Cuentas bancarias activas del condominio (transferencia, pago móvil, Zelle) y cómo se reporta un pago en la app. Úsala para '¿cómo pago?', '¿a qué cuenta transfiero?', '¿aceptan pago móvil?'.",
    inputSchema: z.object({}),
    run: async () => {
      const { data: org } = await db
        .from("organizations")
        .select("bank_accounts")
        .eq("id", ctx.orgId)
        .single();
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
      return json({
        cuentas,
        como_reportar_en_la_app:
          "En la sección Pagos, tocar la cuota y 'Reportar pago': se indica el monto, la referencia y se adjunta el comprobante. La administración lo revisa y lo aprueba o lo rechaza con un motivo.",
      });
    },
  });

  const areasComunes = betaZodTool({
    name: "areas_comunes",
    description:
      "Áreas comunes reservables del condominio (piscina, salón, parrilla...) con su capacidad, reglas y políticas de reserva. Úsala antes de consultar disponibilidad para conocer el nombre exacto del área.",
    inputSchema: z.object({}),
    run: async () => {
      const { data } = await db
        .from("common_areas")
        .select(
          "name, description, capacity, rules, max_reservations_per_week, max_duration_hours, min_advance_hours, max_advance_days",
        )
        .eq("organization_id", ctx.orgId)
        .eq("is_active", true)
        .order("name");
      return json({ areas: data ?? [], como_reservar: "En la sección Reservas de la app." });
    },
  });

  const disponibilidad = betaZodTool({
    name: "disponibilidad_area",
    description:
      "Horarios ya reservados de un área común en una fecha. Devuelve los bloques ocupados (sin decir quién reservó); el resto del día está libre, sujeto a las políticas del área. Úsala para '¿está libre la piscina el sábado?'.",
    inputSchema: z.object({
      area: z.string().min(1).max(80).describe("Nombre del área, tal como lo devuelve areas_comunes"),
      fecha: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .describe("Fecha en formato AAAA-MM-DD, en la hora local del condominio"),
    }),
    run: async ({ area, fecha }) => {
      // Comparación exacta en JS y no con ilike: PostgREST traduce `*` a `%`
      // dentro del patrón y no hay forma de escaparlo.
      const { data: areas } = await db
        .from("common_areas")
        .select("id, name")
        .eq("organization_id", ctx.orgId)
        .eq("is_active", true);
      const buscado = area.trim().toLowerCase();
      const encontrada = (areas ?? []).find((a) => (a.name as string).trim().toLowerCase() === buscado);
      if (!encontrada) {
        return json({
          error: "No hay un área con ese nombre.",
          areas_disponibles: (areas ?? []).map((a) => a.name),
        });
      }

      let desde: string, hasta: string;
      try {
        desde = zonedToISO(fecha, "00:00", ctx.timezone);
        // Fin del día = medianoche siguiente, para no perder el minuto 23:59.
        hasta = new Date(Date.parse(zonedToISO(fecha, "23:59", ctx.timezone)) + 60_000).toISOString();
      } catch {
        return json({ error: "Fecha inválida." });
      }

      const { data: reservas } = await db
        .from("reservations")
        .select("start_time, end_time")
        .eq("common_area_id", encontrada.id)
        .eq("status", "confirmed")
        .lt("start_time", hasta)
        .gt("end_time", desde)
        .order("start_time");

      const hora = (iso: string) =>
        new Intl.DateTimeFormat("es-VE", {
          timeZone: ctx.timezone,
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }).format(new Date(iso));

      return json({
        area: encontrada.name,
        fecha,
        bloques_ocupados: (reservas ?? []).map((r) => ({
          desde: hora(r.start_time as string),
          hasta: hora(r.end_time as string),
        })),
      });
    },
  });

  const contacto = betaZodTool({
    name: "contacto_administracion",
    description:
      "Teléfono, correo y horario de la administración, y notas generales que dejó la junta (normas, horarios, avisos permanentes). Úsala para '¿cómo contacto a la administración?' o preguntas sobre normas del edificio.",
    inputSchema: z.object({}),
    run: async () => {
      const { data: org } = await db
        .from("organizations")
        .select("name, address, city, contact_phone, contact_email, office_hours, concierge_notes")
        .eq("id", ctx.orgId)
        .single();
      return json({
        condominio: org?.name,
        direccion: [org?.address, org?.city].filter(Boolean).join(", ") || null,
        telefono: org?.contact_phone ?? null,
        correo: org?.contact_email ?? null,
        horario: org?.office_hours ?? null,
        notas_de_la_junta: org?.concierge_notes ?? null,
      });
    },
  });

  const comunicados = betaZodTool({
    name: "comunicados_recientes",
    description:
      "Los últimos comunicados de la administración dirigidos a esta persona (cortes de agua, asambleas, mantenimientos). Úsala para '¿hay algún aviso?', '¿cuándo es la asamblea?'.",
    inputSchema: z.object({}),
    run: async () => {
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
          case "all":
            return true;
          case "owners":
            return esPropietario;
          case "tenants":
            return esInquilino;
          case "specific_block":
            return bloques.has(a.target_block as string);
          default:
            return false;
        }
      });

      return json({
        comunicados: suyos.slice(0, 8).map((a) => ({
          titulo: a.title,
          contenido: (a.content as string).slice(0, 1500),
          prioridad: a.priority,
          publicado: a.published_at,
        })),
      });
    },
  });

  return [estadoDeCuenta, comoPagar, areasComunes, disponibilidad, contacto, comunicados];
}
