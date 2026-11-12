-- 075: notas internas de la unidad.
--
-- Comentarios que la administración deja sobre un apartamento («paga siempre
-- los 15», «el dueño vive fuera, tratar con la hija») y que SOLO ve la
-- administración: nunca el propietario ni el inquilino.
--
-- La tabla nace con RLS activo y SIN políticas: ningún vecino puede leerla ni
-- escribirla ni por la app ni por la API. Solo la toca el servidor (service
-- role), después de comprobar que quien pide es administración del condominio.
--
-- Una nota no se borra: se retira (retirada_en), para que quede el rastro.
-- `creada_por` es la única clave foránea a profiles, a propósito: una segunda
-- vuelve ambiguas las consultas con `profiles(...)` (ver la 074).

CREATE TABLE IF NOT EXISTS public.unit_notas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  unit_id         UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  texto           TEXT NOT NULL CHECK (length(btrim(texto)) BETWEEN 2 AND 2000),
  creada_por      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  creada_en       TIMESTAMPTZ NOT NULL DEFAULT now(),
  retirada_en     TIMESTAMPTZ,
  retirada_por    UUID
);

CREATE INDEX IF NOT EXISTS unit_notas_unidad_idx ON public.unit_notas (unit_id, creada_en DESC) WHERE retirada_en IS NULL;

ALTER TABLE public.unit_notas ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.unit_notas FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.unit_notas TO service_role;
