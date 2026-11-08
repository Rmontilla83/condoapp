-- 063 · Verificación de la carga
--
-- Matriz por unidad para comparar, dato por dato, lo que entrega un condominio
-- al migrar contra sus documentos. No cambia cuotas, alícuotas ni propietarios:
-- solo registra el estado de cada dato y quién lo aclaró.
--
-- El contenido se carga desde fuera del repositorio porque es de un cliente
-- real. No guarda correos ni teléfonos, solo si existen.
--
-- ADITIVA: va antes que el código.
CREATE TABLE IF NOT EXISTS verificacion_carga (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  unit_id         UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  campo           TEXT NOT NULL CHECK (campo IN ('alicuota', 'puesto', 'propietario', 'marina', 'contacto')),
  estado          TEXT NOT NULL CHECK (estado IN ('verde', 'amarillo', 'rojo')),
  -- De dónde sale la comparación («Documento del Edificio A, págs. 32-33»).
  fuente          TEXT,
  valor_fuente    TEXT,
  valor_planilla  TEXT,
  motivo          TEXT,
  -- Título común a varias unidades con una misma causa: se aclaran juntas.
  hallazgo        TEXT,
  aclaracion      TEXT,
  aclarado_por    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  aclarado_en     TIMESTAMPTZ,
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (unit_id, campo),
  CHECK ((aclarado_en IS NULL) = (aclaracion IS NULL)),
  CHECK (aclaracion IS NULL OR length(btrim(aclaracion)) >= 5)
);

CREATE INDEX IF NOT EXISTS verificacion_carga_org_idx ON verificacion_carga (organization_id);

-- Solo la administración la ve y solo el servidor la escribe, con cliente de
-- servicio y tras comprobar el rol. Sin políticas: nadie entra por PostgREST.
ALTER TABLE verificacion_carga ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON verificacion_carga FROM anon, authenticated;
