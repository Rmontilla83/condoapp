import { createAdminClient } from "@/lib/supabase/admin";
import { enviarLote } from "@/lib/email/send";
import { layout } from "@/lib/email/templates";
import { nombreDeOrg } from "@/lib/email/recipients";

/**
 * Avisos a personas (migration 046): la campana de la app y, si la persona
 * tiene un correo entregable, también por correo.
 *
 * Server-only (admin client). Quien llama YA validó la autorización: la
 * caseta que registró la visita, la administración que emite un recordatorio.
 * Nunca lanza: un aviso que falla no puede deshacer la acción que lo originó.
 */

export type TipoAviso =
  | "visita_llego"
  | "paquete_recibido"
  | "paquete_entregado"
  | "recordatorio_pago"
  | "averia_actualizada"
  | "pago_revisado";

export interface Aviso {
  tipo: TipoAviso;
  titulo: string;
  cuerpo?: string;
  enlace?: string;
  /** Si viene, no se avisa dos veces la misma cosa a la misma persona. */
  claveUnica?: string;
  /** Bloque destacado del correo. */
  destacado?: { etiqueta: string; valor: string; tono?: "neutro" | "alerta" };
  /** false = solo campana. */
  correo?: boolean;
}

/** Miembros activos de una unidad (propietario e inquilino). */
export async function perfilesDeUnidad(unitId: string): Promise<{ id: string; email: string | null }[]> {
  const { data } = await createAdminClient()
    .from("unit_members")
    .select("profile_id, profiles(email)")
    .eq("unit_id", unitId)
    .eq("active", true);
  const vistos = new Set<string>();
  const out: { id: string; email: string | null }[] = [];
  for (const m of data ?? []) {
    const id = m.profile_id as string;
    if (vistos.has(id)) continue;
    vistos.add(id);
    const p = (Array.isArray(m.profiles) ? m.profiles[0] : m.profiles) as { email?: string } | null;
    out.push({ id, email: p?.email ?? null });
  }
  return out;
}

export async function notificar(
  orgId: string,
  destinatarios: { id: string; email: string | null }[],
  aviso: Aviso,
): Promise<{ avisados: number }> {
  if (destinatarios.length === 0) return { avisados: 0 };
  try {
    const db = createAdminClient();
    const filas = destinatarios.map((d) => ({
      organization_id: orgId,
      profile_id: d.id,
      kind: aviso.tipo,
      title: aviso.titulo.slice(0, 160),
      body: aviso.cuerpo?.slice(0, 600) ?? null,
      link: aviso.enlace ?? null,
      dedupe_key: aviso.claveUnica ?? null,
    }));
    // Con clave única, los que ya tenían el aviso se saltan en silencio.
    const { data: insertadas, error } = aviso.claveUnica
      ? await db.from("notifications").upsert(filas, { onConflict: "profile_id,dedupe_key", ignoreDuplicates: true }).select("profile_id")
      : await db.from("notifications").insert(filas).select("profile_id");
    if (error) {
      console.error("[avisos] no se pudo guardar:", error.message);
      return { avisados: 0 };
    }
    const nuevos = new Set((insertadas ?? []).map((f) => f.profile_id as string));

    if (aviso.correo !== false) {
      const condominio = await nombreDeOrg(orgId);
      const base = process.env.NEXT_PUBLIC_PORTAL_URL ?? "https://portal.atryum.net";
      const html = layout({
        condominio,
        eyebrow: "Aviso",
        titulo: aviso.titulo,
        parrafos: aviso.cuerpo ? [aviso.cuerpo] : [],
        destacado: aviso.destacado,
        cta: aviso.enlace ? { texto: "Abrir en Atryum", href: `${base}${aviso.enlace}` } : undefined,
      });
      await enviarLote(
        destinatarios
          .filter((d) => nuevos.has(d.id) && d.email)
          .map((d) => ({ para: d.email!, asunto: aviso.titulo, html })),
        aviso.tipo,
      );
    }
    return { avisados: nuevos.size };
  } catch (e) {
    console.error("[avisos] excepción:", e instanceof Error ? e.message : e);
    return { avisados: 0 };
  }
}
