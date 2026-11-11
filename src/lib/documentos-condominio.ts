import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Documentos del condominio con versiones (migration 071).
 *
 * Las tablas no tienen políticas: todo pasa por aquí con el cliente de servicio,
 * y quién ve qué se decide en un solo lugar.
 */
export const BUCKET_DOCUMENTOS = "condo-documents";
export const TAMANO_MAXIMO = 40 * 1024 * 1024;
export const TIPOS_ADMITIDOS: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
};

export const CATEGORIAS = {
  condominio: "Documento de condominio",
  reglamento: "Reglamento",
  acta: "Actas de asamblea",
  soporte: "Soportes de gestión",
  otro: "Otros",
} as const;
export type CategoriaDocumento = keyof typeof CATEGORIAS;

export const VISIBILIDAD = {
  administracion: "Solo la administración y la Junta",
  propietarios: "Propietarios",
  todos: "Propietarios e inquilinos",
} as const;
export type VisibilidadDocumento = keyof typeof VISIBILIDAD;

export interface VersionDocumento {
  id: string;
  numero: number;
  archivo_nombre: string;
  archivo_tamano: number | null;
  nota: string | null;
  estado: "en_revision" | "publicada" | "rechazada";
  subido_en: string;
  subido_por: string | null;
  subio: string | null;
  revisado_en: string | null;
  reviso: string | null;
  comentario_revision: string | null;
}

export interface DocumentoCondominio {
  id: string;
  titulo: string;
  categoria: CategoriaDocumento;
  descripcion: string | null;
  visible_para: VisibilidadDocumento;
  creado_en: string;
  versiones: VersionDocumento[];
}

type Persona = { full_name?: string | null; email?: string | null } | { full_name?: string | null; email?: string | null }[] | null;
const nombreDe = (p: Persona): string | null => {
  const x = Array.isArray(p) ? p[0] : p;
  return x?.full_name || x?.email || null;
};

/** Todos los documentos vivos del condominio, con todas sus versiones. Solo para la administración. */
export async function documentosDelCondominio(orgId: string): Promise<DocumentoCondominio[]> {
  const { data, error } = await createAdminClient()
    .from("documentos")
    .select(
      "id, titulo, categoria, descripcion, visible_para, creado_en, documento_versiones(id, numero, archivo_nombre, archivo_tamano, nota, estado, subido_en, subido_por, revisado_en, comentario_revision, subio:subido_por(full_name, email), reviso:revisado_por(full_name, email))",
    )
    .eq("organization_id", orgId)
    .is("archivado_en", null)
    .order("titulo");
  if (error) throw new Error(error.message);
  return (data ?? []).map((d) => ({
    id: d.id as string,
    titulo: d.titulo as string,
    categoria: d.categoria as CategoriaDocumento,
    descripcion: (d.descripcion as string) ?? null,
    visible_para: d.visible_para as VisibilidadDocumento,
    creado_en: d.creado_en as string,
    versiones: ((d.documento_versiones ?? []) as Record<string, unknown>[])
      .map((v) => ({
        id: v.id as string,
        numero: Number(v.numero),
        archivo_nombre: v.archivo_nombre as string,
        archivo_tamano: v.archivo_tamano === null ? null : Number(v.archivo_tamano),
        nota: (v.nota as string) ?? null,
        estado: v.estado as VersionDocumento["estado"],
        subido_en: v.subido_en as string,
        subido_por: (v.subido_por as string) ?? null,
        subio: nombreDe(v.subio as Persona),
        revisado_en: (v.revisado_en as string) ?? null,
        reviso: nombreDe(v.reviso as Persona),
        comentario_revision: (v.comentario_revision as string) ?? null,
      }))
      .sort((a, b) => b.numero - a.numero),
  }));
}

/**
 * Lo que ve un vecino: solo documentos con alguna versión publicada y abiertos
 * a su tipo de cuenta. De cada uno salen únicamente las versiones publicadas.
 */
export async function documentosParaVecino(orgId: string, esPropietario: boolean): Promise<DocumentoCondominio[]> {
  const todos = await documentosDelCondominio(orgId);
  return todos
    .filter((d) => d.visible_para === "todos" || (d.visible_para === "propietarios" && esPropietario))
    .map((d) => ({ ...d, versiones: d.versiones.filter((v) => v.estado === "publicada") }))
    .filter((d) => d.versiones.length > 0);
}

export function tamanoLegible(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toLocaleString("es-VE", { maximumFractionDigits: 1 })} MB`;
}
