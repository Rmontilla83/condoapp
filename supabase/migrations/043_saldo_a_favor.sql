-- 043 · Saldo a favor por unidad
--
-- El CxC de Costa de Plata trae una columna CREDITO: A 3-5 tenía $238.84 a favor y
-- la app la mostraba como deudora de $404.48. No existía dónde anotar un crédito.
--
-- MODELO: un libro de movimientos (`unit_credits`). El saldo de una unidad es la
-- suma de sus movimientos, nunca un número que se sobrescribe:
--   deposit    (+)  la administración registra un saldo a favor (pago de más,
--                   saldo de apertura, reintegro)
--   applied    (−)  el saldo pagó (toda o parte de) una cuota
--   reversal   (+)  se anuló una cuota que el saldo había pagado: vuelve a la unidad
--   adjustment (±)  corrección manual
--
-- CÓMO SE APLICA (`aplicar_saldo_a_favor`): a las cuotas pendientes de la unidad,
-- la más vieja primero, en la misma moneda. Se saltan las que tienen un
-- comprobante en revisión: el residente ya pagó y aplicar saldo encima sería
-- cobrar dos veces.
--   - Saldo >= cuota: la cuota queda pagada con una transacción aprobada de
--     método 'credit'.
--   - Saldo <  cuota: NO hay pagos parciales en la app (toda la UI asume que una
--     cuota se paga entera). Entonces la cuota se REDUCE al resto, y lo cubierto
--     pasa a una cuota hermana ya pagada, "<descripción> · saldo a favor". La suma
--     de las dos es el cargo original, así que reportes y morosidad no cambian.
--     El recibo queda como en el Excel: total, crédito y diferencia.
--
-- ADITIVA: tabla y funciones nuevas. Va antes que el código.

CREATE TABLE IF NOT EXISTS unit_credits (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  unit_id         UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  amount          NUMERIC(12, 2) NOT NULL CHECK (amount <> 0),
  currency        TEXT NOT NULL DEFAULT 'USD',
  kind            TEXT NOT NULL CHECK (kind IN ('deposit', 'applied', 'reversal', 'adjustment')),
  invoice_id      UUID REFERENCES invoices(id) ON DELETE SET NULL,
  note            TEXT,
  created_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unit_credits_signo CHECK (
    (kind IN ('deposit', 'reversal') AND amount > 0) OR
    (kind = 'applied' AND amount < 0) OR
    kind = 'adjustment'
  )
);

CREATE INDEX IF NOT EXISTS unit_credits_unit ON unit_credits (unit_id, currency);
CREATE INDEX IF NOT EXISTS unit_credits_org  ON unit_credits (organization_id, created_at DESC);

-- Lectura: los miembros de la unidad y la administración del condominio.
-- Escritura: solo por service role y por las funciones de abajo.
ALTER TABLE unit_credits ENABLE ROW LEVEL SECURITY;
REVOKE INSERT, UPDATE, DELETE ON unit_credits FROM anon, authenticated;

DROP POLICY IF EXISTS "Miembros y admins ven el saldo" ON unit_credits;
CREATE POLICY "Miembros y admins ven el saldo" ON unit_credits
  FOR SELECT TO authenticated
  USING (
    public.is_unit_member(unit_id)
    OR (organization_id = public.user_org_id() AND public.user_role() IN ('admin', 'super_admin'))
  );

-- ── Aplicar el saldo de una unidad a sus cuotas pendientes ────────────────────
CREATE OR REPLACE FUNCTION public.aplicar_saldo_a_favor(p_unit UUID, p_actor UUID DEFAULT NULL)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inv      RECORD;
  v_saldo    NUMERIC(12, 2);
  v_aplica   NUMERIC(12, 2);
  v_hermana  UUID;
  v_desc     TEXT;
  v_tocadas  INTEGER := 0;
BEGIN
  -- Dos llamadas simultáneas para la misma unidad gastarían el mismo saldo dos veces.
  PERFORM pg_advisory_xact_lock(hashtext('saldo:' || p_unit::text));

  FOR v_inv IN
    SELECT i.* FROM invoices i
     WHERE i.unit_id = p_unit
       AND i.status IN ('pending', 'overdue')
       AND i.amount > 0
       AND NOT EXISTS (SELECT 1 FROM transactions t
                        WHERE t.invoice_id = i.id AND t.status = 'pending')
     ORDER BY i.due_date, i.created_at, i.description, i.id
     FOR UPDATE
  LOOP
    SELECT COALESCE(sum(amount), 0) INTO v_saldo
      FROM unit_credits WHERE unit_id = p_unit AND currency = v_inv.currency;
    CONTINUE WHEN v_saldo <= 0;

    v_aplica := LEAST(v_saldo, v_inv.amount);

    IF v_aplica = v_inv.amount THEN
      -- Cubre la cuota entera.
      UPDATE invoices SET status = 'paid', updated_at = now() WHERE id = v_inv.id;
      INSERT INTO transactions (invoice_id, amount, currency, payment_method, reference,
                                status, paid_by, reviewed_by, reviewed_at, notes,
                                currency_paid, exchange_rate, amount_bs)
      VALUES (v_inv.id, v_aplica, v_inv.currency, 'credit', 'Saldo a favor',
              'approved', NULL, p_actor, now(), 'Pagada con saldo a favor',
              v_inv.currency, v_inv.exchange_rate,
              CASE WHEN v_inv.exchange_rate IS NOT NULL THEN round(v_aplica * v_inv.exchange_rate, 2) END);
      INSERT INTO unit_credits (organization_id, unit_id, amount, currency, kind, invoice_id, created_by, note)
      VALUES (v_inv.organization_id, p_unit, -v_aplica, v_inv.currency, 'applied', v_inv.id, p_actor,
              v_inv.description);
    ELSE
      -- Cubre una parte: la cuota baja al resto y lo cubierto va a la hermana.
      v_desc := v_inv.description || ' · saldo a favor';
      SELECT id INTO v_hermana FROM invoices
       WHERE unit_id = p_unit AND due_date = v_inv.due_date AND kind = v_inv.kind
         AND lower(btrim(description)) = lower(btrim(v_desc)) AND status <> 'cancelled'
       FOR UPDATE;

      IF v_hermana IS NULL THEN
        INSERT INTO invoices (organization_id, unit_id, amount, currency, description, due_date,
                              status, kind, exchange_rate, amount_bs)
        VALUES (v_inv.organization_id, p_unit, v_aplica, v_inv.currency, v_desc, v_inv.due_date,
                'paid', v_inv.kind, v_inv.exchange_rate,
                CASE WHEN v_inv.exchange_rate IS NOT NULL THEN round(v_aplica * v_inv.exchange_rate, 2) END)
        RETURNING id INTO v_hermana;
      ELSE
        UPDATE invoices
           SET amount = amount + v_aplica,
               amount_bs = CASE WHEN exchange_rate IS NOT NULL
                                THEN round((amount + v_aplica) * exchange_rate, 2) END,
               updated_at = now()
         WHERE id = v_hermana;
      END IF;

      UPDATE invoices
         SET amount = amount - v_aplica,
             amount_bs = CASE WHEN exchange_rate IS NOT NULL
                              THEN round((amount - v_aplica) * exchange_rate, 2) END,
             updated_at = now()
       WHERE id = v_inv.id;

      INSERT INTO transactions (invoice_id, amount, currency, payment_method, reference,
                                status, paid_by, reviewed_by, reviewed_at, notes,
                                currency_paid, exchange_rate, amount_bs)
      VALUES (v_hermana, v_aplica, v_inv.currency, 'credit', 'Saldo a favor',
              'approved', NULL, p_actor, now(), 'Pagada con saldo a favor',
              v_inv.currency, v_inv.exchange_rate,
              CASE WHEN v_inv.exchange_rate IS NOT NULL THEN round(v_aplica * v_inv.exchange_rate, 2) END);
      INSERT INTO unit_credits (organization_id, unit_id, amount, currency, kind, invoice_id, created_by, note)
      VALUES (v_inv.organization_id, p_unit, -v_aplica, v_inv.currency, 'applied', v_hermana, p_actor,
              v_inv.description);
    END IF;

    v_tocadas := v_tocadas + 1;
  END LOOP;

  RETURN v_tocadas;
END;
$$;

-- ── Devolver el saldo de cuotas que se anulan ─────────────────────────────────
-- Lo llama voidInvoiceRun ANTES de cancelar: toda cuota pagada con saldo vuelve
-- a pendiente-anulable y su importe vuelve a la unidad como 'reversal'.
CREATE OR REPLACE FUNCTION public.devolver_saldo_de_cuotas(p_invoices UUID[], p_actor UUID DEFAULT NULL)
RETURNS NUMERIC
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tx    RECORD;
  v_total NUMERIC(12, 2) := 0;
BEGIN
  FOR v_tx IN
    SELECT t.id, t.amount, t.currency, i.id AS invoice_id, i.unit_id, i.organization_id, i.description
      FROM transactions t JOIN invoices i ON i.id = t.invoice_id
     WHERE t.invoice_id = ANY (p_invoices)
       AND t.payment_method = 'credit' AND t.status = 'approved'
     FOR UPDATE OF t
  LOOP
    UPDATE transactions
       SET status = 'rejected',
           rejection_reason = 'Cuota anulada: el saldo a favor volvió a la unidad',
           reviewed_at = now(), reviewed_by = p_actor
     WHERE id = v_tx.id;
    INSERT INTO unit_credits (organization_id, unit_id, amount, currency, kind, invoice_id, created_by, note)
    VALUES (v_tx.organization_id, v_tx.unit_id, v_tx.amount, v_tx.currency, 'reversal', v_tx.invoice_id,
            p_actor, 'Anulada: ' || v_tx.description);
    v_total := v_total + v_tx.amount;
  END LOOP;
  RETURN v_total;
END;
$$;

-- `FROM PUBLIC` no alcanza en Supabase: anon y authenticated tienen EXECUTE propio.
REVOKE ALL ON FUNCTION public.aplicar_saldo_a_favor(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.devolver_saldo_de_cuotas(UUID[], UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.aplicar_saldo_a_favor(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.devolver_saldo_de_cuotas(UUID[], UUID) TO service_role;
