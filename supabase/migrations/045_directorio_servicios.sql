-- 045 · Directorio de servicios recomendados
--
-- En un condominio la pregunta más repetida al conserje, después de "¿cuánto
-- debo?", es "¿conoces un técnico de aires / un plomero / un cerrajero?". La
-- respuesta vive en el grupo de WhatsApp, perdida entre mensajes. Este es el
-- directorio que la administración mantiene y que el conserje consulta.
--
-- Son proveedores recomendados, no contratados por el condominio: la app no
-- intermedia pagos ni garantiza el trabajo, y así lo dice la pantalla.
--
-- ADITIVA: tabla nueva. Va antes que el código.

CREATE TABLE IF NOT EXISTS service_providers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  category        TEXT NOT NULL CHECK (category IN (
                    'aire_acondicionado', 'plomeria', 'electricidad', 'albanileria',
                    'pintura', 'cerrajeria', 'fumigacion', 'jardineria', 'piscina',
                    'limpieza', 'mudanzas', 'tecnologia', 'linea_blanca', 'herreria',
                    'vidrieria', 'otro')),
  name            TEXT NOT NULL CHECK (length(btrim(name)) BETWEEN 2 AND 80),
  phone           TEXT,
  whatsapp        TEXT,
  notes           TEXT,
  recommended_by  TEXT,
  active          BOOLEAN NOT NULL DEFAULT true,
  created_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS service_providers_org
  ON service_providers (organization_id, category) WHERE active;

-- Lo ven todos los miembros del condominio; escribe solo la administración,
-- por server actions con service role.
ALTER TABLE service_providers ENABLE ROW LEVEL SECURITY;
REVOKE INSERT, UPDATE, DELETE ON service_providers FROM anon, authenticated;

DROP POLICY IF EXISTS "Miembros ven el directorio" ON service_providers;
CREATE POLICY "Miembros ven el directorio" ON service_providers
  FOR SELECT TO authenticated
  USING (organization_id = public.user_org_id());
