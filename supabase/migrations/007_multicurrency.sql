-- Exchange rate table - stores BCV rate history
CREATE TABLE IF NOT EXISTS exchange_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  rate NUMERIC(12,4) NOT NULL,
  source TEXT NOT NULL DEFAULT 'bcv',
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, effective_date, source)
);

CREATE INDEX IF NOT EXISTS idx_exchange_rates_org_date ON exchange_rates(organization_id, effective_date DESC);

ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;

-- Add Bs amount to invoices
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS amount_bs NUMERIC(12,2);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(12,4);

-- Add Bs amount to transactions
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS amount_bs NUMERIC(12,2);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS currency_paid TEXT NOT NULL DEFAULT 'USD';

-- Add payment_url to invoices for Debito Inmediato / Stripe links
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_url TEXT;

-- RLS for exchange_rates
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view exchange rates in their org') THEN
    CREATE POLICY "Users can view exchange rates in their org"
      ON exchange_rates FOR SELECT
      USING (organization_id = public.user_org_id());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage exchange rates') THEN
    CREATE POLICY "Admins can manage exchange rates"
      ON exchange_rates FOR ALL
      USING (organization_id = public.user_org_id() AND public.user_role() IN ('admin', 'super_admin'));
  END IF;
END $$;

-- Seed initial BCV rate
INSERT INTO exchange_rates (organization_id, rate, source, effective_date)
VALUES ('a0000000-0000-0000-0000-000000000001', 36.50, 'bcv', '2026-04-12')
ON CONFLICT (organization_id, effective_date, source) DO NOTHING;

-- Update existing invoices with Bs amounts
UPDATE invoices
SET exchange_rate = 36.50,
    amount_bs = amount * 36.50
WHERE organization_id = 'a0000000-0000-0000-0000-000000000001'
  AND exchange_rate IS NULL;
