-- Limpieza de los datos de PRUEBA de Costa de Plata, antes de operar en real.
--
-- Qué borra (todo lo cargado para el demo del 2026-09-28):
--   · Cuotas de julio y agosto (inventadas) con sus pagos y sus hermanas «· saldo a favor».
--   · Pagos «dato de prueba» en revisión sobre septiembre.
--   · Saldos a favor de prueba, DESHACIENDO lo que se aplicaron sobre las cuotas
--     reales de septiembre y de la marina (vuelven a su monto y a pendiente).
--   · Gastos, comunicados, reservas, pases, averías y proveedores marcados
--     «(dato de prueba)» / «(demo)», y todos los avisos de la campana.
--   · Contacto, horario, normas del conserje y cuentas bancarias ficticias.
--   · La membresía de Rafael como inquilino de Torre A · 1-1.
--
-- Qué conserva: unidades, propietarios, alícuotas, cuotas y marina de
-- septiembre (reales), tasas BCV, áreas comunes, grupo Marina y el comunicado
-- «Bienvenidos a Atryum».
--
-- Carga después los saldos a favor REALES (A 3-5 y C PB-2) y los aplica.
--
-- Uso: con v_modo = 'ensayo' todo se deshace al final y se ve el resumen en el
-- error. Con 'real' queda escrito. Correr primero en ensayo.
DO $$
DECLARE
  v_modo  text := 'ensayo';
  v_org   uuid;
  v_actor uuid;
  v_c     record;
  v_base  uuid;
  v_n     jsonb := '{}';
  v_k     int;
BEGIN
  SELECT id INTO v_org FROM organizations WHERE name = 'Costa de Plata';
  IF v_org IS NULL THEN RAISE EXCEPTION 'No está Costa de Plata'; END IF;
  SELECT id INTO v_actor FROM profiles WHERE email = 'rafaelmontilla8@gmail.com';

  -- ── 1. Deshacer los saldos aplicados sobre cuotas que se quedan ───────────
  FOR v_c IN
    SELECT c.id AS credit_id, c.amount, i.id AS inv_id, i.unit_id, i.due_date, i.kind,
           i.description, i.exchange_rate
      FROM unit_credits c JOIN invoices i ON i.id = c.invoice_id
     WHERE c.organization_id = v_org AND c.kind = 'applied' AND i.due_date >= '2026-09-01'
  LOOP
    IF v_c.description LIKE '% · saldo a favor' THEN
      -- Parcial: el monto vuelve a la cuota original y la hermana desaparece.
      SELECT id INTO v_base FROM invoices
       WHERE unit_id = v_c.unit_id AND due_date = v_c.due_date AND kind = v_c.kind
         AND description = left(v_c.description, length(v_c.description) - length(' · saldo a favor'))
         AND status <> 'cancelled';
      IF v_base IS NULL THEN RAISE EXCEPTION 'Sin cuota original para %', v_c.inv_id; END IF;
      UPDATE invoices
         SET amount = amount + (-v_c.amount),
             amount_bs = CASE WHEN exchange_rate IS NOT NULL THEN round((amount + (-v_c.amount)) * exchange_rate, 2) END,
             updated_at = now()
       WHERE id = v_base;
      DELETE FROM unit_credits WHERE id = v_c.credit_id;
      DELETE FROM invoices WHERE id = v_c.inv_id; -- sus transacciones caen en cascada
    ELSE
      -- Total: la cuota vuelve a pendiente.
      DELETE FROM transactions WHERE invoice_id = v_c.inv_id AND payment_method = 'credit';
      UPDATE invoices SET status = 'pending', updated_at = now() WHERE id = v_c.inv_id;
      DELETE FROM unit_credits WHERE id = v_c.credit_id;
    END IF;
  END LOOP;

  -- ── 2. Julio y agosto: cuotas inventadas con todo lo que cuelga ───────────
  DELETE FROM unit_credits WHERE organization_id = v_org
     AND invoice_id IN (SELECT id FROM invoices WHERE organization_id = v_org AND due_date < '2026-09-01');
  DELETE FROM invoices WHERE organization_id = v_org AND due_date < '2026-09-01';
  GET DIAGNOSTICS v_k = ROW_COUNT; v_n := v_n || jsonb_build_object('cuotas_jul_ago', v_k);

  -- ── 3. Pagos de prueba en revisión y saldos de prueba restantes ───────────
  DELETE FROM transactions t USING invoices i
   WHERE i.id = t.invoice_id AND i.organization_id = v_org AND t.notes = 'dato de prueba';
  GET DIAGNOSTICS v_k = ROW_COUNT; v_n := v_n || jsonb_build_object('pagos_prueba_sep', v_k);
  DELETE FROM unit_credits WHERE organization_id = v_org;
  GET DIAGNOSTICS v_k = ROW_COUNT; v_n := v_n || jsonb_build_object('saldos_prueba', v_k);

  -- ── 4. Resto de módulos ───────────────────────────────────────────────────
  DELETE FROM expense_records WHERE organization_id = v_org AND description LIKE '%(dato de prueba)';
  GET DIAGNOSTICS v_k = ROW_COUNT; v_n := v_n || jsonb_build_object('gastos', v_k);
  DELETE FROM announcements WHERE organization_id = v_org AND title LIKE '%(dato de prueba)';
  GET DIAGNOSTICS v_k = ROW_COUNT; v_n := v_n || jsonb_build_object('comunicados', v_k);
  DELETE FROM reservations r USING common_areas a
   WHERE a.id = r.common_area_id AND a.organization_id = v_org AND r.notes = 'dato de prueba';
  GET DIAGNOSTICS v_k = ROW_COUNT; v_n := v_n || jsonb_build_object('reservas', v_k);
  DELETE FROM access_passes WHERE organization_id = v_org AND visitor_name LIKE '%(dato de prueba)';
  GET DIAGNOSTICS v_k = ROW_COUNT; v_n := v_n || jsonb_build_object('pases', v_k);
  DELETE FROM maintenance_requests WHERE organization_id = v_org AND title LIKE '%(dato de prueba)';
  GET DIAGNOSTICS v_k = ROW_COUNT; v_n := v_n || jsonb_build_object('averias', v_k);
  DELETE FROM service_providers WHERE organization_id = v_org AND name LIKE '%(demo)';
  GET DIAGNOSTICS v_k = ROW_COUNT; v_n := v_n || jsonb_build_object('proveedores', v_k);
  DELETE FROM notifications WHERE organization_id = v_org;
  GET DIAGNOSTICS v_k = ROW_COUNT; v_n := v_n || jsonb_build_object('avisos', v_k);
  DELETE FROM packages p USING units u WHERE u.id = p.unit_id AND u.organization_id = v_org;
  GET DIAGNOSTICS v_k = ROW_COUNT; v_n := v_n || jsonb_build_object('paquetes', v_k);

  UPDATE organizations SET
    contact_phone = NULL, contact_email = NULL, office_hours = NULL,
    concierge_notes = NULL, bank_accounts = '[]'::jsonb
  WHERE id = v_org;

  DELETE FROM unit_members um USING units u
   WHERE u.id = um.unit_id AND u.organization_id = v_org
     AND um.profile_id = v_actor AND um.role = 'tenant';
  GET DIAGNOSTICS v_k = ROW_COUNT; v_n := v_n || jsonb_build_object('rafael_inquilino', v_k);

  -- ── 5. Saldos a favor reales (planilla de CxC de la junta) ────────────────
  INSERT INTO unit_credits (organization_id, unit_id, amount, kind, note, created_by)
  SELECT v_org, u.id, x.monto, 'deposit', 'Saldo a favor al 31/08/2026 (planilla de la junta)', v_actor
    FROM units u
    JOIN (VALUES ('Torre A', '3-5', 238.84), ('Torre C', 'PB-2', 15.49)) AS x(torre, apto, monto)
      ON u.block = x.torre AND u.unit_number = x.apto
   WHERE u.organization_id = v_org;
  GET DIAGNOSTICS v_k = ROW_COUNT;
  IF v_k <> 2 THEN RAISE EXCEPTION 'Esperaba 2 saldos reales, cargué %', v_k; END IF;
  PERFORM public.aplicar_saldo_a_favor(u.id, v_actor)
     FROM units u WHERE u.organization_id = v_org
      AND EXISTS (SELECT 1 FROM unit_credits c WHERE c.unit_id = u.id);

  -- ── Verificación ──────────────────────────────────────────────────────────
  IF EXISTS (SELECT 1 FROM invoices WHERE organization_id = v_org AND description LIKE '%saldo a favor%'
              AND unit_id NOT IN (SELECT unit_id FROM unit_credits WHERE organization_id = v_org)) THEN
    RAISE EXCEPTION 'Quedó una hermana «saldo a favor» huérfana';
  END IF;

  v_n := v_n || jsonb_build_object(
    'cuotas_quedan', (SELECT count(*) FROM invoices WHERE organization_id = v_org),
    'sep_pendientes', (SELECT count(*) FROM invoices WHERE organization_id = v_org AND description = 'Cuota 09/2026' AND status = 'pending'),
    'sep_total', (SELECT sum(amount) FROM invoices WHERE organization_id = v_org AND description LIKE 'Cuota 09/2026%'),
    'marina_total', (SELECT sum(amount) FROM invoices WHERE organization_id = v_org AND description LIKE 'Marina 09/2026%'),
    'pagadas', (SELECT count(*) FROM invoices WHERE organization_id = v_org AND status = 'paid'),
    'transacciones', (SELECT count(*) FROM transactions t JOIN invoices i ON i.id = t.invoice_id WHERE i.organization_id = v_org),
    'saldo_neto', (SELECT sum(amount) FROM unit_credits WHERE organization_id = v_org));

  IF v_modo = 'ensayo' THEN
    RAISE EXCEPTION 'ENSAYO OK (nada se guardó): %', v_n;
  END IF;
  RAISE NOTICE 'PURGA HECHA: %', v_n;
END $$;
