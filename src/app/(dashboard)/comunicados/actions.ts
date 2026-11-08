"use server";

import { randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/queries";
import { isAdminRole } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { enviarEmail } from "@/lib/email/send";
import { comunicadoUrgente } from "@/lib/email/templates";
import { emailsDeOrg, nombreDeOrg } from "@/lib/email/recipients";

const BUCKET_FOTOS = "announcement-photos";
const MAX_FOTOS = 6;
/** El navegador las deja en 600 KB; este tope es para quien se salte el formulario. */
const MAX_BYTES_FOTO = 1024 * 1024;

export async function createAnnouncement(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return { error: "No tienes organización" };
  if (!isAdminRole(profile)) {
    return { error: "Solo administradores pueden crear comunicados" };
  }

  const title = (formData.get("title") as string)?.trim();
  const content = (formData.get("content") as string)?.trim();
  const priority = (formData.get("priority") as string) || "normal";

  if (!title || !content) return { error: "Título y contenido son requeridos" };

  const fotos = (formData.getAll("photos") as File[]).filter((f) => f && f.size > 0);
  if (fotos.length > MAX_FOTOS) return { error: `Puedes adjuntar hasta ${MAX_FOTOS} fotos` };
  if (fotos.some((f) => f.size > MAX_BYTES_FOTO || f.type !== "image/jpeg")) {
    return { error: "Una de las fotos no se pudo procesar. Quítala y vuelve a agregarla." };
  }

  // Admin client bypasses RLS — el rol ya lo validamos arriba con isAdminRole.
  // RLS de announcements mira auth.user_role() que resulta stale con view_as.
  const supabase = createAdminClient();

  // Primero las fotos: un comunicado se publica al instante y no se puede editar,
  // así que nunca debe salir a medias.
  const rutas: string[] = [];
  const descartarFotos = async () => {
    if (rutas.length) await supabase.storage.from(BUCKET_FOTOS).remove(rutas);
  };
  for (const foto of fotos) {
    const ruta = `${profile.organization_id}/${randomUUID()}.jpg`;
    const { error: errorFoto } = await supabase.storage
      .from(BUCKET_FOTOS)
      .upload(ruta, foto, { contentType: "image/jpeg" });
    if (errorFoto) {
      console.error("[comunicados] no se pudo subir una foto:", errorFoto.message);
      await descartarFotos();
      return { error: "No se pudieron subir las fotos y el comunicado no se publicó. Inténtalo de nuevo." };
    }
    rutas.push(ruta);
  }

  const { error } = await supabase.from("announcements").insert({
    organization_id: profile.organization_id,
    author_id: profile.id,
    title,
    content,
    priority,
    target_audience: "all",
    photo_urls: rutas.map((r) => `${BUCKET_FOTOS}/${r}`),
  });

  if (error) {
    await descartarFotos();
    return { error: error.message };
  }

  // Solo los urgentes salen por correo. Si mandáramos todos, la gente filtra a
  // spam los correos de Atryum y se pierde también el que sí importaba.
  if (priority === "urgent") {
    try {
      const [para, condominio] = await Promise.all([
        emailsDeOrg(profile.organization_id),
        nombreDeOrg(profile.organization_id),
      ]);
      const plantilla = comunicadoUrgente({ condominio, titulo: title, contenido: content });
      await enviarEmail({
        para,
        asunto: plantilla.asunto,
        html: plantilla.html,
        evento: "comunicado_urgente",
      });
    } catch (e) {
      console.error("[email] comunicado urgente falló:", e instanceof Error ? e.message : e);
    }
  }

  revalidatePath("/comunicados");
  revalidatePath("/dashboard");
  return { success: true };
}
