-- 051 · Variantes del logo del condominio
--
-- Un logo horizontal no entra bien en un cuadrado: el menú (fondo marino) usa
-- la versión en negativo y el encabezado del teléfono una versión compacta.
-- Si no están cargadas, la app usa logo_url.
--
-- ADITIVA.

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS logo_dark_url TEXT,
  ADD COLUMN IF NOT EXISTS logo_compact_url TEXT;

COMMENT ON COLUMN organizations.logo_dark_url IS 'Logo para fondo oscuro (menú lateral). Opcional.';
COMMENT ON COLUMN organizations.logo_compact_url IS 'Logo compacto para el encabezado del teléfono. Opcional.';
