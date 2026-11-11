"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/queries";
import { funcionDe, puede, sinPermiso } from "@/lib/permissions";
import { registrarEvento } from "@/lib/historial";
import { BUCKET_DOCUMENTOS, CATEGORIAS, TAMANO_MAXIMO, TIPOS_ADMITIDOS, VISIBILIDAD } from "@/lib/documentos-condominio";

type Resultado = { error: string } | { success: true };

function refrescar() {
  revalidatePath("/admin/documentos");
  revalidatePath("/documentos");
}

/** Sube quien carga y también la Junta. Publicar es otro paso, de otra persona. */
async function quienSube() {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return { error: "No autenticado" } as const;
  if (!puede(profile, "cargar") && !puede(profile, "aprobar_junta")) return { error: sinPermiso(profile) } as const;
  return { profile, orgId: profile.organization_id } as const;
}

/**
 * Paso 1: una URL firmada de un solo uso para que el navegador suba el archivo
 * directo al almacenamiento. Por el servidor no cabe: Vercel no recibe más de
 * 4,5 MB y un documento de condominio escaneado pesa bastante más.
 */
export async function prepararSubida(archivo: { nombre: string; tipo: string; tamano: number }): Promise<{ error: string } | { path: string; token: string }> {
  const q = await quienSube();
  if ("error" in q) return { error: q.error as string };
  const ext = TIPOS_ADMITIDOS[archivo.tipo];
  if (!ext) return { error: "Solo se admiten archivos PDF, JPG o PNG." };
  if (!(archivo.tamano > 0) || archivo.tamano > TAMANO_MAXIMO) return { error: "El archivo debe pesar menos de 40 MB." };

  const path = `${q.orgId}/${randomUUID()}.${ext}`;
  const { data, error } = await createAdminClient().storage.from(BUCKET_DOCUMENTOS).createSignedUploadUrl(path);
  if (error || !data) return { error: `No se pudo preparar la subida: ${error?.message ?? "sin respuesta"}` };
  return { path, token: data.token };
}

/**
 * Paso 2: registra la versión ya subida. Crea el documento si es nuevo. La
 * versión nace «en revisión»: no la ve ningún vecino hasta que se publique.
 */
export async function registrarVersion(params: {
  documentoId: string | null;
  titulo?: string;
  categoria?: string;
  descripcion?: string;
  visiblePara?: string;
  path: string;
  archivoNombre: string;
  nota: string;
}): Promise<Resultado> {
  const q = await quienSube();
  if ("error" in q) return { error: q.error as string };
  const { profile, orgId } = q;
  const db = createAdminClient();

  // El archivo tiene que existir y estar en la carpeta de este condominio.
  if (!params.path.startsWith(`${orgId}/`) || params.path.includes("..")) return { error: "Archivo inválido." };
  const nombreEnBucket = params.path.slice(orgId.length + 1);
  const { data: objetos } = await db.storage.from(BUCKET_DOCUMENTOS).list(orgId, { search: nombreEnBucket, limit: 1 });
  const objeto = (objetos ?? []).find((o) => o.name === nombreEnBucket);
  if (!objeto) return { error: "El archivo no terminó de subir. Inténtalo de nuevo." };
  const tamano = Number((objeto.metadata as { size?: number } | null)?.size ?? 0) || null;

  const { data: yaUsado } = await db.from("documento_versiones").select("id").eq("archivo_path", params.path).maybeSingle();
  if (yaUsado) return { error: "Ese archivo ya está registrado." };

  const nota = params.nota.trim().slice(0, 300) || null;
  const archivoNombre = params.archivoNombre.trim().slice(0, 200) || nombreEnBucket;

  let documentoId = params.documentoId;
  let titulo = "";
  if (documentoId) {
    const { data: doc } = await db
      .from("documentos")
      .select("id, titulo")
      .eq("id", documentoId)
      .eq("organization_id", orgId)
      .is("archivado_en", null)
      .maybeSingle();
    if (!doc) return { error: "Ese documento no existe." };
    titulo = doc.titulo as string;
  } else {
    titulo = (params.titulo ?? "").trim().slice(0, 150);
    if (titulo.length < 3) return { error: "Escribe el título del documento." };
    if (!(String(params.categoria) in CATEGORIAS)) return { error: "Elige el tipo de documento." };
    // Quién lo ve lo decide la Junta: si sube otra función, nace cerrado.
    const visible = puede(profile, "aprobar_junta") && String(params.visiblePara) in VISIBILIDAD ? params.visiblePara : "administracion";
    const { data: nuevo, error } = await db
      .from("documentos")
      .insert({
        organization_id: orgId,
        titulo,
        categoria: params.categoria,
        descripcion: (params.descripcion ?? "").trim().slice(0, 500) || null,
        visible_para: visible,
        creado_por: profile.id,
      })
      .select("id")
      .single();
    if (error || !nuevo) return { error: error?.message ?? "No se pudo crear el documento." };
    documentoId = nuevo.id as string;
  }

  const { data: ultima } = await db
    .from("documento_versiones")
    .select("numero")
    .eq("documento_id", documentoId)
    .order("numero", { ascending: false })
    .limit(1)
    .maybeSingle();
  const numero = Number(ultima?.numero ?? 0) + 1;

  const { error } = await db.from("documento_versiones").insert({
    documento_id: documentoId,
    organization_id: orgId,
    numero,
    archivo_path: params.path,
    archivo_nombre: archivoNombre,
    archivo_tamano: tamano,
    nota,
    subido_por: profile.id,
  });
  if (error) return { error: error.code === "23505" ? "Otra persona subió una versión al mismo tiempo. Inténtalo de nuevo." : error.message };

  await registrarEvento({ orgId, actorId: profile.id, evento: "document_version_uploaded", datos: { titulo, version: numero, nota } });
  refrescar();
  return { success: true };
}

/**
 * Publica o devuelve una versión. Es de la Junta, y quien subió la versión no
 * la publica (salvo la administración completa, donde no hay otra persona).
 */
export async function revisarVersion(versionId: string, decision: "publicar" | "devolver", comentario: string): Promise<Resultado> {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return { error: "No autenticado" };
  if (!puede(profile, "aprobar_junta")) return { error: "Publicar un documento le corresponde a la Junta de Condominio." };
  const orgId = profile.organization_id;
  const nota = comentario.trim().slice(0, 300);
  if (decision === "devolver" && nota.length < 5) return { error: "Escribe qué hay que corregir." };

  const db = createAdminClient();
  const { data: v } = await db
    .from("documento_versiones")
    .select("id, numero, estado, subido_por, documentos(titulo)")
    .eq("id", versionId)
    .eq("organization_id", orgId)
    .maybeSingle();
  if (!v) return { error: "Esa versión no existe." };
  if (v.estado !== "en_revision") return { error: "Esa versión ya fue revisada." };
  if (v.subido_por === profile.id && funcionDe(profile) !== "completa") {
    return { error: "No puedes publicar una versión que tú subiste. Debe revisarla otra persona de la Junta." };
  }

  const { data: hecho, error } = await db
    .from("documento_versiones")
    .update({
      estado: decision === "publicar" ? "publicada" : "rechazada",
      revisado_por: profile.id,
      revisado_en: new Date().toISOString(),
      comentario_revision: nota || null,
    })
    .eq("id", versionId)
    .eq("estado", "en_revision")
    .select("id");
  if (error) return { error: error.message };
  if (!hecho?.length) return { error: "Esa versión ya fue revisada." };

  const doc = (Array.isArray(v.documentos) ? v.documentos[0] : v.documentos) as { titulo?: string } | null;
  await registrarEvento({
    orgId,
    actorId: profile.id,
    evento: decision === "publicar" ? "document_version_published" : "document_version_rejected",
    datos: { titulo: doc?.titulo, version: v.numero, comentario: nota || null },
  });
  refrescar();
  return { success: true };
}

/** Quién ve un documento una vez publicado. Lo decide la Junta. */
export async function cambiarVisibilidad(documentoId: string, visible: string): Promise<Resultado> {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return { error: "No autenticado" };
  if (!puede(profile, "aprobar_junta")) return { error: "Quién ve cada documento lo decide la Junta de Condominio." };
  if (!(visible in VISIBILIDAD)) return { error: "Opción inválida." };
  const { data, error } = await createAdminClient()
    .from("documentos")
    .update({ visible_para: visible })
    .eq("id", documentoId)
    .eq("organization_id", profile.organization_id)
    .select("titulo");
  if (error) return { error: error.message };
  if (!data?.length) return { error: "Ese documento no existe." };
  await registrarEvento({
    orgId: profile.organization_id,
    actorId: profile.id,
    evento: "document_visibility_updated",
    datos: { titulo: data[0].titulo, visible: VISIBILIDAD[visible as keyof typeof VISIBILIDAD] },
  });
  refrescar();
  return { success: true };
}

/** Archivar no borra: el documento y sus versiones dejan de mostrarse. */
export async function archivarDocumento(documentoId: string): Promise<Resultado> {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return { error: "No autenticado" };
  if (!puede(profile, "administrar") && !puede(profile, "aprobar_junta")) return { error: sinPermiso(profile) };
  const { data, error } = await createAdminClient()
    .from("documentos")
    .update({ archivado_en: new Date().toISOString(), archivado_por: profile.id })
    .eq("id", documentoId)
    .eq("organization_id", profile.organization_id)
    .is("archivado_en", null)
    .select("titulo");
  if (error) return { error: error.message };
  if (!data?.length) return { error: "Ese documento no existe." };
  await registrarEvento({ orgId: profile.organization_id, actorId: profile.id, evento: "document_archived", datos: { titulo: data[0].titulo } });
  refrescar();
  return { success: true };
}
