-- 052 · El recibo como título ejecutivo (LPH art. 14), abonos y saldo de apertura
--
-- Plan del piloto §0.7–0.9 (docs/plan-piloto-contabilidad-bot.md):
--
--  1. Número de recibo CORRELATIVO por condominio. Contador en organizations
--     con UPDATE … RETURNING dentro del mismo INSERT: dos admins emitiendo a la
--     vez no pueden sacar el mismo número (max()+1 sí podría). Serie continua,
--     un número anulado no se reusa.
--  2. INMUTABLE una vez emitido: ni el monto, ni el concepto, ni el
--     vencimiento, ni el número. Tampoco se borra. Se ANULA, con una nota de
--     crédito numerada en su propia serie.
--  3. ABONOS: la cuota lleva lo pagado (`paid_amount`) y pasa a 'partial'.
--     Lo mantiene un trigger sobre los pagos aprobados; nadie lo escribe a mano.
--     El saldo a favor ahora abona la cuota en vez de partirla en dos.
--  4. SALDO DE APERTURA: kind 'opening', la deuda previa a Atryum. No lleva
--     número de recibo (no lo emitió Atryum).
--  5. kind 'interest' para los intereses de mora (paso 2).
--
-- Escape controlado: `SET LOCAL atryum.mantenimiento = 'on'` desactiva las
-- protecciones dentro de UNA transacción (la purga de datos de prueba lo usa).
-- La service role no lo puede saltar por accidente.
--
-- ADITIVA en columnas; RESTRICTIVA en triggers (el código viejo no modificaba
-- cuotas emitidas, así que no rompe nada en la ventana de despliegue).

BEGIN;

-- ── Columnas ─────────────────────────────────────────────────────────────────
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS receipt_seq     BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS credit_note_seq BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_id          TEXT;

COMMENT ON COLUMN organizations.tax_id IS 'RIF del condominio, para recibos y documentos.';

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS receipt_number BIGINT,
  ADD COLUMN IF NOT EXISTS paid_amount    NUMERIC(12, 2) NOT NULL DEFAULT 0;

ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_status_check;
ALTER TABLE invoices ADD CONSTRAINT invoices_status_check
  CHECK (status IN ('pending', 'partial', 'paid', 'overdue', 'cancelled'));

ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_kind_check;
ALTER TABLE invoices ADD CONSTRAINT invoices_kind_check
  CHECK (kind IN ('monthly', 'extraordinary', 'opening', 'interest'));

-- ── Numeración de lo ya emitido ──────────────────────────────────────────────
WITH numerados AS (
  SELECT id, organization_id,
         row_number() OVER (PARTITION BY organization_id ORDER BY due_date, created_at, id) AS n
    FROM invoices
   WHERE kind <> 'opening' AND receipt_number IS NULL
)
UPDATE invoices i SET receipt_number = n.n FROM numerados n WHERE n.id = i.id;

UPDATE organizations o
   SET receipt_seq = COALESCE((SELECT max(receipt_number) FROM invoices WHERE organization_id = o.id), 0);

CREATE UNIQUE INDEX IF NOT EXISTS invoices_receipt_number_unico
  ON invoices (organization_id, receipt_number) WHERE receipt_number IS NOT NULL;

CREATE OR REPLACE FUNCTION public.asignar_numero_recibo()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.kind <> 'opening' THEN
    -- El UPDATE bloquea la fila del condominio hasta el fin de la transacción:
    -- dos emisiones simultáneas se turnan, nunca comparten número.
    UPDATE organizations SET receipt_seq = receipt_seq + 1
     WHERE id = NEW.organization_id
     RETURNING receipt_seq INTO NEW.receipt_number;
  ELSE
    NEW.receipt_number := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS invoices_numero_recibo ON invoices;
CREATE TRIGGER invoices_numero_recibo BEFORE INSERT ON invoices
  FOR EACH ROW EXECUTE FUNCTION public.asignar_numero_recibo();

-- ── Lo pagado, desde los pagos aprobados ─────────────────────────────────────
UPDATE invoices i
   SET paid_amount = COALESCE((SELECT sum(t.amount) FROM transactions t
                                WHERE t.invoice_id = i.id AND t.status = 'approved'), 0);

CREATE OR REPLACE FUNCTION public.recalcular_cuota(p_invoice UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_inv    RECORD;
  v_pagado NUMERIC(12, 2);
  v_estado TEXT;
BEGIN
  SELECT id, amount, status, paid_amount INTO v_inv FROM invoices WHERE id = p_invoice FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;

  SELECT COALESCE(sum(amount), 0) INTO v_pagado
    FROM transactions WHERE invoice_id = p_invoice AND status = 'approved';

  v_estado := CASE
    WHEN v_inv.status = 'cancelled' THEN 'cancelled'
    WHEN v_pagado >= v_inv.amount THEN 'paid'
    WHEN v_pagado > 0 THEN 'partial'
    -- Sin nada pagado vuelve a pendiente; si está vencida lo dice la fecha
    -- (isInvoiceOverdue), igual que hasta ahora.
    WHEN v_inv.status IN ('paid', 'partial') THEN 'pending'
    ELSE v_inv.status
  END;

  IF v_pagado IS DISTINCT FROM v_inv.paid_amount OR v_estado IS DISTINCT FROM v_inv.status THEN
    UPDATE invoices SET paid_amount = v_pagado, status = v_estado, updated_at = now() WHERE id = p_invoice;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_transacciones_recalculan()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN PERFORM public.recalcular_cuota(OLD.invoice_id); END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') AND (TG_OP = 'INSERT' OR NEW.invoice_id IS DISTINCT FROM OLD.invoice_id
       OR NEW.status IS DISTINCT FROM OLD.status OR NEW.amount IS DISTINCT FROM OLD.amount) THEN
    PERFORM public.recalcular_cuota(NEW.invoice_id);
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS transactions_recalculan_cuota ON transactions;
CREATE TRIGGER transactions_recalculan_cuota AFTER INSERT OR UPDATE OR DELETE ON transactions
  FOR EACH ROW EXECUTE FUNCTION public.trg_transacciones_recalculan();

-- Estados coherentes con lo pagado (datos previos a esta migration).
UPDATE invoices SET status = 'partial'
 WHERE status IN ('pending', 'overdue') AND paid_amount > 0 AND paid_amount < amount;
UPDATE invoices SET status = 'paid'
 WHERE status IN ('pending', 'overdue', 'partial') AND paid_amount >= amount AND amount > 0;

-- ── Inmutabilidad ────────────────────────────────────────────────────────────
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

DROP TRIGGER IF EXISTS invoices_inmutables ON invoices;
CREATE TRIGGER invoices_inmutables BEFORE UPDATE OR DELETE ON invoices
  FOR EACH ROW EXECUTE FUNCTION public.proteger_recibo();

REVOKE DELETE ON invoices FROM anon, authenticated;

-- ── Notas de crédito ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS credit_notes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  number          BIGINT NOT NULL,
  invoice_id      UUID NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,
  unit_id         UUID NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
  amount          NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  currency        TEXT NOT NULL DEFAULT 'USD',
  exchange_rate   NUMERIC(12, 4),
  amount_bs       NUMERIC(14, 2),
  reason          TEXT NOT NULL CHECK (length(btrim(reason)) >= 10),
  created_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, number)
);
CREATE INDEX IF NOT EXISTS credit_notes_invoice ON credit_notes (invoice_id);
CREATE INDEX IF NOT EXISTS credit_notes_unit ON credit_notes (unit_id);

ALTER TABLE credit_notes ENABLE ROW LEVEL SECURITY;
REVOKE INSERT, UPDATE, DELETE ON credit_notes FROM anon, authenticated;
DROP POLICY IF EXISTS "Notas de crédito visibles" ON credit_notes;
CREATE POLICY "Notas de crédito visibles" ON credit_notes FOR SELECT TO authenticated
  USING (
    (organization_id = public.user_org_id() AND public.user_role() IN ('admin', 'super_admin'))
    OR EXISTS (SELECT 1 FROM unit_members um
                WHERE um.unit_id = credit_notes.unit_id AND um.profile_id = auth.uid() AND um.active)
  );

-- Inmutables también: una nota de crédito tampoco se edita ni se borra.
CREATE OR REPLACE FUNCTION public.proteger_nota_credito()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_setting('atryum.mantenimiento', true) = 'on' THEN RETURN COALESCE(NEW, OLD); END IF;
  RAISE EXCEPTION 'Una nota de crédito emitida no se modifica ni se borra.' USING ERRCODE = 'P0001';
END;
$$;
DROP TRIGGER IF EXISTS credit_notes_inmutables ON credit_notes;
CREATE TRIGGER credit_notes_inmutables BEFORE UPDATE OR DELETE ON credit_notes
  FOR EACH ROW EXECUTE FUNCTION public.proteger_nota_credito();

-- ── Anular recibos: siempre con nota de crédito ──────────────────────────────
-- Anula las cuotas que no tengan dinero real aplicado. Lo abonado con saldo a
-- favor vuelve a la unidad; los comprobantes en revisión se rechazan con el
-- motivo. Devuelve cuántas anuló y cuántas saltó por tener pagos reales.
CREATE OR REPLACE FUNCTION public.anular_recibos(p_invoices UUID[], p_actor UUID, p_motivo TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_inv       RECORD;
  v_numero    BIGINT;
  v_anuladas  INT := 0;
  v_saltadas  INT := 0;
  v_devuelto  NUMERIC(12, 2) := 0;
  v_monto     NUMERIC(12, 2) := 0;
BEGIN
  IF length(btrim(coalesce(p_motivo, ''))) < 10 THEN
    RAISE EXCEPTION 'El motivo de la anulación necesita al menos 10 caracteres.';
  END IF;

  FOR v_inv IN
    SELECT * FROM invoices WHERE id = ANY (p_invoices) AND status <> 'cancelled'
     ORDER BY receipt_number NULLS LAST FOR UPDATE
  LOOP
    IF EXISTS (SELECT 1 FROM transactions WHERE invoice_id = v_inv.id
                AND status = 'approved' AND payment_method <> 'credit') THEN
      v_saltadas := v_saltadas + 1;
      CONTINUE;
    END IF;

    v_devuelto := v_devuelto + public.devolver_saldo_de_cuotas(ARRAY[v_inv.id], p_actor);

    UPDATE transactions
       SET status = 'rejected', rejection_reason = 'Recibo anulado por la administración: ' || p_motivo,
           reviewed_at = now(), reviewed_by = p_actor
     WHERE invoice_id = v_inv.id AND status = 'pending';

    UPDATE invoices SET status = 'cancelled', updated_at = now() WHERE id = v_inv.id;

    UPDATE organizations SET credit_note_seq = credit_note_seq + 1
     WHERE id = v_inv.organization_id RETURNING credit_note_seq INTO v_numero;

    INSERT INTO credit_notes (organization_id, number, invoice_id, unit_id, amount, currency,
                              exchange_rate, amount_bs, reason, created_by)
    VALUES (v_inv.organization_id, v_numero, v_inv.id, v_inv.unit_id, v_inv.amount, v_inv.currency,
            v_inv.exchange_rate, v_inv.amount_bs, p_motivo, p_actor);

    v_anuladas := v_anuladas + 1;
    v_monto := v_monto + v_inv.amount;
  END LOOP;

  RETURN jsonb_build_object('anuladas', v_anuladas, 'saltadas', v_saltadas,
                            'devuelto', v_devuelto, 'monto', v_monto);
END;
$$;

-- ── Saldo a favor: ahora abona, no parte la cuota ────────────────────────────
CREATE OR REPLACE FUNCTION public.aplicar_saldo_a_favor(p_unit UUID, p_actor UUID DEFAULT NULL)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_inv     RECORD;
  v_saldo   NUMERIC(12, 2);
  v_aplica  NUMERIC(12, 2);
  v_tocadas INTEGER := 0;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('saldo:' || p_unit::text));

  FOR v_inv IN
    SELECT i.* FROM invoices i
     WHERE i.unit_id = p_unit
       AND i.status IN ('pending', 'overdue', 'partial')
       AND i.amount - i.paid_amount > 0
       AND NOT EXISTS (SELECT 1 FROM transactions t WHERE t.invoice_id = i.id AND t.status = 'pending')
     ORDER BY i.due_date, i.receipt_number NULLS FIRST, i.created_at, i.id
     FOR UPDATE
  LOOP
    SELECT COALESCE(sum(amount), 0) INTO v_saldo
      FROM unit_credits WHERE unit_id = p_unit AND currency = v_inv.currency;
    EXIT WHEN v_saldo <= 0;

    v_aplica := LEAST(v_saldo, v_inv.amount - v_inv.paid_amount);

    INSERT INTO transactions (invoice_id, amount, currency, payment_method, reference,
                              status, paid_by, reviewed_by, reviewed_at, notes,
                              currency_paid, exchange_rate, amount_bs)
    VALUES (v_inv.id, v_aplica, v_inv.currency, 'credit', 'Saldo a favor',
            'approved', NULL, p_actor, now(), 'Abonado con saldo a favor',
            v_inv.currency, v_inv.exchange_rate,
            CASE WHEN v_inv.exchange_rate IS NOT NULL THEN round(v_aplica * v_inv.exchange_rate, 2) END);

    INSERT INTO unit_credits (organization_id, unit_id, amount, currency, kind, invoice_id, created_by, note)
    VALUES (v_inv.organization_id, p_unit, -v_aplica, v_inv.currency, 'applied', v_inv.id, p_actor,
            v_inv.description);

    v_tocadas := v_tocadas + 1;
  END LOOP;

  RETURN v_tocadas;
END;
$$;

REVOKE ALL ON FUNCTION public.recalcular_cuota(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.anular_recibos(UUID[], UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.aplicar_saldo_a_favor(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.asignar_numero_recibo() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_transacciones_recalculan() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.anular_recibos(UUID[], UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.aplicar_saldo_a_favor(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.recalcular_cuota(UUID) TO service_role;

UPDATE organizations SET tax_id = 'J-31724233-5' WHERE name = 'Costa de Plata' AND tax_id IS NULL;

COMMIT;
