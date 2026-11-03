-- 058 · Fondo de reserva
--
-- No es obligatorio en Venezuela: el porcentaje y sus usos los decide cada
-- condominio. Sigue la regla del libro: el saldo se DERIVA de los documentos.
--   + saldo inicial, aportes adicionales y ajustes  (reserve_fund_movements)
--   + la parte de cada cuota destinada al fondo      (invoices.reserve_amount)
--   - los gastos pagados con el fondo                (expense_records.paid_from_reserve)
--
-- ADITIVA: va antes que el código.
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS reserve_fund_pct NUMERIC(5, 2)
    CHECK (reserve_fund_pct IS NULL OR (reserve_fund_pct >= 0 AND reserve_fund_pct <= 100)),
  ADD COLUMN IF NOT EXISTS reserve_fund_acta TEXT;

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS reserve_amount NUMERIC(12, 2) NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invoices_reserve_amount_valido') THEN
    ALTER TABLE invoices ADD CONSTRAINT invoices_reserve_amount_valido
      CHECK (reserve_amount >= 0 AND reserve_amount <= amount);
  END IF;
END $$;

ALTER TABLE expense_records
  ADD COLUMN IF NOT EXISTS paid_from_reserve BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reserve_acta TEXT;

-- Los gastos solo los escribe el servidor (finanzas/actions.ts, con cliente de
-- servicio). Por PostgREST, un admin podía marcar paid_from_reserve sin acta ni
-- saldo, o poner el centro de costo de otro condominio.
REVOKE INSERT, UPDATE, DELETE ON expense_records FROM anon, authenticated;

CREATE TABLE IF NOT EXISTS reserve_fund_movements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  kind            TEXT NOT NULL CHECK (kind IN ('opening', 'contribution', 'adjustment')),
  movement_date   DATE NOT NULL,
  amount          NUMERIC(14, 2) NOT NULL CHECK (amount <> 0),
  concept         TEXT NOT NULL CHECK (length(btrim(concept)) >= 3),
  reference       TEXT,
  created_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  voided_at       TIMESTAMPTZ,
  voided_reason   TEXT,
  voided_by       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  CHECK (kind = 'adjustment' OR amount > 0),
  CHECK (voided_at IS NULL OR length(btrim(voided_reason)) >= 10)
);

-- Un solo saldo inicial vivo por condominio.
CREATE UNIQUE INDEX IF NOT EXISTS uq_fondo_saldo_inicial
  ON reserve_fund_movements (organization_id)
  WHERE kind = 'opening' AND voided_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_fondo_movimientos_org
  ON reserve_fund_movements (organization_id, movement_date DESC);

ALTER TABLE reserve_fund_movements ENABLE ROW LEVEL SECURITY;
REVOKE INSERT, UPDATE, DELETE ON reserve_fund_movements FROM anon, authenticated;

DROP POLICY IF EXISTS "El condominio ve su fondo de reserva" ON reserve_fund_movements;
CREATE POLICY "El condominio ve su fondo de reserva" ON reserve_fund_movements
  FOR SELECT TO authenticated
  USING (organization_id = public.user_org_id());

-- La parte de la cuota que va al fondo también es inmutable tras emitir.
CREATE OR REPLACE FUNCTION public.proteger_recibo()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_setting('atryum.mantenimiento', true) = 'on' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Un recibo emitido no se borra: se anula con una nota de crédito (LPH art. 14).'
      USING ERRCODE = 'P0001';
  END IF;
  IF NEW.organization_id IS DISTINCT FROM OLD.organization_id
     OR NEW.unit_id        IS DISTINCT FROM OLD.unit_id
     OR NEW.amount         IS DISTINCT FROM OLD.amount
     OR NEW.reserve_amount IS DISTINCT FROM OLD.reserve_amount
     OR NEW.currency       IS DISTINCT FROM OLD.currency
     OR NEW.description    IS DISTINCT FROM OLD.description
     OR NEW.due_date       IS DISTINCT FROM OLD.due_date
     OR NEW.kind           IS DISTINCT FROM OLD.kind
     OR NEW.exchange_rate  IS DISTINCT FROM OLD.exchange_rate
     OR NEW.amount_bs      IS DISTINCT FROM OLD.amount_bs
     OR NEW.receipt_number IS DISTINCT FROM OLD.receipt_number
     OR NEW.created_at     IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Un recibo emitido no se modifica. Anúlalo con nota de crédito y emite uno nuevo.'
      USING ERRCODE = 'P0001';
  END IF;
  IF OLD.status = 'cancelled' AND NEW.status <> 'cancelled' THEN
    RAISE EXCEPTION 'Un recibo anulado no se reactiva.' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;
