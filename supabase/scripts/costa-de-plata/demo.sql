-- Costa de Plata en MODO DEMO (2026-09-29): todo lo operativo es ficticio.
--
-- Borra la operación del condominio (cuotas, pagos, saldos, notas de crédito,
-- convenios, gastos, avisos, reservas, pases, averías, paquetes) y la vuelve a
-- poblar con cuatro meses creíbles (junio–septiembre 2026) con montos
-- INVENTADOS: no son los de la junta. Conserva unidades, alícuotas, áreas,
-- grupo Marina, tasas BCV y proveedores. Los nombres ya se cambiaron con
-- anonimizar.py; los reales vuelven con restaurar.py.
--
-- v_modo = 'ensayo' deshace todo al final y muestra el resumen.
DO $$
DECLARE
  v_modo   text := 'ensayo';
  v_org    uuid;
  v_actor  uuid;
  v_sum    numeric;
  v_grupo  uuid;
  v_sumw   numeric;
  v_mes    record;
  v_u      record;
  v_i      record;
  v_h      int;
  v_hu     int;
  v_perfil text;
  v_paga   text;        -- 'todo' | 'parte' | 'revision' | 'nada'
  v_fecha  date;
  v_tasa   numeric;
  v_monto  numeric;
  v_resta  numeric;
  v_id     uuid;
  v_plan   record;
  v_n      jsonb := '{}';
  h        text;
BEGIN
  SELECT id INTO v_org FROM organizations WHERE name = 'Costa de Plata';
  SELECT id INTO v_actor FROM profiles WHERE email = 'rafaelmontilla8@gmail.com';
  IF v_org IS NULL OR v_actor IS NULL THEN RAISE EXCEPTION 'Falta el condominio o el administrador'; END IF;
  PERFORM set_config('atryum.mantenimiento', 'on', true);

  -- ── 0. Limpiar la operación ────────────────────────────────────────────────
  DELETE FROM payment_plans WHERE organization_id = v_org;
  DELETE FROM credit_notes WHERE organization_id = v_org;
  DELETE FROM unit_credits WHERE organization_id = v_org;
  DELETE FROM invoices WHERE organization_id = v_org;
  DELETE FROM notifications WHERE organization_id = v_org;
  DELETE FROM packages WHERE organization_id = v_org;
  DELETE FROM expense_records WHERE organization_id = v_org;
  DELETE FROM vendors WHERE organization_id = v_org;
  DELETE FROM maintenance_requests WHERE organization_id = v_org;
  DELETE FROM access_passes WHERE organization_id = v_org;
  DELETE FROM reservations r USING common_areas a WHERE a.id = r.common_area_id AND a.organization_id = v_org;
  DELETE FROM announcements WHERE organization_id = v_org;
  UPDATE organizations SET
    receipt_seq = 0, credit_note_seq = 0,
    late_fee_pct = 3, late_fee_acta = 'Interés legal (Código Civil, art. 1.746)',
    contact_phone = '0414-555-0142', contact_email = 'administracion@costadeplata.test',
    concierge_notes = regexp_replace(COALESCE(concierge_notes, ''), '^Datos de prueba[^\n]*\n', ''),
    bank_accounts = replace(bank_accounts::text, ' (demo)', '')::jsonb
  WHERE id = v_org;
  UPDATE service_providers SET name = replace(name, ' (demo)', '') WHERE organization_id = v_org;

  SELECT sum(aliquot) INTO v_sum FROM units WHERE organization_id = v_org;
  SELECT id INTO v_grupo FROM charge_groups WHERE organization_id = v_org AND name = 'Marina';
  SELECT sum(weight) INTO v_sumw FROM charge_group_members WHERE group_id = v_grupo;

  -- ── 1. Saldos de apertura al 31/05/2026 ────────────────────────────────────
  FOR v_u IN SELECT id, ((hashtext(id::text || 'apertura')::bigint + 2147483648) % 100)::int AS h
               FROM units WHERE organization_id = v_org LOOP
    IF v_u.h < 12 THEN
      v_tasa := tasa_bcv_en(v_org, '2026-05-31');
      v_monto := 60 + (v_u.h * 47) % 520;
      INSERT INTO invoices (organization_id, unit_id, amount, description, due_date, status, kind, exchange_rate, amount_bs, created_at)
      VALUES (v_org, v_u.id, v_monto, 'Saldo anterior al 31/05/2026', '2026-05-31', 'pending', 'opening',
              v_tasa, round(v_monto * v_tasa, 2), '2026-06-01 09:00-04');
    ELSIF v_u.h < 16 THEN
      INSERT INTO unit_credits (organization_id, unit_id, amount, kind, note, created_by, created_at)
      VALUES (v_org, v_u.id, 20 + (v_u.h * 13) % 90, 'deposit', 'Saldo de apertura a favor al 31/05/2026', v_actor, '2026-06-01 09:00-04');
    END IF;
  END LOOP;

  -- ── 2. Emisiones mensuales (montos inventados) ─────────────────────────────
  FOR v_mes IN SELECT * FROM (VALUES
      ('06', '2026-06-01'::date, '2026-06-30'::date, 14280.00, 940.00),
      ('07', '2026-07-01'::date, '2026-07-31'::date, 14650.00, 955.00),
      ('08', '2026-08-01'::date, '2026-08-31'::date, 15120.00, 975.00),
      ('09', '2026-09-01'::date, '2026-09-30'::date, 15480.00, 990.00)
    ) AS m(mm, emision, vence, base, marina)
  LOOP
    v_tasa := tasa_bcv_en(v_org, v_mes.emision);
    INSERT INTO invoices (organization_id, unit_id, amount, description, due_date, status, kind, exchange_rate, amount_bs, created_at)
    SELECT v_org, u.id, round(u.aliquot / v_sum * v_mes.base, 2), 'Cuota ' || v_mes.mm || '/2026', v_mes.vence, 'pending', 'monthly',
           v_tasa, round(round(u.aliquot / v_sum * v_mes.base, 2) * v_tasa, 2), (v_mes.emision + time '09:00') AT TIME ZONE 'America/Caracas'
      FROM units u WHERE u.organization_id = v_org ORDER BY u.block, u.unit_number;
    INSERT INTO invoices (organization_id, unit_id, amount, description, due_date, status, kind, exchange_rate, amount_bs, created_at)
    SELECT v_org, m.unit_id, round(m.weight / v_sumw * v_mes.marina, 2), 'Marina ' || v_mes.mm || '/2026', v_mes.vence, 'pending', 'monthly',
           v_tasa, round(round(m.weight / v_sumw * v_mes.marina, 2) * v_tasa, 2), (v_mes.emision + time '09:05') AT TIME ZONE 'America/Caracas'
      FROM charge_group_members m WHERE m.group_id = v_grupo;
  END LOOP;

  -- Derrama aprobada en asamblea: impermeabilización de techos, por alícuota.
  v_tasa := tasa_bcv_en(v_org, '2026-08-10');
  INSERT INTO invoices (organization_id, unit_id, amount, description, due_date, status, kind, exchange_rate, amount_bs, created_at)
  SELECT v_org, u.id, round(u.aliquot / v_sum * 6000, 2), 'Derrama: impermeabilización de techos', '2026-09-15', 'pending', 'extraordinary',
         v_tasa, round(round(u.aliquot / v_sum * 6000, 2) * v_tasa, 2), '2026-08-10 10:00-04'
    FROM units u WHERE u.organization_id = v_org;

  -- ── 3. Pagos ───────────────────────────────────────────────────────────────
  -- Cada unidad tiene un perfil: 7 % morosos crónicos (no pagan desde julio),
  -- 12 % atrasados (se quedaron en agosto), el resto paga casi siempre.
  FOR v_i IN
    SELECT i.*, ((hashtext(i.id::text)::bigint + 2147483648) % 100)::int AS hi,
           ((hashtext(i.unit_id::text || 'perfil')::bigint + 2147483648) % 100)::int AS hu,
           (SELECT um.profile_id FROM unit_members um WHERE um.unit_id = i.unit_id AND um.role = 'owner' AND um.active LIMIT 1) AS dueno
      FROM invoices i WHERE i.organization_id = v_org
     ORDER BY i.due_date, i.receipt_number
  LOOP
    v_h := v_i.hi; v_hu := v_i.hu;
    -- Comportamiento por UNIDAD (no por recibo): el cumplido paga todo lo que
    -- vence; el ocasional se atrasó en agosto; el atrasado dejó de pagar en
    -- julio; el crónico no paga desde junio. Septiembre todavía no vence.
    v_perfil := CASE WHEN v_hu < 7 THEN 'cronico' WHEN v_hu < 16 THEN 'atrasado' WHEN v_hu < 27 THEN 'ocasional' ELSE 'cumplido' END;
    v_paga := 'nada';
    IF v_i.kind = 'opening' THEN
      v_paga := CASE WHEN v_perfil = 'cumplido' THEN 'todo' ELSE 'nada' END;
    ELSIF v_i.due_date = '2026-06-30' THEN
      v_paga := CASE WHEN v_perfil = 'cronico' THEN 'nada' ELSE 'todo' END;
    ELSIF v_i.due_date = '2026-07-31' THEN
      v_paga := CASE WHEN v_perfil IN ('cumplido', 'ocasional') THEN 'todo' WHEN v_perfil = 'atrasado' AND v_h < 40 THEN 'parte' ELSE 'nada' END;
    ELSIF v_i.due_date = '2026-08-31' THEN
      v_paga := CASE WHEN v_perfil = 'cumplido' THEN 'todo' WHEN v_perfil = 'ocasional' AND v_h < 50 THEN 'parte' ELSE 'nada' END;
    ELSIF v_i.kind = 'extraordinary' THEN
      v_paga := CASE WHEN v_perfil = 'cumplido' THEN 'todo'
                     WHEN v_perfil = 'ocasional' AND v_h < 50 THEN 'todo' ELSE 'nada' END;
    ELSIF v_i.due_date = '2026-09-30' THEN
      v_paga := CASE WHEN v_perfil IN ('cronico', 'atrasado') THEN 'nada' WHEN v_h < 48 THEN 'todo' WHEN v_h < 56 THEN 'parte'
                     WHEN v_h < 70 THEN 'revision' ELSE 'nada' END;
    END IF;
    CONTINUE WHEN v_paga = 'nada';

    -- Fecha: unos días antes del vencimiento (septiembre: entre el 3 y el 27).
    v_fecha := CASE WHEN v_i.due_date >= '2026-09-15' THEN date '2026-09-03' + (v_h % 25)
                    WHEN v_i.kind = 'opening' THEN date '2026-06-05' + (v_h % 20)
                    ELSE v_i.due_date - (v_h % 20) END;
    v_tasa := tasa_bcv_en(v_org, v_fecha);
    v_monto := CASE WHEN v_paga = 'parte' THEN round(v_i.amount * (0.35 + (v_h % 30) / 100.0), 2) ELSE v_i.amount END;

    INSERT INTO transactions (invoice_id, amount, currency, payment_method, reference, status, paid_by, paid_at,
                              reviewed_by, reviewed_at, currency_paid, exchange_rate, amount_bs)
    VALUES (v_i.id, v_monto, 'USD',
            (ARRAY['transfer', 'mobile_payment', 'zelle', 'transfer', 'mobile_payment', 'cash'])[1 + (v_h % 6)],
            lpad(((v_h * 7919 + v_hu * 104729 + extract(doy from v_fecha)::int * 31) % 99999999)::text, 8, '0'),
            CASE WHEN v_paga = 'revision' THEN 'pending' ELSE 'approved' END,
            v_i.dueno, (v_fecha + time '10:30') AT TIME ZONE 'America/Caracas',
            CASE WHEN v_paga = 'revision' THEN NULL ELSE v_actor END,
            CASE WHEN v_paga = 'revision' THEN NULL ELSE ((v_fecha + 1) + time '09:15') AT TIME ZONE 'America/Caracas' END,
            'USD', v_tasa, round(v_monto * v_tasa, 2));
  END LOOP;

  -- ── 4. Saldos a favor: pagos de más en agosto ──────────────────────────────
  INSERT INTO unit_credits (organization_id, unit_id, amount, kind, note, created_by, created_at)
  SELECT v_org, u.id, (ARRAY[25, 40, 60, 85, 120, 150])[1 + ((hashtext(u.id::text || 'favor')::bigint + 2147483648) % 6)],
         'deposit', 'Pago recibido de más en agosto', v_actor, '2026-08-22 11:00-04'
    FROM units u
   WHERE u.organization_id = v_org AND ((hashtext(u.id::text || 'perfil')::bigint + 2147483648) % 100) >= 27
     AND ((hashtext(u.id::text || 'favor')::bigint + 2147483648) % 100) < 7;
  PERFORM aplicar_saldo_a_favor(u.id, v_actor)
     FROM units u WHERE u.organization_id = v_org AND EXISTS (SELECT 1 FROM unit_credits c WHERE c.unit_id = u.id);

  -- ── 5. Intereses de mora de agosto (3 % anual, por días) ───────────────────
  v_tasa := tasa_bcv_en(v_org, '2026-09-02');
  INSERT INTO invoices (organization_id, unit_id, amount, description, due_date, status, kind, exchange_rate, amount_bs, created_at)
  SELECT v_org, x.unit_id, x.interes, 'Intereses de mora 08/2026', '2026-09-30', 'pending', 'interest', v_tasa, round(x.interes * v_tasa, 2), '2026-09-02 09:00-04'
    FROM (
      SELECT i.unit_id,
             round(sum((i.amount - i.paid_amount) * LEAST(31, GREATEST(0, date '2026-08-31' - i.due_date + CASE WHEN i.due_date < '2026-08-01' THEN 0 ELSE 0 END)) * 0.03 / 365), 2) AS interes
        FROM invoices i
       WHERE i.organization_id = v_org AND i.status IN ('pending', 'partial') AND i.due_date < '2026-08-31' AND i.kind <> 'interest'
       GROUP BY i.unit_id
    ) x
   WHERE x.interes >= 0.01;

  -- ── 6. Convenios de pago ───────────────────────────────────────────────────
  -- Al día: el moroso con más deuda vencida firmó el 05/09 y pagó la primera cuota.
  -- Atrasado: el segundo firmó el 20/08 y no ha pagado.
  FOR v_plan IN
    SELECT u.id AS unit_id, sum(i.amount - i.paid_amount) AS deuda, row_number() OVER (ORDER BY sum(i.amount - i.paid_amount) DESC) AS n,
           (SELECT um.profile_id FROM unit_members um WHERE um.unit_id = u.id AND um.role = 'owner' LIMIT 1) AS dueno
      FROM units u JOIN invoices i ON i.unit_id = u.id
     WHERE u.organization_id = v_org AND i.status IN ('pending', 'partial') AND i.due_date < '2026-09-01'
       AND ((hashtext(u.id::text || 'perfil')::bigint + 2147483648) % 100) < 7
     GROUP BY u.id ORDER BY deuda DESC LIMIT 2
  LOOP
    IF v_plan.n = 1 THEN
      INSERT INTO payment_plans (organization_id, unit_id, total, installments, first_due, notes, created_by, created_at)
      VALUES (v_org, v_plan.unit_id, round(v_plan.deuda, 2), 4, '2026-09-15', 'Acordado con la junta: 4 cuotas mensuales', v_actor, '2026-09-05 10:00-04');
      v_resta := round(v_plan.deuda / 4 + 5, 2);
      v_tasa := tasa_bcv_en(v_org, '2026-09-14');
      FOR v_i IN SELECT * FROM invoices WHERE unit_id = v_plan.unit_id AND status IN ('pending', 'partial') AND due_date < '2026-09-01'
                  ORDER BY due_date, receipt_number NULLS FIRST LOOP
        EXIT WHEN v_resta <= 0;
        v_monto := LEAST(v_resta, v_i.amount - v_i.paid_amount);
        INSERT INTO transactions (invoice_id, amount, currency, payment_method, reference, status, paid_by, paid_at, reviewed_by, reviewed_at, currency_paid, exchange_rate, amount_bs)
        VALUES (v_i.id, v_monto, 'USD', 'transfer', '55104892', 'approved', v_plan.dueno, '2026-09-14 11:00-04', v_actor, '2026-09-14 16:00-04', 'USD', v_tasa, round(v_monto * v_tasa, 2));
        v_resta := v_resta - v_monto;
      END LOOP;
    ELSE
      INSERT INTO payment_plans (organization_id, unit_id, total, installments, first_due, notes, created_by, created_at)
      VALUES (v_org, v_plan.unit_id, round(v_plan.deuda, 2), 3, '2026-08-31', 'Acordado por teléfono con la administración', v_actor, '2026-08-20 10:00-04');
    END IF;
  END LOOP;

  -- ── 7. Una anulación con nota de crédito ──────────────────────────────────
  SELECT u.id INTO v_id FROM units u WHERE u.organization_id = v_org AND u.block = 'Torre B' ORDER BY u.unit_number LIMIT 1 OFFSET 4;
  v_tasa := tasa_bcv_en(v_org, '2026-08-05');
  INSERT INTO invoices (organization_id, unit_id, amount, description, due_date, status, kind, exchange_rate, amount_bs, created_at)
  VALUES (v_org, v_id, 35, 'Reposición de llave magnética', '2026-08-20', 'pending', 'extraordinary', v_tasa, round(35 * v_tasa, 2), '2026-08-05 10:00-04')
  RETURNING id INTO v_id;
  PERFORM anular_recibos(ARRAY[v_id], v_actor, 'Cobro duplicado: la llave ya se había pagado en julio');

  -- ── 8. Gastos del condominio (junio–septiembre) ────────────────────────────
  INSERT INTO vendors (organization_id, name, rif, contact_phone) VALUES
    (v_org, 'Vigilancia Costa Azul C.A.', 'J-00000001-1', '0414-555-0201'),
    (v_org, 'Aseo Integral El Morro', 'J-00000002-2', '0414-555-0202'),
    (v_org, 'Ascensores del Oriente', 'J-00000003-3', '0414-555-0203'),
    (v_org, 'Jardines Lechería', 'J-00000004-4', '0414-555-0204'),
    (v_org, 'Piscinas Anzoátegui', 'J-00000005-5', '0414-555-0205'),
    (v_org, 'Seguros La Marina', 'J-00000006-6', '0414-555-0206');
  INSERT INTO expense_records (organization_id, description, amount, currency, expense_date, category_id, vendor_id, recorded_by)
  SELECT v_org, x.descr || ' ' || m.nombre, round(CASE WHEN x.moneda = 'VES' THEN x.monto * tasa_bcv_en(v_org, (m.mes || '-' || x.dia)::date) ELSE x.monto END, 2),
         x.moneda, (m.mes || '-' || x.dia)::date,
         (SELECT c.id FROM expense_categories c WHERE c.organization_id = v_org AND c.code = x.cat),
         (SELECT v.id FROM vendors v WHERE v.organization_id = v_org AND v.name = x.prov), v_actor
    FROM (VALUES ('2026-06', 'junio'), ('2026-07', 'julio'), ('2026-08', 'agosto'), ('2026-09', 'septiembre')) AS m(mes, nombre)
    CROSS JOIN (VALUES
      ('Vigilancia 24 horas,', 4200.00, 'USD', '05', 'vigilancia', 'Vigilancia Costa Azul C.A.'),
      ('Limpieza de áreas comunes,', 1850.00, 'USD', '05', 'aseo', 'Aseo Integral El Morro'),
      ('Electricidad de áreas comunes,', 940.00, 'VES', '10', 'servicios', NULL),
      ('Mantenimiento de ascensores,', 1320.00, 'USD', '12', 'mantenimiento', 'Ascensores del Oriente'),
      ('Mantenimiento de piscina,', 380.00, 'USD', '15', 'piscina', 'Piscinas Anzoátegui'),
      ('Jardinería y poda,', 480.00, 'USD', '18', 'jardineria', 'Jardines Lechería')
    ) AS x(descr, monto, moneda, dia, cat, prov)
   WHERE (m.mes || '-' || x.dia)::date <= current_date;
  INSERT INTO expense_records (organization_id, description, amount, currency, expense_date, category_id, vendor_id, recorded_by) VALUES
    (v_org, 'Póliza de responsabilidad civil (semestral)', 2600, 'USD', '2026-07-08', (SELECT id FROM expense_categories WHERE organization_id = v_org AND code = 'seguros'), (SELECT id FROM vendors WHERE organization_id = v_org AND name = 'Seguros La Marina'), v_actor),
    (v_org, 'Reparación de la bomba de agua principal', 735, 'USD', '2026-08-21', (SELECT id FROM expense_categories WHERE organization_id = v_org AND code = 'repuestos'), NULL, v_actor),
    (v_org, 'Anticipo impermeabilización de techos (40 %)', 2400, 'USD', '2026-09-18', (SELECT id FROM expense_categories WHERE organization_id = v_org AND code = 'mantenimiento'), NULL, v_actor);

  -- ── 9. Vida del edificio ───────────────────────────────────────────────────
  INSERT INTO announcements (organization_id, author_id, title, content, priority, published_at) VALUES
    (v_org, v_actor, 'Bienvenidos a Atryum', 'Desde este mes pueden ver su estado de cuenta, reportar pagos, reservar la parrillera, el caney o la playa y generar pases QR para sus visitas desde el teléfono. Cualquier duda, pregúntenle a Atri, el conserje.', 'normal', '2026-09-01 09:00-04'),
    (v_org, v_actor, 'Corte de agua el martes 6 de octubre', 'De 9:00 a.m. a 1:00 p.m. habrá corte de agua en las tres torres por mantenimiento de la bomba principal. Recomendamos almacenar agua el día anterior.', 'important', '2026-09-26 10:00-04'),
    (v_org, v_actor, 'Convocatoria a asamblea ordinaria', 'Se convoca a asamblea ordinaria de propietarios el sábado 17 de octubre a las 10:00 a.m. en el caney. Agenda: presupuesto 2027, avance de la impermeabilización y normas de la marina.', 'normal', '2026-09-27 18:00-04'),
    (v_org, v_actor, 'Fumigación de áreas comunes', 'El jueves 1 de octubre se fumigarán pasillos, estacionamientos y cuartos de basura. Mantengan cerradas las puertas de los apartamentos durante la mañana.', 'normal', '2026-09-22 08:00-04');

  INSERT INTO reservations (common_area_id, reserved_by, start_time, end_time, status, notes)
  SELECT a.id, x.p, x.s::timestamptz, x.e::timestamptz, 'confirmed', x.nota
    FROM (VALUES
      ('Caney', '2026-10-03 14:00-04', '2026-10-03 19:00-04', 7, 'Cumpleaños'),
      ('Parrillera', '2026-10-03 12:00-04', '2026-10-03 16:00-04', 23, NULL),
      ('Parrillera', '2026-10-04 13:00-04', '2026-10-04 17:00-04', 41, 'Almuerzo familiar'),
      ('Playa', '2026-10-10 10:00-04', '2026-10-10 15:00-04', 58, NULL),
      ('Caney', '2026-10-11 16:00-04', '2026-10-11 21:00-04', 77, 'Reunión de vecinos Torre C'),
      ('Parrillera', '2026-09-19 12:00-04', '2026-09-19 17:00-04', 12, NULL)
    ) AS r(area, s, e, k, nota)
    JOIN common_areas a ON a.organization_id = v_org AND a.name = r.area
    CROSS JOIN LATERAL (SELECT um.profile_id AS p FROM unit_members um JOIN units u ON u.id = um.unit_id
                         WHERE u.organization_id = v_org AND um.role = 'owner' ORDER BY u.id OFFSET r.k LIMIT 1) AS x2
    CROSS JOIN LATERAL (SELECT x2.p AS p, r.s AS s, r.e AS e, r.nota AS nota) AS x;

  INSERT INTO maintenance_requests (organization_id, unit_id, reported_by, title, description, category, priority, status, created_at)
  SELECT v_org, NULL, x.p, x.t, x.d, x.c, x.pr, x.st, x.f::timestamptz
    FROM (VALUES
      ('El ascensor de la Torre B se detiene entre pisos', 'Desde el lunes el ascensor se queda detenido entre el piso 3 y el 4 y hay que volver a llamarlo.', 'elevator', 'high', 'in_progress', '2026-09-21 08:10-04', 15),
      ('Luminaria apagada en el estacionamiento', 'La lámpara junto a los puestos de la Torre A no enciende de noche.', 'electrical', 'medium', 'resolved', '2026-09-10 20:30-04', 33),
      ('Filtración en el pasillo del piso 5, Torre C', 'Después de la lluvia aparece agua en el techo del pasillo, cerca del ascensor.', 'plumbing', 'medium', 'new', '2026-09-27 07:45-04', 61),
      ('Portón de la marina cierra con dificultad', 'El portón hace ruido y a veces no termina de cerrar.', 'access', 'low', 'in_review', '2026-09-24 17:20-04', 88)
    ) AS x0(t, d, c, pr, st, f, k)
    CROSS JOIN LATERAL (SELECT um.profile_id AS p FROM unit_members um JOIN units u ON u.id = um.unit_id
                         WHERE u.organization_id = v_org AND um.role = 'owner' ORDER BY u.id OFFSET x0.k LIMIT 1) AS xp
    CROSS JOIN LATERAL (SELECT x0.t AS t, x0.d AS d, x0.c AS c, x0.pr AS pr, x0.st AS st, x0.f AS f, xp.p AS p) AS x;

  INSERT INTO packages (organization_id, unit_id, description, carrier, recipient_name, status, received_at, delivered_at, delivered_to)
  SELECT v_org, u.id, x.d, x.c, NULL, x.st, x.r::timestamptz, x.e::timestamptz, x.a
    FROM (VALUES
      ('Caja mediana', 'MRW', 'waiting', '2026-09-28 11:20-04', NULL, NULL, 'Torre A', '2-3'),
      ('Sobre de documentos', 'Zoom', 'waiting', '2026-09-29 09:05-04', NULL, NULL, 'Torre C', '4-2'),
      ('Pedido de farmacia', 'Delivery', 'delivered', '2026-09-26 18:40-04', '2026-09-26 19:10-04', 'La propietaria', 'Torre B', '1-3'),
      ('Caja grande (electrodoméstico)', 'Tealca', 'delivered', '2026-09-24 10:00-04', '2026-09-24 17:30-04', 'Hijo del propietario', 'Torre A', '5-1')
    ) AS x(d, c, st, r, e, a, torre, apto)
    JOIN units u ON u.organization_id = v_org AND u.block = x.torre AND u.unit_number = x.apto;

  INSERT INTO access_passes (organization_id, created_by, visitor_name, visitor_id_number, qr_code, valid_from, valid_until, status, visitor_kind, vehicle_plate, unit_id)
  SELECT u.organization_id, v_actor, x.nombre, x.ci, gen_random_uuid()::text, now() - interval '1 hour', now() + interval '10 hours', 'active', x.k, x.placa, u.id
    FROM units u,
         (VALUES ('María Pérez', 'V-12.345.678', 'guest', 'AB123CD'), ('Delivery de farmacia', 'V-20.111.222', 'delivery', NULL)) AS x(nombre, ci, k, placa)
   WHERE u.organization_id = v_org AND u.block = 'Torre A' AND u.unit_number = '1-1';

  -- ── Resumen ────────────────────────────────────────────────────────────────
  v_n := jsonb_build_object(
    'recibos', (SELECT count(*) FROM invoices WHERE organization_id = v_org),
    'pagados', (SELECT count(*) FROM invoices WHERE organization_id = v_org AND status = 'paid'),
    'abonados', (SELECT count(*) FROM invoices WHERE organization_id = v_org AND status = 'partial'),
    'en_revision', (SELECT count(*) FROM transactions t JOIN invoices i ON i.id = t.invoice_id WHERE i.organization_id = v_org AND t.status = 'pending'),
    'por_cobrar', (SELECT sum(amount - paid_amount) FROM invoices WHERE organization_id = v_org AND status IN ('pending', 'partial')),
    'vencido', (SELECT sum(amount - paid_amount) FROM invoices WHERE organization_id = v_org AND status IN ('pending', 'partial') AND due_date < current_date),
    'unidades_con_atraso', (SELECT count(DISTINCT unit_id) FROM invoices WHERE organization_id = v_org AND status IN ('pending', 'partial') AND due_date < current_date),
    'intereses', (SELECT count(*) FROM invoices WHERE organization_id = v_org AND kind = 'interest'),
    'convenios', (SELECT count(*) FROM payment_plans WHERE organization_id = v_org),
    'notas_credito', (SELECT count(*) FROM credit_notes WHERE organization_id = v_org),
    'saldo_favor', (SELECT sum(amount) FROM unit_credits WHERE organization_id = v_org),
    'gastos', (SELECT count(*) FROM expense_records WHERE organization_id = v_org),
    'libro_cuadra', (SELECT abs(sum(debe_usd) - sum(haber_usd)) < 0.005 AND abs(sum(debe_bs) - sum(haber_bs)) < 0.005 FROM libro_diario WHERE organization_id = v_org));

  IF v_modo = 'ensayo' THEN RAISE EXCEPTION 'ENSAYO OK (nada se guardó): %', v_n; END IF;
  RAISE NOTICE 'DEMO LISTO: %', v_n;
END $$;
