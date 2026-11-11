-- 071 · Documentos con versiones, censo documental y tareas de la Junta
--
-- Tres pedidos de la Junta de Costa de Plata (2026-11-09):
--   1. Publicar el documento de condominio, el reglamento, las actas y los
--      soportes, sin que una versión nueva borre la anterior.
--   2. Un semáforo por unidad que diga si la documentación de propiedad fue
--      entregada, validada por la administradora y aprobada por la Junta.
--   3. Un panel con las tareas y objetivos de la Junta.
--
-- Las tres tablas las lee solo el servidor, con cliente de servicio: RLS sin
-- políticas. Así el permiso de cada función se decide en un solo lugar
-- (src/lib/permissions.ts) y un vecino no enumera nada por PostgREST.
--
-- ADITIVA: va antes que el código.

-- ── 1. Documentos ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS documentos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  titulo          TEXT NOT NULL CHECK (length(btrim(titulo)) >= 3),
  categoria       TEXT NOT NULL CHECK (categoria IN ('condominio', 'reglamento', 'acta', 'soporte', 'otro')),
  descripcion     TEXT,
  -- Quién lo ve una vez publicado.
  visible_para    TEXT NOT NULL DEFAULT 'administracion' CHECK (visible_para IN ('administracion', 'propietarios', 'todos')),
  creado_por      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT now(),
  archivado_en    TIMESTAMPTZ,
  archivado_por   UUID REFERENCES profiles(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS documentos_org_idx ON documentos (organization_id, categoria);

-- Cada versión se sube «en revisión» y la publica quien aprueba. Publicar una
-- versión no borra las anteriores.
CREATE TABLE IF NOT EXISTS documento_versiones (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  documento_id    UUID NOT NULL REFERENCES documentos(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  numero          INT NOT NULL CHECK (numero >= 1),
  archivo_path    TEXT NOT NULL,
  archivo_nombre  TEXT NOT NULL,
  archivo_tamano  BIGINT,
  nota            TEXT,
  estado          TEXT NOT NULL DEFAULT 'en_revision' CHECK (estado IN ('en_revision', 'publicada', 'rechazada')),
  subido_por      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  subido_en       TIMESTAMPTZ NOT NULL DEFAULT now(),
  revisado_por    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  revisado_en     TIMESTAMPTZ,
  comentario_revision TEXT,
  UNIQUE (documento_id, numero),
  CHECK ((estado = 'en_revision') = (revisado_en IS NULL))
);
CREATE INDEX IF NOT EXISTS documento_versiones_doc_idx ON documento_versiones (documento_id, numero DESC);

ALTER TABLE documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE documento_versiones ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON documentos, documento_versiones FROM anon, authenticated;

-- Bucket privado. Se sube directo desde el navegador con una URL firmada de un
-- solo uso (Vercel no recibe más de 4,5 MB), y se lee con URL firmada.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('condo-documents', 'condo-documents', false, 41943040, ARRAY['application/pdf', 'image/jpeg', 'image/png'])
ON CONFLICT (id) DO UPDATE
  SET public = false,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ── 2. Censo documental ──────────────────────────────────────────────────────
-- Tabla aparte y no columnas en units: cualquier vecino puede leer units.
CREATE TABLE IF NOT EXISTS unit_documentacion (
  unit_id         UUID PRIMARY KEY REFERENCES units(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  -- rojo: no ha entregado. naranja: entregó una parte. validada: completa y
  -- validada por la administradora, falta la Junta. verde: aprobada por la Junta.
  estado          TEXT NOT NULL DEFAULT 'rojo' CHECK (estado IN ('rojo', 'naranja', 'validada', 'verde')),
  nota            TEXT,
  actualizado_por UUID REFERENCES profiles(id) ON DELETE SET NULL,
  actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT now(),
  validado_por    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  validado_en     TIMESTAMPTZ,
  aprobado_por    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  aprobado_en     TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS unit_documentacion_org_idx ON unit_documentacion (organization_id, estado);
ALTER TABLE unit_documentacion ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON unit_documentacion FROM anon, authenticated;

-- Quién ve el avance del censo lo decide la Junta.
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS censo_visible TEXT NOT NULL DEFAULT 'administracion'
    CHECK (censo_visible IN ('administracion', 'propio', 'todos'));
COMMENT ON COLUMN organizations.censo_visible IS
  'administracion: solo la administración. propio: cada propietario ve el estado de su unidad. todos: además, el avance general.';

-- ── 3. Tareas y objetivos de la Junta ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS junta_tareas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  titulo          TEXT NOT NULL CHECK (length(btrim(titulo)) >= 3),
  detalle         TEXT,
  estado          TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'en_curso', 'hecha')),
  responsable     TEXT,
  fecha_objetivo  DATE,
  visible_vecinos BOOLEAN NOT NULL DEFAULT false,
  creado_por      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT now(),
  completada_en   TIMESTAMPTZ,
  archivada_en    TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS junta_tareas_org_idx ON junta_tareas (organization_id, estado);
ALTER TABLE junta_tareas ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON junta_tareas FROM anon, authenticated;
