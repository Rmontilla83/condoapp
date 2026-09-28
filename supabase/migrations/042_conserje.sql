-- 042 · Conserje: contacto de la administración y registro de uso del bot
--
-- 1) Contacto de la administración. El conserje responde "¿cuál es el teléfono
--    de la administración?" y hasta hoy ese dato no existía en ningún lado.
--    `concierge_notes` es texto libre de la junta para lo que no tiene tabla
--    (horario del conserje humano, dónde se deja la basura, reglas de la marina).
--
-- 2) `concierge_messages`: una fila por pregunta. Sirve para limitar cuántas
--    preguntas hace un residente por día (cada una cuesta dinero en la API) y
--    para saber cuánto gasta el bot por condominio. NO guarda el texto de la
--    conversación: preguntas y respuestas pueden traer la deuda de la persona.
--    Sin políticas RLS: solo la service role escribe y lee.
--
-- ADITIVA: columnas nulas y una tabla nueva. Va antes que el código.

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS contact_phone   TEXT,
  ADD COLUMN IF NOT EXISTS contact_email   TEXT,
  ADD COLUMN IF NOT EXISTS office_hours    TEXT,
  ADD COLUMN IF NOT EXISTS concierge_notes TEXT;

CREATE TABLE IF NOT EXISTS concierge_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  profile_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  input_tokens    INTEGER NOT NULL DEFAULT 0,
  output_tokens   INTEGER NOT NULL DEFAULT 0,
  tools_used      TEXT[] NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS concierge_messages_profile_created
  ON concierge_messages (profile_id, created_at DESC);

ALTER TABLE concierge_messages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON concierge_messages FROM anon, authenticated;
