-- 044 · Caseta de vigilancia
--
-- Hasta hoy, /verificar/[código] mostraba el botón "Registrar entrada" a
-- CUALQUIERA que tuviera el enlace del pase, incluido el propio visitante: podía
-- marcar su entrada antes de llegar. Y no quedaba registro de qué vigilante dejó
-- pasar a quién.
--
-- Una caseta es un dispositivo de vigilancia (el teléfono o la tablet de la
-- garita). La administración la crea y recibe UN enlace secreto; al abrirlo, ese
-- navegador queda como caseta. Solo desde una caseta se registran entradas.
--
-- Se guarda el HASH del token (SHA-256), nunca el token: quien lea la tabla no
-- puede hacerse pasar por la caseta.
--
-- Compatibilidad: un condominio SIN casetas activas sigue funcionando como antes
-- (cualquiera con el pase registra la entrada). Al crear la primera caseta, el
-- registro queda restringido a las casetas.
--
-- ADITIVA: tabla y columna nuevas. Va antes que el código.

CREATE TABLE IF NOT EXISTS guard_stations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL CHECK (length(btrim(name)) BETWEEN 2 AND 60),
  token_hash      TEXT NOT NULL UNIQUE,
  active          BOOLEAN NOT NULL DEFAULT true,
  created_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS guard_stations_org ON guard_stations (organization_id) WHERE active;

ALTER TABLE access_logs
  ADD COLUMN IF NOT EXISTS station_id UUID REFERENCES guard_stations(id) ON DELETE SET NULL;

-- Solo la administración del condominio ve sus casetas. Escritura solo por
-- service role. (El REVOKE de columna no le gana al GRANT de tabla que Supabase
-- da a `authenticated`: un admin podría leer el hash. No sirve de nada sin el
-- token, y la UI nunca lo pide.)
ALTER TABLE guard_stations ENABLE ROW LEVEL SECURITY;
REVOKE INSERT, UPDATE, DELETE ON guard_stations FROM anon, authenticated;
REVOKE SELECT (token_hash) ON guard_stations FROM anon, authenticated;

DROP POLICY IF EXISTS "Admins ven las casetas" ON guard_stations;
CREATE POLICY "Admins ven las casetas" ON guard_stations
  FOR SELECT TO authenticated
  USING (organization_id = public.user_org_id() AND public.user_role() IN ('admin', 'super_admin'));
