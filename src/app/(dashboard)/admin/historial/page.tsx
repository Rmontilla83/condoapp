import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile, getOrganization } from "@/lib/queries";
import { FUNCIONES, isAdminRole, type FuncionAdmin } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { EVENTOS, type EventoHistorial } from "@/lib/historial";
import { Encabezado, Vacio, tabla } from "@/components/contabilidad/ui";

/**
 * Historial de cambios (migration 069): quién hizo qué y cuándo. Lo ve toda la
 * administración, también la Junta y el contador, y nadie puede editarlo.
 */

const POR_PAGINA = 100;

/** Claves del detalle que son identificadores internos: no le dicen nada a quien lee. */
const OCULTAS = new Set(["id", "transaccion", "recibo", "presupuesto", "convenio", "profile_id", "reportado_por", "changes", "decimals", "documento", "version", "tarea", "code_id", "invite_id", "member_id"]);

const ETIQUETA: Record<string, string> = {
  reason: "Motivo",
  motivo: "Motivo",
  acta: "Acta",
  monto: "Monto",
  moneda: "Moneda",
  descripcion: "Descripción",
  concepto: "Concepto",
  nota: "Nota",
  nombre: "Nombre",
  campo: "Dato",
  fondo: "Fondo",
  porcentaje: "Porcentaje",
  tipo: "Tipo",
  modo: "Modo",
  recibos: "Recibos",
  total: "Total",
  vence: "Vence",
  anuladas: "Anuladas",
  due_date: "Vence",
  description: "Descripción",
  sum_before: "Suma antes",
  sum_after: "Suma después",
  tasa_anual: "Tasa anual (%)",
  estado: "Estado",
  titulo: "Título",
  funcion: "Función",
  cuenta: "Cuenta",
  filas: "Filas",
  cambiadas: "Cambiadas",
  unidad: "Unidad",
  torre: "Torre",
  visible: "Lo ve",
  soporte: "Soporte",
  metodo: "Método",
  referencia: "Referencia",
  saldo_a_favor: "Saldo a favor",
  al_fondo_de_reserva: "Al fondo de reserva",
  al_fondo_de_contingencia: "Al fondo de contingencia",
  con_fondo: "Pagado con",
  anio: "Año",
  partidas: "Partidas",
  role: "Como",
  rol: "Como",
  por: "Hecho por",
  comentario: "Comentario",
};

/** Valores internos que aparecen en el detalle, dichos como los diría una persona. */
const VALOR: Record<string, string> = {
  owner: "propietario",
  tenant: "inquilino",
  owner_occupied: "vive el propietario",
  tenant_with_active_owner: "alquilada, con propietario activo",
  tenant_only: "alquilada, propietario ausente",
  transfer: "transferencia",
  cash: "efectivo",
  mobile_payment: "pago móvil",
  zelle: "Zelle",
  USD: "dólares",
  VES: "bolívares",
};

function texto(v: unknown): string {
  if (typeof v === "string" && v in VALOR) return VALOR[v];
  if (v === null || v === undefined || v === "") return "";
  if (typeof v === "boolean") return v ? "sí" : "no";
  if (typeof v === "number") return v.toLocaleString("es-VE", { maximumFractionDigits: 5 });
  if (typeof v === "object") {
    return Object.entries(v as Record<string, unknown>)
      .map(([k, x]) => `${k.replace(/_/g, " ")}: ${texto(x)}`)
      .join(", ");
  }
  return String(v);
}

export default async function HistorialPage({ searchParams }: { searchParams: Promise<{ area?: string; pagina?: string }> }) {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return null;
  if (!isAdminRole(profile)) redirect("/dashboard");
  const orgId = profile.organization_id;
  const sp = await searchParams;

  const areas = [...new Set(Object.values(EVENTOS).map((e) => e.area))];
  const area = areas.includes(sp.area as (typeof areas)[number]) ? (sp.area as string) : null;
  const pagina = Math.max(1, Number(sp.pagina) || 1);
  const eventos = (Object.keys(EVENTOS) as EventoHistorial[]).filter((e) => !area || EVENTOS[e].area === area);

  const db = createAdminClient();
  const [org, { data: filas }, { data: unidades }] = await Promise.all([
    getOrganization(orgId),
    db
      .from("auth_events")
      .select("id, event, payload, created_at, actor_id, profiles:actor_id(full_name, email, role, admin_funcion)")
      .eq("organization_id", orgId)
      .in("event", eventos)
      .order("created_at", { ascending: false })
      .range((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA),
    db.from("units").select("id, unit_number, block").eq("organization_id", orgId),
  ]);
  const zona = (org?.timezone as string) || "America/Caracas";
  const unidad = new Map((unidades ?? []).map((u) => [u.id as string, `${u.block ? `${u.block} ` : ""}${u.unit_number}`]));
  const lista = (filas ?? []).slice(0, POR_PAGINA);
  const haySiguiente = (filas ?? []).length > POR_PAGINA;
  const enlace = (a: string | null, p: number) => {
    const q = new URLSearchParams();
    if (a) q.set("area", a);
    if (p > 1) q.set("pagina", String(p));
    const s = q.toString();
    return s ? `/admin/historial?${s}` : "/admin/historial";
  };

  return (
    <div className="space-y-6">
      <Encabezado
        eyebrow="CONTROL INTERNO"
        titulo="Historial de cambios"
        descripcion="Cada carga, aprobación, anulación y cambio de configuración queda aquí con el nombre de quien lo hizo, su función y la hora. Nadie puede editarlo ni borrarlo."
      />

      <nav aria-label="Filtrar por área" className="flex flex-wrap gap-2">
        {[null, ...areas].map((a) => (
          <Link
            key={a ?? "todo"}
            href={enlace(a, 1)}
            aria-current={a === area ? "page" : undefined}
            className={`rounded-full border px-3 py-1.5 text-[13px] ${
              a === area ? "border-marine-deep bg-marine-deep text-frost" : "border-border bg-card text-marine-deep hover:border-marine-deep"
            }`}
          >
            {a ?? "Todo"}
          </Link>
        ))}
      </nav>

      {lista.length === 0 ? (
        <Vacio>Todavía no hay movimientos registrados{area ? ` en ${area}` : ""}.</Vacio>
      ) : (
        <div className={tabla.contenedor}>
          <table className={tabla.tabla}>
            <thead className={tabla.thead}>
              <tr>
                <th className={tabla.th}>Cuándo</th>
                <th className={tabla.th}>Quién</th>
                <th className={tabla.th}>Qué hizo</th>
                <th className={tabla.th}>Detalle</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((f) => {
                const def = EVENTOS[f.event as EventoHistorial];
                const datos = (f.payload ?? {}) as Record<string, unknown>;
                const actor = (Array.isArray(f.profiles) ? f.profiles[0] : f.profiles) as {
                  full_name?: string;
                  email?: string;
                  role?: string;
                  admin_funcion?: string | null;
                } | null;
                const funcion: string =
                  actor?.role === "super_admin"
                    ? "Equipo de Atryum"
                    : actor?.role === "admin"
                      ? FUNCIONES[(actor.admin_funcion as FuncionAdmin) ?? "completa"].nombre
                      : actor
                        ? "Propietario o residente"
                        : "Sin cuenta, por el enlace de revisión";
                const quien = actor?.full_name || actor?.email || (datos.nombre as string) || "Sin identificar";
                const cambios = Array.isArray(datos.changes) ? (datos.changes as { unit_number?: string; antes?: number | null; despues?: number | null }[]) : null;
                const partes = Object.entries(datos)
                  .filter(([k, v]) => !OCULTAS.has(k) && k !== "nombre" && v !== null && v !== "" && v !== undefined)
                  .map(([k, v]) => (k === "unit_id" ? ["Unidad", unidad.get(String(v)) ?? "una unidad"] : [ETIQUETA[k] ?? k.replace(/_/g, " "), texto(v)]))
                  .filter(([, v]) => v !== "");
                return (
                  <tr key={f.id as string}>
                    <td className={`${tabla.td} whitespace-nowrap text-mute`}>
                      {new Date(f.created_at as string).toLocaleString("es-VE", { timeZone: zona, day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className={tabla.td}>
                      <span className="block font-medium text-marine-deep">{quien}</span>
                      <span className="block text-[12px] text-mute">{funcion}</span>
                    </td>
                    <td className={tabla.td}>
                      <span className="block text-marine-deep">{def.texto}</span>
                      <span className="block text-[12px] text-mute">{def.area}</span>
                    </td>
                    <td className={`${tabla.td} max-w-[26rem] text-[12.5px]`}>
                      {partes.map(([k, v]) => (
                        <span key={k} className="block break-words">
                          <span className="text-mute">{k}:</span> {v}
                        </span>
                      ))}
                      {cambios && (
                        <details className="mt-1">
                          <summary className="cursor-pointer text-cyan-ink">
                            {cambios.length} unidad{cambios.length !== 1 ? "es" : ""} con cambio
                          </summary>
                          <ul className="mt-1 space-y-0.5 tabular-nums">
                            {cambios.slice(0, 200).map((c, i) => (
                              <li key={i}>
                                {c.unit_number}: {c.antes === null || c.antes === undefined ? "sin alícuota" : `${c.antes} %`} → {c.despues === null || c.despues === undefined ? "sin alícuota" : `${c.despues} %`}
                              </li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-between text-[13px]">
        {pagina > 1 ? (
          <Link href={enlace(area, pagina - 1)} className="text-cyan-ink hover:underline">
            Más recientes
          </Link>
        ) : (
          <span />
        )}
        {haySiguiente && (
          <Link href={enlace(area, pagina + 1)} className="text-cyan-ink hover:underline">
            Anteriores
          </Link>
        )}
      </div>
    </div>
  );
}
