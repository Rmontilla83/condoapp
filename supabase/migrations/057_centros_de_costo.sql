-- 057 · Centros de costo de los gastos
--
-- Además de la categoría (qué se compró), cada gasto dice a qué parte del
-- condominio corresponde: piscina, marina, torre A… La lista la mantiene cada
-- condominio. Un centro con gastos no se borra: se retira y conserva su historial.
--
-- ADITIVA: va antes que el código.
CREATE TABLE IF NOT EXISTS cost_centers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL CHECK (length(btrim(name)) BETWEEN 2 AND 60),
  active          BOOLEAN NOT NULL DEFAULT true,
  position        INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_cost_centers_nombre
  ON cost_centers (organization_id, lower(btrim(name)));

ALTER TABLE expense_records
  ADD COLUMN IF NOT EXISTS cost_center_id UUID REFERENCES cost_centers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_expense_records_cost_center
  ON expense_records (cost_center_id) WHERE cost_center_id IS NOT NULL;

-- Todos los vecinos ven el nombre, porque ven los gastos. Escribe el servidor.
ALTER TABLE cost_centers ENABLE ROW LEVEL SECURITY;
REVOKE INSERT, UPDATE, DELETE ON cost_centers FROM anon, authenticated;

DROP POLICY IF EXISTS "El condominio ve sus centros de costo" ON cost_centers;
CREATE POLICY "El condominio ve sus centros de costo" ON cost_centers
  FOR SELECT TO authenticated
  USING (organization_id = public.user_org_id());
