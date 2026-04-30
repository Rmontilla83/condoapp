-- ============================================
-- 016 — Fee modes, bank accounts, invoice kind, payment groups
-- ============================================
-- Habilita 4 modos de cobranza (flat / by_aliquot / by_type / manual),
-- datos bancarios JSONB en organizations, derramas extraordinarias en
-- invoices, vinculación 1 comprobante ↔ N transactions vía payment_group_id,
-- y tabla fee_type_amounts para precios por tipo de unidad.

-- ============================================
-- 1. organizations: fee_mode + fee_base_amount + bank_accounts + late_fee_pct
-- ============================================
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS fee_mode TEXT NOT NULL DEFAULT 'flat'
    CHECK (fee_mode IN ('flat', 'by_aliquot', 'by_type', 'manual')),
  ADD COLUMN IF NOT EXISTS fee_base_amount NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS bank_accounts JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS late_fee_pct NUMERIC(5,2);

COMMENT ON COLUMN organizations.fee_mode IS
  'flat | by_aliquot (fee_base_amount * unit.aliquot/100) | by_type (lookup fee_type_amounts) | manual (override por unidad cada generación)';
COMMENT ON COLUMN organizations.fee_base_amount IS
  'Solo usado cuando fee_mode=by_aliquot. Total mensual del condo a derramar.';
COMMENT ON COLUMN organizations.bank_accounts IS
  'Array JSONB de cuentas bancarias del condo. Schema validado en server. Max 12.';
COMMENT ON COLUMN organizations.late_fee_pct IS
  'Recargo % por mora. NULL=sin recargo. SIN LÓGICA DE APLICACIÓN — épica futura.';

-- ============================================
-- 2. invoices: kind + DROP payment_url + UNIQUE constraint
-- ============================================
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'monthly'
    CHECK (kind IN ('monthly', 'extraordinary'));

COMMENT ON COLUMN invoices.kind IS
  'monthly: cuota recurrente | extraordinary: derrama puntual con due_date libre';

-- Borrar columna legacy de payment links (Stripe/Débito Inmediato) que nunca se conectó.
ALTER TABLE invoices DROP COLUMN IF EXISTS payment_url;

-- UNIQUE: previene duplicados (race-condition de 2 admins clickando "generar").
-- Incluye description para permitir múltiples derramas mismo día con descripciones distintas.
ALTER TABLE invoices
  DROP CONSTRAINT IF EXISTS unique_invoice_per_unit_period;
ALTER TABLE invoices
  ADD CONSTRAINT unique_invoice_per_unit_period
  UNIQUE (unit_id, due_date, kind, description);

-- ============================================
-- 3. transactions: payment_group_id (vincula 1 comprobante a N transactions)
-- ============================================
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS payment_group_id UUID;

COMMENT ON COLUMN transactions.payment_group_id IS
  'Mismo UUID en N transactions cuando 1 comprobante cubre múltiples invoices. NULL=pago individual.';

CREATE INDEX IF NOT EXISTS idx_transactions_payment_group
  ON transactions(payment_group_id)
  WHERE payment_group_id IS NOT NULL;

-- ============================================
-- 4. fee_type_amounts (precios por tipo de unidad)
-- ============================================
CREATE TABLE IF NOT EXISTS fee_type_amounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  unit_type TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, unit_type)
);

CREATE INDEX IF NOT EXISTS idx_fee_type_amounts_org ON fee_type_amounts(organization_id);

ALTER TABLE fee_type_amounts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Members view fee_type_amounts in their org') THEN
    CREATE POLICY "Members view fee_type_amounts in their org"
      ON fee_type_amounts FOR SELECT TO authenticated
      USING (organization_id = public.user_org_id());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins manage fee_type_amounts') THEN
    CREATE POLICY "Admins manage fee_type_amounts"
      ON fee_type_amounts FOR ALL TO authenticated
      USING (organization_id = public.user_org_id() AND public.user_role() IN ('admin', 'super_admin'));
  END IF;
END $$;

-- Trigger updated_at
DROP TRIGGER IF EXISTS set_updated_at_fee_type_amounts ON fee_type_amounts;
CREATE TRIGGER set_updated_at_fee_type_amounts
  BEFORE UPDATE ON fee_type_amounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 5. Reload PostgREST schema cache
-- ============================================
NOTIFY pgrst, 'reload schema';
