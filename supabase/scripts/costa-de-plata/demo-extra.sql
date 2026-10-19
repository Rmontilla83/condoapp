-- Datos de ejemplo adicionales para la demo de Costa de Plata (2026-10-19).
-- Autorizado por Rafael para el video explicativo y para que la junta los pruebe.
-- Todo es ficticio y restaurar.py lo borra junto con el resto de la operación demo.
--
--   1. Una encuesta abierta con votos de vecinos ficticios.
--   2. El presupuesto 2026 aprobado, con montos cercanos a lo ejecutado.
--   3. Dos averías del apartamento de la vista «como residente» (una en curso, una resuelta).
--
-- Es idempotente: si ya existen (mismo título / año), no duplica.
DO $$
DECLARE
  v_org uuid := '29c3644c-eef8-40dd-aa6c-d26ead566d4f';
  v_actor uuid;
  v_unidad uuid;
  v_dec uuid;
  v_q uuid;
  v_bud uuid;
  v_req uuid;
BEGIN
  SELECT id INTO v_actor FROM profiles WHERE email = 'rafaelmontilla8@gmail.com';
  SELECT u.id INTO v_unidad FROM units u
    JOIN unit_members um ON um.unit_id = u.id AND um.profile_id = v_actor
   WHERE u.organization_id = v_org
   LIMIT 1;

  -- 1. Encuesta abierta
  IF NOT EXISTS (SELECT 1 FROM decisions WHERE organization_id = v_org AND title = '¿Pintamos las fachadas de las tres torres en 2027?') THEN
    INSERT INTO decisions (organization_id, created_by, kind, title, description, status, closes_at, created_at)
    VALUES (v_org, v_actor, 'quick_poll',
            '¿Pintamos las fachadas de las tres torres en 2027?',
            'La junta recibió tres presupuestos. La opción en dos etapas reparte el costo en 2027 y 2028. Un voto por propietario.',
            'open', now() + interval '12 days', now() - interval '3 days')
    RETURNING id INTO v_dec;
    INSERT INTO decision_questions (decision_id, question, options, position)
    VALUES (v_dec, '¿Pintamos las fachadas de las tres torres en 2027?',
            '["Sí, todo en 2027", "Sí, en dos etapas (2027 y 2028)", "No por ahora"]'::jsonb, 0)
    RETURNING id INTO v_q;
    -- 37 votos de propietarios ficticios de la demo (no del usuario de la vista residente).
    INSERT INTO decision_responses (question_id, voter_id, selected_option, weight, created_at)
    SELECT v_q, x.profile_id,
           CASE WHEN x.n % 7 IN (0, 1, 2) THEN 'Sí, en dos etapas (2027 y 2028)'
                WHEN x.n % 7 IN (3, 4) THEN 'Sí, todo en 2027'
                ELSE 'No por ahora' END,
           1.0, now() - (x.n || ' hours')::interval
      FROM (SELECT s.profile_id, row_number() OVER (ORDER BY s.profile_id) AS n
              FROM (SELECT DISTINCT um.profile_id
                      FROM unit_members um JOIN units u ON u.id = um.unit_id
                     WHERE u.organization_id = v_org AND um.role = 'owner' AND um.profile_id <> v_actor) s) x
     WHERE x.n <= 37;
  END IF;

  -- 2. Presupuesto 2026 aprobado
  IF NOT EXISTS (SELECT 1 FROM org_budgets WHERE organization_id = v_org AND year = 2026) THEN
    INSERT INTO org_budgets (organization_id, year, status, approved_at, notes)
    VALUES (v_org, 2026, 'approved', '2026-06-15 10:00-04', 'Aprobado en asamblea ordinaria (datos de demostración).')
    RETURNING id INTO v_bud;
  ELSE
    SELECT id INTO v_bud FROM org_budgets WHERE organization_id = v_org AND year = 2026;
    UPDATE org_budgets SET status = 'approved', approved_at = COALESCE(approved_at, '2026-06-15 10:00-04') WHERE id = v_bud;
  END IF;
  -- Monto mensual: lo gastado de junio a septiembre entre 4, redondeado a la decena y con 8 % de holgura.
  INSERT INTO org_budget_items (budget_id, category_id, monthly_amount)
  SELECT v_bud, e.category_id, round(sum(e.amount) / 4 * 1.08 / 10) * 10
    FROM expense_records e
   WHERE e.organization_id = v_org AND e.voided_at IS NULL
     AND (e.currency IS NULL OR e.currency = 'USD')
     AND e.expense_date BETWEEN '2026-06-01' AND '2026-09-30'
   GROUP BY e.category_id
  ON CONFLICT (budget_id, category_id) DO UPDATE SET monthly_amount = EXCLUDED.monthly_amount;

  -- 3. Averías del apartamento de la vista residente
  IF v_unidad IS NOT NULL AND NOT EXISTS (SELECT 1 FROM maintenance_requests WHERE organization_id = v_org AND title = 'Filtración en el techo del baño') THEN
    INSERT INTO maintenance_requests (organization_id, unit_id, reported_by, title, description, category, priority, status, assigned_to, estimated_date, created_at, updated_at)
    VALUES (v_org, v_unidad, v_actor, 'Filtración en el techo del baño',
            'Sale una mancha de humedad en el techo del baño principal, parece venir del apartamento de arriba.',
            'plumbing', 'high', 'in_progress', 'Plomería El Faro', current_date + 2,
            now() - interval '4 days', now() - interval '1 day')
    RETURNING id INTO v_req;
    INSERT INTO maintenance_status_log (request_id, old_status, new_status, changed_by, note, created_at) VALUES
      (v_req, NULL, 'new', v_actor, NULL, now() - interval '4 days'),
      (v_req, 'new', 'in_review', v_actor, 'El conserje revisó el apartamento de arriba.', now() - interval '3 days'),
      (v_req, 'in_review', 'in_progress', v_actor, 'Plomería El Faro viene el jueves a cambiar la tubería.', now() - interval '1 day');

    INSERT INTO maintenance_requests (organization_id, unit_id, reported_by, title, description, category, priority, status, resolved_at, created_at, updated_at)
    VALUES (v_org, v_unidad, v_actor, 'Bombillo quemado en el pasillo del piso 1',
            'El bombillo frente al ascensor del piso 1 no enciende.', 'electrical', 'low', 'resolved',
            now() - interval '9 days', now() - interval '12 days', now() - interval '9 days')
    RETURNING id INTO v_req;
    INSERT INTO maintenance_status_log (request_id, old_status, new_status, changed_by, note, created_at) VALUES
      (v_req, NULL, 'new', v_actor, NULL, now() - interval '12 days'),
      (v_req, 'new', 'resolved', v_actor, 'Cambiado por el personal de mantenimiento.', now() - interval '9 days');
  END IF;

  RAISE NOTICE 'demo extra: decision %, presupuesto %, unidad %', v_dec, v_bud, v_unidad;
END $$;

SELECT
  (SELECT count(*) FROM decisions WHERE organization_id = '29c3644c-eef8-40dd-aa6c-d26ead566d4f') AS decisiones,
  (SELECT count(*) FROM decision_responses r JOIN decision_questions q ON q.id = r.question_id
     JOIN decisions d ON d.id = q.decision_id WHERE d.organization_id = '29c3644c-eef8-40dd-aa6c-d26ead566d4f') AS votos,
  (SELECT count(*) FROM org_budget_items i JOIN org_budgets b ON b.id = i.budget_id
     WHERE b.organization_id = '29c3644c-eef8-40dd-aa6c-d26ead566d4f' AND b.year = 2026) AS partidas,
  (SELECT count(*) FROM maintenance_requests WHERE organization_id = '29c3644c-eef8-40dd-aa6c-d26ead566d4f'
     AND title IN ('Filtración en el techo del baño', 'Bombillo quemado en el pasillo del piso 1')) AS averias;
