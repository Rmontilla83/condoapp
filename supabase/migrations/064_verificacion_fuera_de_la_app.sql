-- 064 · La verificación de la carga sale de la app
--
-- La matriz deja el panel de administración y pasa a un enlace propio en el
-- portal, sin cuenta de Atryum, hasta que todo esté aclarado y se migre. Quien
-- aclara ya no es un usuario de la app: escribe su nombre.
--
-- El enlace se guarda como hash, igual que el de la caseta, y se revoca al
-- terminar la revisión.
--
-- ADITIVA: va antes que el código. El nombre se valida en el servidor y no con
-- un CHECK, para no romper la versión anterior mientras dura el despliegue.
ALTER TABLE verificacion_carga ADD COLUMN IF NOT EXISTS aclarado_nombre TEXT;

CREATE TABLE IF NOT EXISTS verificacion_enlaces (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  token_hash      TEXT NOT NULL UNIQUE,
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT now(),
  revocado_en     TIMESTAMPTZ
);

-- Un solo enlace vivo por condominio: para cambiarlo, se revoca el anterior.
CREATE UNIQUE INDEX IF NOT EXISTS verificacion_enlaces_vivo_idx
  ON verificacion_enlaces (organization_id)
  WHERE revocado_en IS NULL;

-- Solo el servidor la lee, con cliente de servicio. Sin políticas: nadie entra
-- por PostgREST.
ALTER TABLE verificacion_enlaces ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON verificacion_enlaces FROM anon, authenticated;
