-- 062 · Anular una tanda con un recibo en $0
--
-- Una unidad exenta (alícuota 0) recibe un recibo de $0. Al anular la tanda, la
-- nota de crédito de ese recibo violaba CHECK (amount > 0) y fallaba la anulación
-- COMPLETA: ningún recibo de la tanda se podía anular.
--
-- Un recibo en $0 no tiene nada que reversar: se cancela sin nota de crédito y sin
-- gastar un número del correlativo. El resto de la función es igual a la de la 052.
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

    IF v_inv.amount > 0 THEN
      UPDATE organizations SET credit_note_seq = credit_note_seq + 1
       WHERE id = v_inv.organization_id RETURNING credit_note_seq INTO v_numero;

      INSERT INTO credit_notes (organization_id, number, invoice_id, unit_id, amount, currency,
                                exchange_rate, amount_bs, reason, created_by)
      VALUES (v_inv.organization_id, v_numero, v_inv.id, v_inv.unit_id, v_inv.amount, v_inv.currency,
              v_inv.exchange_rate, v_inv.amount_bs, p_motivo, p_actor);
    END IF;

    v_anuladas := v_anuladas + 1;
    v_monto := v_monto + v_inv.amount;
  END LOOP;

  RETURN jsonb_build_object('anuladas', v_anuladas, 'saltadas', v_saltadas,
                            'devuelto', v_devuelto, 'monto', v_monto);
END;
$$;

REVOKE ALL ON FUNCTION public.anular_recibos(UUID[], UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.anular_recibos(UUID[], UUID, TEXT) TO service_role;
