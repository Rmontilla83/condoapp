import { createAdminClient } from "@/lib/supabase/admin";
import { puede } from "@/lib/permissions";

/**
 * Las burbujas del menú: cuántas cosas esperan a ESTA persona en cada sección.
 *
 * Una burbuja significa «hay algo que te toca hacer», no «hay novedades». Por
 * eso cada cuenta solo se muestra a quien puede resolverla, y el contador, que
 * solo lee, no ve ninguna. La morosidad o los datos en verificación no van
 * aquí: son cifras permanentes y dejarían el menú siempre encendido.
 *
 * Devuelve un mapa de ruta del menú a cantidad; las rutas sin pendientes no
 * aparecen. Nunca lanza: si una cuenta falla, esa burbuja simplemente no sale.
 */
export type PendientesMenu = Record<string, number>;

type Perfil = Parameters<typeof puede>[0];

export async function pendientesDelMenu(profile: Perfil, orgId: string): Promise<PendientesMenu> {
  const db = createAdminClient();
  const out: PendientesMenu = {};
  const tareas: Promise<void>[] = [];

  // Pagos reportados que esperan aprobación. Un pago repartido entre varios
  // recibos son varias filas con el mismo grupo: cuenta como uno.
  if (puede(profile, "administrar")) {
    tareas.push(
      (async () => {
        const { data } = await db
          .from("transactions")
          .select("id, payment_group_id, invoices!inner(organization_id)")
          .eq("status", "pending")
          .eq("invoices.organization_id", orgId)
          .limit(500);
        const n = new Set((data ?? []).map((t) => (t.payment_group_id as string | null) ?? (t.id as string))).size;
        if (n > 0) out["/admin"] = n;
      })(),
    );
  }

  // Reportes de avería nuevos, que nadie ha tomado.
  if (puede(profile, "cargar")) {
    tareas.push(
      (async () => {
        const { count } = await db.from("maintenance_requests").select("id", { count: "exact", head: true }).eq("organization_id", orgId).eq("status", "new");
        if (count) {
          out["/mantenimiento"] = count; // barra del teléfono
          out["/admin/mantenimiento"] = count; // menú de la administración
        }
      })(),
    );
  }

  // Documentos subidos que esperan que la Junta los publique.
  if (puede(profile, "aprobar_junta")) {
    tareas.push(
      (async () => {
        const { count } = await db.from("documento_versiones").select("id", { count: "exact", head: true }).eq("organization_id", orgId).eq("estado", "en_revision");
        if (count) out["/admin/documentos"] = count;
      })(),
    );
  }

  // Tareas de la Junta sin terminar. Las tareas no se asignan a una cuenta (el
  // responsable es un nombre escrito), así que se cuentan todas las abiertas.
  if (puede(profile, "decidir")) {
    tareas.push(
      (async () => {
        const { count } = await db
          .from("junta_tareas")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", orgId)
          .in("estado", ["pendiente", "en_curso"])
          .is("archivada_en", null);
        if (count) out["/admin/junta"] = count;
      })(),
    );
  }

  await Promise.all(tareas.map((t) => t.catch(() => {})));
  return out;
}
