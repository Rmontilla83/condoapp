-- 059 · Otros ingresos
--
-- Dinero que entra al condominio sin ser el pago de un recibo: alquiler de un
-- espacio, uso de un área, intereses del banco. Hasta hoy no tenía dónde
-- cargarse, y el balance no cuadraba con el banco.
-- Como un gasto: visible para todos, y se anula con motivo, no se borra.
--
-- ADITIVA: va antes que el código. Necesita la 057 (centros de costo).
CREATE TABLE IF NOT EXISTS other_incomes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  income_date     DATE NOT NULL,
  description     TEXT NOT NULL CHECK (length(btrim(description)) BETWEEN 3 AND 200),
  source          TEXT,
  amount          NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  payment_method  TEXT NOT NULL DEFAULT 'bank' CHECK (payment_method IN ('bank', 'cash')),
  receipt_url     TEXT,
  cost_center_id  UUID REFERENCES cost_centers(id) ON DELETE SET NULL,
  recorded_by     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  voided_at       TIMESTAMPTZ,
  voided_reason   TEXT,
  CHECK (voided_at IS NULL OR length(btrim(voided_reason)) >= 10)
);

CREATE INDEX IF NOT EXISTS idx_other_incomes_org
  ON other_incomes (organization_id, income_date DESC);

ALTER TABLE other_incomes ENABLE ROW LEVEL SECURITY;
REVOKE INSERT, UPDATE, DELETE ON other_incomes FROM anon, authenticated;

DROP POLICY IF EXISTS "El condominio ve sus otros ingresos" ON other_incomes;
CREATE POLICY "El condominio ve sus otros ingresos" ON other_incomes
  FOR SELECT TO authenticated
  USING (organization_id = public.user_org_id());
