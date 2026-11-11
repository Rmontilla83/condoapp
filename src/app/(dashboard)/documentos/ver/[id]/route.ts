import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/queries";
import { getUserMembership, isAdminRole } from "@/lib/permissions";
import { BUCKET_DOCUMENTOS } from "@/lib/documentos-condominio";

/**
 * Abre una versión de un documento (migration 071). El archivo está en un
 * bucket privado: aquí se comprueba quién pregunta y se le da una URL firmada
 * que vence en cinco minutos.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return new NextResponse("No autorizado", { status: 401 });

  const db = createAdminClient();
  const { data: v } = await db
    .from("documento_versiones")
    .select("archivo_path, archivo_nombre, estado, documentos(visible_para, archivado_en)")
    .eq("id", id)
    .eq("organization_id", profile.organization_id)
    .maybeSingle();
  if (!v) return new NextResponse("No encontrado", { status: 404 });

  if (!isAdminRole(profile)) {
    const doc = (Array.isArray(v.documentos) ? v.documentos[0] : v.documentos) as { visible_para?: string; archivado_en?: string | null } | null;
    const abierto =
      v.estado === "publicada" &&
      !!doc &&
      !doc.archivado_en &&
      (doc.visible_para === "todos" || (doc.visible_para === "propietarios" && (await getUserMembership(profile.id)).isOwner));
    // 404 y no 403: a quien no puede verlo no se le confirma que existe.
    if (!abierto) return new NextResponse("No encontrado", { status: 404 });
  }

  const { data, error } = await db.storage.from(BUCKET_DOCUMENTOS).createSignedUrl(v.archivo_path as string, 300);
  if (error || !data?.signedUrl) return new NextResponse("No se pudo abrir el archivo", { status: 500 });
  return NextResponse.redirect(data.signedUrl, 302);
}
