"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/queries";
import { requireAdmin } from "@/lib/permissions";

type Resultado = { error: string } | { success: true };

const TIPOS: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };
const MAX_BYTES = 2 * 1024 * 1024;
const BUCKET = "org-logos";

function refrescar() {
  revalidatePath("/", "layout");
}

/** Sube el logo del condominio (PNG, JPG o WebP, hasta 2 MB) y reemplaza el anterior. */
export async function subirLogo(fd: FormData): Promise<Resultado> {
  const profile = await getCurrentProfile();
  const guard = requireAdmin(profile);
  if (guard) return guard;
  const orgId = profile!.organization_id!;

  const archivo = fd.get("logo");
  if (!(archivo instanceof File) || archivo.size === 0) return { error: "Elige una imagen." };
  const ext = TIPOS[archivo.type];
  if (!ext) return { error: "El logo tiene que ser PNG, JPG o WebP." };
  if (archivo.size > MAX_BYTES) return { error: "El logo pesa más de 2 MB. Usa una versión más liviana." };

  const db = createAdminClient();
  const ruta = `${orgId}/logo-${Date.now()}.${ext}`;
  const { error } = await db.storage
    .from(BUCKET)
    .upload(ruta, Buffer.from(await archivo.arrayBuffer()), { contentType: archivo.type, cacheControl: "31536000" });
  if (error) return { error: `No se pudo subir: ${error.message}` };

  const url = db.storage.from(BUCKET).getPublicUrl(ruta).data.publicUrl;
  const { data: previo } = await db.from("organizations").select("logo_url").eq("id", orgId).maybeSingle();
  const { error: updError } = await db.from("organizations").update({ logo_url: url }).eq("id", orgId);
  if (updError) return { error: updError.message };

  await borrarArchivo(previo?.logo_url as string | null, orgId);
  refrescar();
  return { success: true };
}

export async function quitarLogo(): Promise<Resultado> {
  const profile = await getCurrentProfile();
  const guard = requireAdmin(profile);
  if (guard) return guard;
  const orgId = profile!.organization_id!;
  const db = createAdminClient();
  const { data: previo } = await db.from("organizations").select("logo_url").eq("id", orgId).maybeSingle();
  const { error } = await db.from("organizations").update({ logo_url: null }).eq("id", orgId);
  if (error) return { error: error.message };
  await borrarArchivo(previo?.logo_url as string | null, orgId);
  refrescar();
  return { success: true };
}

/** Solo borra archivos de este condominio dentro del bucket de logos. */
async function borrarArchivo(url: string | null, orgId: string) {
  if (!url) return;
  const marca = `/object/public/${BUCKET}/`;
  const i = url.indexOf(marca);
  if (i < 0) return;
  const ruta = decodeURIComponent(url.slice(i + marca.length));
  if (!ruta.startsWith(`${orgId}/`)) return;
  await createAdminClient().storage.from(BUCKET).remove([ruta]);
}
