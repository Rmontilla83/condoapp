-- 053 · Cobranza: convenios de pago e intereses de mora
--
-- CONVENIO: la unidad se compromete a pagar su deuda vencida en N cuotas
-- mensuales. NO reemplaza ni anula los recibos (son títulos ejecutivos): es un
-- calendario. Los pagos se siguen aplicando a los recibos más antiguos, y el
-- convenio está «al día» si lo pagado desde su firma alcanza lo que el
-- calendario pedía a la fecha. Mientras está al día, la unidad puede reservar
-- y no recibe recordatorios de morosidad ni intereses.
--
-- INTERESES: organizations.late_fee_pct (existía desde la 016 sin lógica) es
-- una tasa ANUAL. El 3 % es el interés legal (Código Civil art. 1.746); más
-- que eso tiene que estar aprobado: late_fee_acta guarda la referencia.
--
-- ADITIVA.

CREATE TABLE IF NOT EXISTS payment_plans (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  unit_id          UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  total            NUMERIC(12, 2) NOT NULL CHECK (total > 0),
  installments     INT NOT NULL CHECK (installments BETWEEN 2 AND 36),
  first_due        DATE NOT NULL,
  notes            TEXT,
  status           TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_by       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at        TIMESTAMPTZ,
  closed_reason    TEXT
);

-- Un solo convenio activo por unidad.
CREATE UNIQUE INDEX IF NOT EXISTS payment_plans_uno_activo
  ON payment_plans (unit_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS payment_plans_org ON payment_plans (organization_id);

ALTER TABLE payment_plans ENABLE ROW LEVEL SECURITY;
REVOKE INSERT, UPDATE, DELETE ON payment_plans FROM anon, authenticated;
DROP POLICY IF EXISTS "Convenios visibles" ON payment_plans;
CREATE POLICY "Convenios visibles" ON payment_plans FOR SELECT TO authenticated
  USING (
    (organization_id = public.user_org_id() AND public.user_role() IN ('admin', 'super_admin'))
    OR EXISTS (SELECT 1 FROM unit_members um
                WHERE um.unit_id = payment_plans.unit_id AND um.profile_id = auth.uid() AND um.active)
  );

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS late_fee_acta TEXT;
COMMENT ON COLUMN organizations.late_fee_pct IS 'Interés de mora ANUAL (%). 3 = interés legal (CC art. 1.746).';
COMMENT ON COLUMN organizations.late_fee_acta IS 'Acta o documento que aprueba una tasa de mora mayor al 3 % anual.';
