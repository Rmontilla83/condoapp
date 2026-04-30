-- =====================================================================
-- ATRYUM DEMO — FASE 4: data robusta
--
-- Aplica DESPUÉS de phases 1-3. Idempotente (ON CONFLICT DO NOTHING en
-- todas las inserciones). Re-ejecutable sin efectos colaterales.
--
-- Qué agrega:
--   - Logos / branding por organización
--   - Más residents (vacantes que estaban sin owner se llenan)
--   - Avatars en profiles
--   - Historial enero + febrero 2026 (invoices + transactions)
--   - Recargos por mora en algunas overdue (April)
--   - amount_bs, exchange_rate, currency_paid en TODOS los registros
--   - maintenance_status_log (historial de cambios)
--   - photo_urls en algunos maintenance_requests
--   - Más expense_records con categorías diversas (incluye nómina, seguros)
--   - access_passes adicionales (delivery, Uber, familia, proveedor)
--   - vote_responses dentro de las assemblies pasadas
--   - auth_events históricos realistas
--   - Más comunicados (estacional, info, urgente)
--   - More reservations (incluye históricas)
--   - exchange_rates históricos para Costa de Plata + Olivos
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1. Logos + branding por organización
-- ---------------------------------------------------------------------

UPDATE organizations
SET logo_url = 'https://api.dicebear.com/7.x/shapes/png?seed=costa-de-plata&backgroundColor=1E4D8F&size=240'
WHERE id = 'b3b1107d-c614-4c02-80a1-14f1da4079bc'::uuid AND logo_url IS NULL;

UPDATE organizations
SET logo_url = 'https://api.dicebear.com/7.x/shapes/png?seed=los-olivos&backgroundColor=2FB4E6&size=240'
WHERE id = 'c05ade01-0000-0000-0000-000000000001'::uuid AND logo_url IS NULL;

-- ---------------------------------------------------------------------
-- 2. Avatars para residents (DiceBear, gratuito y consistente)
-- ---------------------------------------------------------------------

UPDATE profiles
SET avatar_url = 'https://api.dicebear.com/7.x/initials/svg?seed=' ||
                 replace(lower(split_part(full_name,' ',1) || '-' || coalesce(split_part(full_name,' ',2),'')), ' ', '') ||
                 '&backgroundColor=1E4D8F,2FB4E6,E8732C&backgroundType=gradientLinear'
WHERE avatar_url IS NULL
  AND email LIKE '%@costa.atryum.test'
   OR email LIKE '%@olivos.atryum.test'
   OR email = 'admin.olivos@atryum.test';

-- Phones de prueba (usados para WhatsApp / contacto admin)
UPDATE profiles SET phone = '+58 412-' || lpad((random()*9999999)::int::text, 7, '0')
WHERE phone IS NULL
  AND (email LIKE '%@costa.atryum.test' OR email LIKE '%@olivos.atryum.test');

-- ---------------------------------------------------------------------
-- 3. Helper temporal: ensure_user para nuevos residents (si phase2 borró el helper)
-- ---------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION _seed_p4_create_user(p_email text, p_name text, p_org uuid)
RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE v_id uuid;
BEGIN
  SELECT id INTO v_id FROM auth.users WHERE email = p_email;
  IF v_id IS NULL THEN
    v_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      aud, role, confirmation_token, recovery_token, email_change_token_new, email_change
    ) VALUES (
      v_id, '00000000-0000-0000-0000-000000000000'::uuid,
      p_email, crypt('demo-atryum-2026', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', p_name),
      'authenticated','authenticated','','','',''
    );
  END IF;

  UPDATE profiles SET
    full_name = COALESCE(NULLIF(full_name,''), p_name),
    role = 'resident',
    organization_id = p_org,
    avatar_url = COALESCE(avatar_url, 'https://api.dicebear.com/7.x/initials/svg?seed=' ||
                  replace(lower(p_name), ' ', '-') ||
                  '&backgroundColor=1E4D8F,2FB4E6,E8732C&backgroundType=gradientLinear')
  WHERE id = v_id;

  RETURN v_id;
END $$;

-- ---------------------------------------------------------------------
-- 4. Más residents (rellenar las vacantes de cada condo)
-- ---------------------------------------------------------------------

-- Costa de Plata: faltaban owners en 5-A, 5-B, PH-1, PH-2, L-1, L-2 + tenant en PH-2
SELECT _seed_p4_create_user('hugo.medina@costa.atryum.test',     'Hugo Medina',     'b3b1107d-c614-4c02-80a1-14f1da4079bc'::uuid);
SELECT _seed_p4_create_user('marta.ochoa@costa.atryum.test',     'Marta Ochoa',     'b3b1107d-c614-4c02-80a1-14f1da4079bc'::uuid);
SELECT _seed_p4_create_user('jose.parra@costa.atryum.test',      'Jose Parra',      'b3b1107d-c614-4c02-80a1-14f1da4079bc'::uuid);
SELECT _seed_p4_create_user('valentina.rios@costa.atryum.test',  'Valentina Rios',  'b3b1107d-c614-4c02-80a1-14f1da4079bc'::uuid);
SELECT _seed_p4_create_user('alberto.serra@costa.atryum.test',   'Alberto Serra',   'b3b1107d-c614-4c02-80a1-14f1da4079bc'::uuid);
SELECT _seed_p4_create_user('renata.tovar@costa.atryum.test',    'Renata Tovar',    'b3b1107d-c614-4c02-80a1-14f1da4079bc'::uuid);
SELECT _seed_p4_create_user('leonardo.vasquez@costa.atryum.test','Leonardo Vasquez','b3b1107d-c614-4c02-80a1-14f1da4079bc'::uuid);
SELECT _seed_p4_create_user('claudia.zerpa@costa.atryum.test',   'Claudia Zerpa',   'b3b1107d-c614-4c02-80a1-14f1da4079bc'::uuid);

-- Los Olivos: faltaban owners en 13, 16 (tenant_with_owner) + tenant en T2-301, PH-OLI
SELECT _seed_p4_create_user('emilia.alvarez@olivos.atryum.test', 'Emilia Alvarez',  'c05ade01-0000-0000-0000-000000000001'::uuid);
SELECT _seed_p4_create_user('martin.bello@olivos.atryum.test',   'Martin Bello',    'c05ade01-0000-0000-0000-000000000001'::uuid);
SELECT _seed_p4_create_user('helena.cordero@olivos.atryum.test', 'Helena Cordero',  'c05ade01-0000-0000-0000-000000000001'::uuid);
SELECT _seed_p4_create_user('pablo.delgado@olivos.atryum.test',  'Pablo Delgado',   'c05ade01-0000-0000-0000-000000000001'::uuid);
SELECT _seed_p4_create_user('isabel.escudero@olivos.atryum.test','Isabel Escudero', 'c05ade01-0000-0000-0000-000000000001'::uuid);
SELECT _seed_p4_create_user('raul.fonseca@olivos.atryum.test',   'Raul Fonseca',    'c05ade01-0000-0000-0000-000000000001'::uuid);
SELECT _seed_p4_create_user('beatriz.guevara@olivos.atryum.test','Beatriz Guevara', 'c05ade01-0000-0000-0000-000000000001'::uuid);
SELECT _seed_p4_create_user('maximo.huerta@olivos.atryum.test',  'Maximo Huerta',   'c05ade01-0000-0000-0000-000000000001'::uuid);

-- ---------------------------------------------------------------------
-- 5. unit_members para los nuevos residents
-- ---------------------------------------------------------------------

INSERT INTO unit_members (unit_id, profile_id, role, active, permissions)
SELECT v.unit_id::uuid, p.id, v.role, true,
  CASE WHEN v.role = 'owner'
    THEN '{"can_see_fee":true,"can_pay_fee":true}'::jsonb
    ELSE '{"can_see_fee":true,"can_pay_fee":false}'::jsonb
  END
FROM (VALUES
  -- Costa de Plata: rellenar PH-1, PH-2, L-1, L-2, 5-A (5-B already had Roberto)
  ('ce57aa01-0000-0000-0000-000000000010', 'hugo.medina@costa.atryum.test',      'owner'),
  ('ce57aa01-0000-0000-0000-000000000011', 'marta.ochoa@costa.atryum.test',      'owner'),
  ('ce57aa01-0000-0000-0000-000000000013', 'jose.parra@costa.atryum.test',       'owner'),
  ('ce57aa01-0000-0000-0000-000000000014', 'valentina.rios@costa.atryum.test',   'owner'),
  -- PH-2 (tenant_only): owner ausente Alberto + tenant Renata
  ('ce57aa01-0000-0000-0000-000000000012', 'alberto.serra@costa.atryum.test',    'owner'),
  ('ce57aa01-0000-0000-0000-000000000012', 'renata.tovar@costa.atryum.test',     'tenant'),
  -- Co-propietario en 1-A (Ana ya es owner pero su pareja Leonardo también)
  ('ce57aa01-0000-0000-0000-000000000001', 'leonardo.vasquez@costa.atryum.test', 'owner'),
  -- Co-propietario en 5-A (Roberto ya es owner pero su madre Claudia también)
  ('ce57aa01-0000-0000-0000-000000000009', 'claudia.zerpa@costa.atryum.test',    'owner'),
  -- Los Olivos: rellenar T1-401 (tenant_only owner ausente), T2-301 owner + tenant, PH-OLI
  ('011ce501-0000-0000-0000-000000000007', 'emilia.alvarez@olivos.atryum.test',  'owner'),
  ('011ce501-0000-0000-0000-000000000013', 'martin.bello@olivos.atryum.test',    'owner'),
  ('011ce501-0000-0000-0000-000000000013', 'helena.cordero@olivos.atryum.test',  'tenant'),
  ('011ce501-0000-0000-0000-000000000017', 'pablo.delgado@olivos.atryum.test',   'owner'),
  ('011ce501-0000-0000-0000-000000000018', 'isabel.escudero@olivos.atryum.test', 'owner'),
  -- T1-102 (tenant_only): owner ausente Raul
  ('011ce501-0000-0000-0000-000000000002', 'raul.fonseca@olivos.atryum.test',    'owner'),
  -- Co-propietario en T2-401
  ('011ce501-0000-0000-0000-000000000015', 'beatriz.guevara@olivos.atryum.test', 'owner'),
  -- Inquilino adicional en PH-OLI-1 (le sumo a la histórica del condo, modo tenant_with_active_owner)
  ('011ce501-0000-0000-0000-000000000017', 'maximo.huerta@olivos.atryum.test',   'tenant')
) AS v(unit_id, email_resident, role)
JOIN profiles p ON p.email = v.email_resident
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------
-- 6. Tasas de cambio históricas (Costa + Olivos, simulando BCV semanal)
-- ---------------------------------------------------------------------

INSERT INTO exchange_rates (organization_id, rate, source, effective_date) VALUES
  ('b3b1107d-c614-4c02-80a1-14f1da4079bc'::uuid, 35.20, 'bcv', '2026-01-15'),
  ('b3b1107d-c614-4c02-80a1-14f1da4079bc'::uuid, 35.80, 'bcv', '2026-02-15'),
  ('b3b1107d-c614-4c02-80a1-14f1da4079bc'::uuid, 36.00, 'bcv', '2026-03-15'),
  ('b3b1107d-c614-4c02-80a1-14f1da4079bc'::uuid, 36.50, 'bcv', '2026-04-12'),
  ('b3b1107d-c614-4c02-80a1-14f1da4079bc'::uuid, 36.90, 'bcv', '2026-04-22'),
  ('c05ade01-0000-0000-0000-000000000001'::uuid, 35.20, 'bcv', '2026-01-15'),
  ('c05ade01-0000-0000-0000-000000000001'::uuid, 35.80, 'bcv', '2026-02-15'),
  ('c05ade01-0000-0000-0000-000000000001'::uuid, 36.00, 'bcv', '2026-03-15'),
  ('c05ade01-0000-0000-0000-000000000001'::uuid, 36.50, 'bcv', '2026-04-12'),
  ('c05ade01-0000-0000-0000-000000000001'::uuid, 36.90, 'bcv', '2026-04-22')
ON CONFLICT (organization_id, effective_date, source) DO NOTHING;

-- ---------------------------------------------------------------------
-- 7. Invoices históricas (enero + febrero 2026) — todas pagadas
-- ---------------------------------------------------------------------

-- Costa de Plata enero
INSERT INTO invoices (organization_id, unit_id, amount, currency, description, due_date, status, exchange_rate, amount_bs)
SELECT
  u.organization_id, u.id,
  CASE u.type WHEN 'penthouse' THEN 120 WHEN 'local' THEN 60 ELSE 85 END,
  'USD',
  'Cuota enero 2026',
  '2026-01-15'::date,
  'paid',
  35.20,
  (CASE u.type WHEN 'penthouse' THEN 120 WHEN 'local' THEN 60 ELSE 85 END) * 35.20
FROM units u
WHERE u.organization_id = 'b3b1107d-c614-4c02-80a1-14f1da4079bc'::uuid
  AND NOT EXISTS (SELECT 1 FROM invoices i WHERE i.unit_id = u.id AND i.description = 'Cuota enero 2026');

-- Costa de Plata febrero
INSERT INTO invoices (organization_id, unit_id, amount, currency, description, due_date, status, exchange_rate, amount_bs)
SELECT
  u.organization_id, u.id,
  CASE u.type WHEN 'penthouse' THEN 120 WHEN 'local' THEN 60 ELSE 85 END,
  'USD',
  'Cuota febrero 2026',
  '2026-02-15'::date,
  'paid',
  35.80,
  (CASE u.type WHEN 'penthouse' THEN 120 WHEN 'local' THEN 60 ELSE 85 END) * 35.80
FROM units u
WHERE u.organization_id = 'b3b1107d-c614-4c02-80a1-14f1da4079bc'::uuid
  AND NOT EXISTS (SELECT 1 FROM invoices i WHERE i.unit_id = u.id AND i.description = 'Cuota febrero 2026');

-- Los Olivos enero
INSERT INTO invoices (organization_id, unit_id, amount, currency, description, due_date, status, exchange_rate, amount_bs)
SELECT
  u.organization_id, u.id,
  CASE u.type WHEN 'penthouse' THEN 180 ELSE 120 END,
  'USD', 'Cuota enero 2026', '2026-01-15'::date, 'paid', 35.20,
  (CASE u.type WHEN 'penthouse' THEN 180 ELSE 120 END) * 35.20
FROM units u
WHERE u.organization_id = 'c05ade01-0000-0000-0000-000000000001'::uuid
  AND NOT EXISTS (SELECT 1 FROM invoices i WHERE i.unit_id = u.id AND i.description = 'Cuota enero 2026');

-- Los Olivos febrero
INSERT INTO invoices (organization_id, unit_id, amount, currency, description, due_date, status, exchange_rate, amount_bs)
SELECT
  u.organization_id, u.id,
  CASE u.type WHEN 'penthouse' THEN 180 ELSE 120 END,
  'USD', 'Cuota febrero 2026', '2026-02-15'::date, 'paid', 35.80,
  (CASE u.type WHEN 'penthouse' THEN 180 ELSE 120 END) * 35.80
FROM units u
WHERE u.organization_id = 'c05ade01-0000-0000-0000-000000000001'::uuid
  AND NOT EXISTS (SELECT 1 FROM invoices i WHERE i.unit_id = u.id AND i.description = 'Cuota febrero 2026');

-- ---------------------------------------------------------------------
-- 8. Cuota EXTRAORDINARIA Costa de Plata (derrama febrero pintura fachada)
-- ---------------------------------------------------------------------

INSERT INTO invoices (organization_id, unit_id, amount, currency, description, due_date, status, exchange_rate, amount_bs)
SELECT
  u.organization_id, u.id,
  -- Derrama proporcional: $50 base, $80 PH, $30 local
  CASE u.type WHEN 'penthouse' THEN 80 WHEN 'local' THEN 30 ELSE 50 END,
  'USD', 'Derrama: pintura fachada', '2026-02-28'::date,
  -- Algunas aún sin pagar
  CASE WHEN u.unit_number IN ('PH-2','3-A','L-2') THEN 'overdue' ELSE 'paid' END,
  35.80,
  (CASE u.type WHEN 'penthouse' THEN 80 WHEN 'local' THEN 30 ELSE 50 END) * 35.80
FROM units u
WHERE u.organization_id = 'b3b1107d-c614-4c02-80a1-14f1da4079bc'::uuid
  AND NOT EXISTS (SELECT 1 FROM invoices i WHERE i.unit_id = u.id AND i.description = 'Derrama: pintura fachada');

-- ---------------------------------------------------------------------
-- 9. Backfill amount_bs / exchange_rate en invoices de phase3 si faltan
-- ---------------------------------------------------------------------

UPDATE invoices SET exchange_rate = 36.00, amount_bs = amount * 36.00
WHERE description = 'Cuota marzo 2026' AND exchange_rate IS NULL;

UPDATE invoices SET exchange_rate = 36.50, amount_bs = amount * 36.50
WHERE description = 'Cuota abril 2026' AND exchange_rate IS NULL;

-- ---------------------------------------------------------------------
-- 10. Transactions con multi-currency completo
-- ---------------------------------------------------------------------

-- Para invoices ya pagadas que NO tienen transacción, generar una con multi-currency
INSERT INTO transactions (invoice_id, amount, currency, payment_method, reference, paid_at, status, currency_paid, amount_bs, paid_by)
SELECT
  i.id,
  i.amount,
  i.currency,
  -- 60% Pago Móvil (Bs), 25% Zelle (USD), 10% Transferencia (USD), 5% Efectivo
  CASE
    WHEN (row_number() OVER (ORDER BY i.id))::int % 20 < 12 THEN 'pago_movil'
    WHEN (row_number() OVER (ORDER BY i.id))::int % 20 < 17 THEN 'zelle'
    WHEN (row_number() OVER (ORDER BY i.id))::int % 20 < 19 THEN 'transferencia'
    ELSE 'efectivo'
  END,
  CASE
    WHEN (row_number() OVER (ORDER BY i.id))::int % 20 < 12
      THEN 'PM-' || lpad(((random()*99999999)::bigint)::text, 8, '0')
    ELSE 'REF-' || substr(i.id::text, 1, 10)
  END,
  i.due_date::timestamptz - interval '2 days' + (random() * interval '4 hours'),
  'approved',
  CASE WHEN (row_number() OVER (ORDER BY i.id))::int % 20 < 12 THEN 'VES' ELSE 'USD' END,
  i.amount * COALESCE(i.exchange_rate, 36.50),
  -- paid_by: pone primer owner activo de la unidad
  (SELECT um.profile_id FROM unit_members um WHERE um.unit_id = i.unit_id AND um.role = 'owner' AND um.active LIMIT 1)
FROM invoices i
WHERE i.status = 'paid'
  AND NOT EXISTS (SELECT 1 FROM transactions t WHERE t.invoice_id = i.id);

-- Backfill amount_bs en transactions ya existentes
UPDATE transactions t SET
  amount_bs = COALESCE(t.amount_bs, t.amount * COALESCE(i.exchange_rate, 36.50)),
  currency_paid = COALESCE(NULLIF(t.currency_paid,''), CASE t.payment_method
    WHEN 'pago_movil' THEN 'VES'
    WHEN 'efectivo'   THEN 'VES'
    ELSE 'USD' END)
FROM invoices i
WHERE t.invoice_id = i.id
  AND (t.amount_bs IS NULL OR t.currency_paid IS NULL OR t.currency_paid = '');

-- Comprobantes de pago "subidos" (URLs DiceBear simulando recibo)
UPDATE transactions SET receipt_url =
  'https://api.dicebear.com/7.x/bottts/png?seed=receipt-' || substr(id::text, 1, 8) || '&backgroundColor=EAEEF4&size=400'
WHERE receipt_url IS NULL
  AND payment_method IN ('pago_movil','zelle','transferencia');

-- ---------------------------------------------------------------------
-- 11. Recargos por mora (transactions parciales pendientes en abril overdue)
-- ---------------------------------------------------------------------

-- 1 transacción REJECTED para que admin tenga ejemplo de comprobante mal subido
INSERT INTO transactions (invoice_id, amount, currency, payment_method, reference, paid_at, status, currency_paid, amount_bs, paid_by, notes, receipt_url)
SELECT
  i.id, i.amount, 'USD', 'transferencia',
  'REF-RECHAZADA',
  i.due_date::timestamptz + interval '5 days',
  'rejected', 'USD', i.amount * 36.50,
  (SELECT um.profile_id FROM unit_members um WHERE um.unit_id = i.unit_id AND um.role = 'owner' AND um.active LIMIT 1),
  'Comprobante ilegible. Reenviar con foto clara.',
  'https://api.dicebear.com/7.x/bottts/png?seed=receipt-rejected&backgroundColor=fee&size=400'
FROM invoices i
WHERE i.description = 'Cuota abril 2026'
  AND i.status = 'overdue'
  AND i.organization_id = 'b3b1107d-c614-4c02-80a1-14f1da4079bc'::uuid
  AND NOT EXISTS (SELECT 1 FROM transactions t WHERE t.invoice_id = i.id)
LIMIT 1;

-- 1 transacción PENDIENTE (admin ve en panel)
INSERT INTO transactions (invoice_id, amount, currency, payment_method, reference, paid_at, status, currency_paid, amount_bs, paid_by, notes, receipt_url)
SELECT
  i.id, i.amount, 'USD', 'pago_movil',
  'PM-' || lpad(((random()*99999999)::bigint)::text, 8, '0'),
  now() - interval '6 hours',
  'pending', 'VES', i.amount * 36.90,
  (SELECT um.profile_id FROM unit_members um WHERE um.unit_id = i.unit_id AND um.role = 'owner' AND um.active LIMIT 1),
  'Pago realizado hoy via banco BNC.',
  'https://api.dicebear.com/7.x/bottts/png?seed=receipt-pending&backgroundColor=fff7ed&size=400'
FROM invoices i
WHERE i.description = 'Cuota abril 2026'
  AND i.status = 'pending'
  AND i.organization_id = 'c05ade01-0000-0000-0000-000000000001'::uuid
  AND NOT EXISTS (SELECT 1 FROM transactions t WHERE t.invoice_id = i.id)
LIMIT 1;

-- ---------------------------------------------------------------------
-- 12. Photos en maintenance_requests (URLs simuladas via DiceBear shapes)
-- ---------------------------------------------------------------------

UPDATE maintenance_requests SET photo_urls = ARRAY[
  'https://api.dicebear.com/7.x/shapes/png?seed=fuga-' || substr(id::text, 1, 6) || '&size=400',
  'https://api.dicebear.com/7.x/shapes/png?seed=fuga2-' || substr(id::text, 1, 6) || '&size=400'
]
WHERE title ILIKE '%fuga%' OR title ILIKE '%goter%' OR title ILIKE '%filtra%';

UPDATE maintenance_requests SET photo_urls = ARRAY[
  'https://api.dicebear.com/7.x/shapes/png?seed=elec-' || substr(id::text, 1, 6) || '&size=400'
]
WHERE category IN ('electricidad','climatizacion') AND (photo_urls IS NULL OR cardinality(photo_urls) = 0);

-- ---------------------------------------------------------------------
-- 13. maintenance_status_log (historial de cambios)
-- ---------------------------------------------------------------------

-- Para cada request resolved o in_progress, simular el log de cambios
INSERT INTO maintenance_status_log (request_id, old_status, new_status, changed_by, note, created_at)
SELECT
  m.id, 'new', 'in_review',
  (SELECT id FROM profiles WHERE role = 'admin' AND organization_id = m.organization_id LIMIT 1),
  'Solicitud recibida, evaluando alcance.',
  m.created_at + interval '2 hours'
FROM maintenance_requests m
WHERE m.status IN ('in_review','in_progress','resolved')
  AND NOT EXISTS (SELECT 1 FROM maintenance_status_log l WHERE l.request_id = m.id AND l.new_status = 'in_review');

INSERT INTO maintenance_status_log (request_id, old_status, new_status, changed_by, note, created_at)
SELECT
  m.id, 'in_review', 'in_progress',
  (SELECT id FROM profiles WHERE role = 'admin' AND organization_id = m.organization_id LIMIT 1),
  'Asignado a ' || COALESCE(m.assigned_to, 'técnico') || '.',
  m.created_at + interval '1 day'
FROM maintenance_requests m
WHERE m.status IN ('in_progress','resolved')
  AND NOT EXISTS (SELECT 1 FROM maintenance_status_log l WHERE l.request_id = m.id AND l.new_status = 'in_progress');

INSERT INTO maintenance_status_log (request_id, old_status, new_status, changed_by, note, created_at)
SELECT
  m.id, 'in_progress', 'resolved',
  (SELECT id FROM profiles WHERE role = 'admin' AND organization_id = m.organization_id LIMIT 1),
  'Resuelto. Ticket cerrado.',
  m.created_at + interval '3 days'
FROM maintenance_requests m
WHERE m.status = 'resolved'
  AND NOT EXISTS (SELECT 1 FROM maintenance_status_log l WHERE l.request_id = m.id AND l.new_status = 'resolved');

-- También resolved_at populated
UPDATE maintenance_requests SET resolved_at = created_at + interval '3 days'
WHERE status = 'resolved' AND resolved_at IS NULL;

-- ---------------------------------------------------------------------
-- 14. Más expense_records (nómina, seguros, impuestos, repuestos)
-- ---------------------------------------------------------------------

INSERT INTO expense_records (organization_id, category, description, amount, currency, expense_date, recorded_by) VALUES
  -- Costa: marzo
  ('b3b1107d-c614-4c02-80a1-14f1da4079bc'::uuid, 'nomina', 'Nomina conserjeria — marzo (Sr. Antonio)', 320.00, 'USD', '2026-03-30', '03232926-a120-453e-b97f-a7ab31dee839'::uuid),
  ('b3b1107d-c614-4c02-80a1-14f1da4079bc'::uuid, 'seguros', 'Poliza HCM areas comunes — trimestre', 180.00, 'USD', '2026-03-08', '03232926-a120-453e-b97f-a7ab31dee839'::uuid),
  ('b3b1107d-c614-4c02-80a1-14f1da4079bc'::uuid, 'impuestos', 'Patente municipal Q1', 45.00, 'USD', '2026-03-20', '03232926-a120-453e-b97f-a7ab31dee839'::uuid),
  ('b3b1107d-c614-4c02-80a1-14f1da4079bc'::uuid, 'repuestos', 'Bombillas LED reemplazo pasillos', 65.00, 'USD', '2026-03-25', '03232926-a120-453e-b97f-a7ab31dee839'::uuid),
  ('b3b1107d-c614-4c02-80a1-14f1da4079bc'::uuid, 'servicios', 'Internet fibra optica oficina admin', 35.00, 'USD', '2026-03-01', '03232926-a120-453e-b97f-a7ab31dee839'::uuid),
  -- Costa: abril
  ('b3b1107d-c614-4c02-80a1-14f1da4079bc'::uuid, 'nomina', 'Nomina conserjeria — abril (Sr. Antonio)', 320.00, 'USD', '2026-04-30', '03232926-a120-453e-b97f-a7ab31dee839'::uuid),
  ('b3b1107d-c614-4c02-80a1-14f1da4079bc'::uuid, 'mantenimiento', 'Pintura fachada — proveedor (derrama febrero)', 1200.00, 'USD', '2026-04-12', '03232926-a120-453e-b97f-a7ab31dee839'::uuid),
  ('b3b1107d-c614-4c02-80a1-14f1da4079bc'::uuid, 'oficina', 'Suministros admin (papel, tinta, archivadores)', 28.00, 'USD', '2026-04-09', '03232926-a120-453e-b97f-a7ab31dee839'::uuid),
  ('b3b1107d-c614-4c02-80a1-14f1da4079bc'::uuid, 'aseo', 'Productos limpieza piscina — abril', 80.00, 'USD', '2026-04-14', '03232926-a120-453e-b97f-a7ab31dee839'::uuid),
  -- Olivos: marzo
  ('c05ade01-0000-0000-0000-000000000001'::uuid, 'nomina', 'Nomina vigilantes — marzo (3 turnos)', 1450.00, 'USD', '2026-03-30', (SELECT id FROM profiles WHERE email='admin.olivos@atryum.test')),
  ('c05ade01-0000-0000-0000-000000000001'::uuid, 'seguros', 'Poliza incendio edificio — anual prorrateo', 420.00, 'USD', '2026-03-05', (SELECT id FROM profiles WHERE email='admin.olivos@atryum.test')),
  ('c05ade01-0000-0000-0000-000000000001'::uuid, 'impuestos', 'Aseo urbano alcaldia Q1', 95.00, 'USD', '2026-03-15', (SELECT id FROM profiles WHERE email='admin.olivos@atryum.test')),
  ('c05ade01-0000-0000-0000-000000000001'::uuid, 'servicios', 'Electricidad areas comunes — marzo', 240.00, 'USD', '2026-03-28', (SELECT id FROM profiles WHERE email='admin.olivos@atryum.test')),
  -- Olivos: abril
  ('c05ade01-0000-0000-0000-000000000001'::uuid, 'nomina', 'Nomina vigilantes — abril (3 turnos)', 1450.00, 'USD', '2026-04-30', (SELECT id FROM profiles WHERE email='admin.olivos@atryum.test')),
  ('c05ade01-0000-0000-0000-000000000001'::uuid, 'mantenimiento', 'Reparacion bomba presion T2', 480.00, 'USD', '2026-04-11', (SELECT id FROM profiles WHERE email='admin.olivos@atryum.test')),
  ('c05ade01-0000-0000-0000-000000000001'::uuid, 'jardineria', 'Plantas ornamentales nuevas + abono', 165.00, 'USD', '2026-04-09', (SELECT id FROM profiles WHERE email='admin.olivos@atryum.test')),
  ('c05ade01-0000-0000-0000-000000000001'::uuid, 'eventos', 'Anticipo dia del vecino — DJ + alquiler audio', 250.00, 'USD', '2026-04-22', (SELECT id FROM profiles WHERE email='admin.olivos@atryum.test')),
  -- Histórico enero/febrero costa
  ('b3b1107d-c614-4c02-80a1-14f1da4079bc'::uuid, 'vigilancia', 'Empresa Segurvip — enero', 580.00, 'USD', '2026-01-05', '03232926-a120-453e-b97f-a7ab31dee839'::uuid),
  ('b3b1107d-c614-4c02-80a1-14f1da4079bc'::uuid, 'vigilancia', 'Empresa Segurvip — febrero', 580.00, 'USD', '2026-02-05', '03232926-a120-453e-b97f-a7ab31dee839'::uuid),
  ('b3b1107d-c614-4c02-80a1-14f1da4079bc'::uuid, 'aseo', 'Servicio limpieza enero', 200.00, 'USD', '2026-01-15', '03232926-a120-453e-b97f-a7ab31dee839'::uuid),
  ('b3b1107d-c614-4c02-80a1-14f1da4079bc'::uuid, 'aseo', 'Servicio limpieza febrero', 200.00, 'USD', '2026-02-15', '03232926-a120-453e-b97f-a7ab31dee839'::uuid),
  -- Histórico enero/febrero olivos
  ('c05ade01-0000-0000-0000-000000000001'::uuid, 'vigilancia', 'Guardia Total — enero', 850.00, 'USD', '2026-01-04', (SELECT id FROM profiles WHERE email='admin.olivos@atryum.test')),
  ('c05ade01-0000-0000-0000-000000000001'::uuid, 'vigilancia', 'Guardia Total — febrero', 850.00, 'USD', '2026-02-04', (SELECT id FROM profiles WHERE email='admin.olivos@atryum.test'))
ON CONFLICT DO NOTHING;

-- Receipts simulados en algunos expenses (admin sube factura)
UPDATE expense_records SET receipt_url =
  'https://api.dicebear.com/7.x/shapes/png?seed=expense-' || substr(id::text, 1, 8) || '&backgroundColor=F4F7FB&size=600'
WHERE receipt_url IS NULL
  AND amount > 100
  AND category IN ('mantenimiento','vigilancia','seguros','nomina','servicios');

-- ---------------------------------------------------------------------
-- 15. Más access_passes (delivery, Uber, familia, mudanza, proveedor)
-- ---------------------------------------------------------------------

INSERT INTO access_passes (organization_id, created_by, visitor_name, visitor_id_number, qr_code, valid_from, valid_until, unit_id, visitor_kind, vehicle_plate, status) VALUES
  -- Costa: delivery rappi (corta vigencia)
  ('b3b1107d-c614-4c02-80a1-14f1da4079bc'::uuid,
    (SELECT id FROM profiles WHERE email='ana.torres@costa.atryum.test'),
    'Rappi — Mensajero', 'V-DEL01',
    'COS-QR-' || substr(md5(random()::text), 1, 12),
    '2026-04-26 12:00:00'::timestamptz, '2026-04-26 13:00:00'::timestamptz,
    (SELECT id FROM units WHERE organization_id='b3b1107d-c614-4c02-80a1-14f1da4079bc'::uuid AND unit_number='1-A'),
    'delivery', NULL, 'active'),
  -- Costa: Uber con placa
  ('b3b1107d-c614-4c02-80a1-14f1da4079bc'::uuid,
    (SELECT id FROM profiles WHERE email='carlos.perez@costa.atryum.test'),
    'Uber Black', 'V-UBER',
    'COS-QR-' || substr(md5(random()::text), 1, 12),
    '2026-04-25 18:00:00'::timestamptz, '2026-04-25 19:00:00'::timestamptz,
    (SELECT id FROM units WHERE organization_id='b3b1107d-c614-4c02-80a1-14f1da4079bc'::uuid AND unit_number='1-B'),
    'rideshare', 'AB123CD', 'used'),
  -- Costa: mudanza con vehículo
  ('b3b1107d-c614-4c02-80a1-14f1da4079bc'::uuid,
    (SELECT id FROM profiles WHERE email='jose.parra@costa.atryum.test'),
    'Mudanza Express — camion 350kg', 'V-MUD01',
    'COS-QR-' || substr(md5(random()::text), 1, 12),
    '2026-04-27 09:00:00'::timestamptz, '2026-04-27 17:00:00'::timestamptz,
    (SELECT id FROM units WHERE organization_id='b3b1107d-c614-4c02-80a1-14f1da4079bc'::uuid AND unit_number='L-1'),
    'moving', 'MUD123', 'active'),
  -- Costa: técnico Cantv
  ('b3b1107d-c614-4c02-80a1-14f1da4079bc'::uuid,
    (SELECT id FROM profiles WHERE email='diego.silva@costa.atryum.test'),
    'Tecnico CANTV — Andres Ruiz', 'V-CT789',
    'COS-QR-' || substr(md5(random()::text), 1, 12),
    '2026-04-24 10:00:00'::timestamptz, '2026-04-24 14:00:00'::timestamptz,
    (SELECT id FROM units WHERE organization_id='b3b1107d-c614-4c02-80a1-14f1da4079bc'::uuid AND unit_number='4-A'),
    'service', NULL, 'active'),
  -- Olivos: familia visitante 3 días
  ('c05ade01-0000-0000-0000-000000000001'::uuid,
    (SELECT id FROM profiles WHERE email='paula.duran@olivos.atryum.test'),
    'Familia Duran (3 personas)', 'V-FAM01',
    'OLI-QR-' || substr(md5(random()::text), 1, 12),
    '2026-04-26 10:00:00'::timestamptz, '2026-04-29 22:00:00'::timestamptz,
    (SELECT id FROM units WHERE organization_id='c05ade01-0000-0000-0000-000000000001'::uuid AND unit_number='T1-301'),
    'family', NULL, 'active'),
  -- Olivos: PedidosYa
  ('c05ade01-0000-0000-0000-000000000001'::uuid,
    (SELECT id FROM profiles WHERE email='lucia.bravo@olivos.atryum.test'),
    'PedidosYa — Mensajero', 'V-PY01',
    'OLI-QR-' || substr(md5(random()::text), 1, 12),
    '2026-04-26 19:30:00'::timestamptz, '2026-04-26 20:30:00'::timestamptz,
    (SELECT id FROM units WHERE organization_id='c05ade01-0000-0000-0000-000000000001'::uuid AND unit_number='T1-201'),
    'delivery', NULL, 'used'),
  -- Olivos: contratista (jornada completa, área común sin unit)
  ('c05ade01-0000-0000-0000-000000000001'::uuid,
    (SELECT id FROM profiles WHERE email='admin.olivos@atryum.test'),
    'Constructora Sierra — equipo de 4', 'V-CONS01',
    'OLI-QR-' || substr(md5(random()::text), 1, 12),
    '2026-04-28 07:00:00'::timestamptz, '2026-04-28 18:00:00'::timestamptz,
    NULL,
    'service', 'CON456', 'active')
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------
-- 16. Decision question + responses dentro de la asamblea pasada
-- (preserva ID 70e0a001... como question_id para coherencia con seed)
-- ---------------------------------------------------------------------

INSERT INTO decision_questions (id, decision_id, question, options, position) VALUES
  ('70e0a001-0000-0000-0000-000000000001'::uuid,
    'a55e3b11-0000-0000-0000-000000000002'::uuid,
    'Aprobar contrato con Segurvip por 12 meses?',
    '["A favor", "En contra", "Abstencion"]'::jsonb,
    0)
ON CONFLICT (id) DO NOTHING;

INSERT INTO decision_responses (question_id, voter_id, selected_option, weight)
SELECT '70e0a001-0000-0000-0000-000000000001'::uuid, p.id, 'A favor', 1.0
FROM profiles p
WHERE p.email IN (
  'ana.torres@costa.atryum.test','carlos.perez@costa.atryum.test',
  'maria.rodriguez@costa.atryum.test','elena.morales@costa.atryum.test',
  'sofia.linares@costa.atryum.test','roberto.paz@costa.atryum.test',
  'hugo.medina@costa.atryum.test','marta.ochoa@costa.atryum.test'
)
ON CONFLICT DO NOTHING;

INSERT INTO decision_responses (question_id, voter_id, selected_option, weight)
SELECT '70e0a001-0000-0000-0000-000000000001'::uuid, p.id, 'En contra', 1.0
FROM profiles p
WHERE p.email IN ('luis.gomez@costa.atryum.test','diego.silva@costa.atryum.test')
ON CONFLICT DO NOTHING;

INSERT INTO decision_responses (question_id, voter_id, selected_option, weight)
SELECT '70e0a001-0000-0000-0000-000000000001'::uuid, p.id, 'Abstencion', 1.0
FROM profiles p
WHERE p.email IN ('jose.parra@costa.atryum.test','valentina.rios@costa.atryum.test')
ON CONFLICT DO NOTHING;

-- Nota: results se computa on-demand desde decision_responses (no JSONB cacheado).

-- ---------------------------------------------------------------------
-- 17. auth_events históricos (poblar log de seguridad)
-- ---------------------------------------------------------------------

INSERT INTO auth_events (organization_id, actor_id, target_email, event, payload, created_at)
SELECT
  p.organization_id, p.id, p.email,
  'magic_link_verified',
  jsonb_build_object('user_agent', 'Mozilla/5.0 (iPhone) Safari', 'ip_country', 'VE'),
  now() - (random() * interval '14 days')
FROM profiles p
WHERE p.organization_id IS NOT NULL
  AND p.role IN ('admin','resident')
  AND NOT EXISTS (SELECT 1 FROM auth_events e WHERE e.actor_id = p.id AND e.event = 'magic_link_verified')
ORDER BY random()
LIMIT 30;

-- Algunos failed (usuario equivocado)
INSERT INTO auth_events (organization_id, actor_id, target_email, event, payload, created_at) VALUES
  ('b3b1107d-c614-4c02-80a1-14f1da4079bc'::uuid, NULL, 'desconocido@gmail.com',
   'magic_link_failed',
   '{"reason":"email_not_in_org","attempts":1}'::jsonb,
   now() - interval '3 days'),
  ('c05ade01-0000-0000-0000-000000000001'::uuid, NULL, 'spammer@example.com',
   'magic_link_failed',
   '{"reason":"rate_limited","attempts":4}'::jsonb,
   now() - interval '6 days')
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------
-- 18. Más comunicados (estacionales, recordatorios, info útil)
-- ---------------------------------------------------------------------

INSERT INTO announcements (organization_id, author_id, title, content, priority, target_audience, published_at) VALUES
  -- Costa: enero
  ('b3b1107d-c614-4c02-80a1-14f1da4079bc'::uuid, '03232926-a120-453e-b97f-a7ab31dee839'::uuid,
    'Bienvenidos a 2026',
    'Estimados vecinos, les deseamos un excelente ano. Las cuotas se mantienen en $85 para apartamentos y $120 para penthouses. Cualquier ajuste se comunicara con anticipacion.',
    'normal','all','2026-01-05 09:00:00'::timestamptz),
  ('b3b1107d-c614-4c02-80a1-14f1da4079bc'::uuid, '03232926-a120-453e-b97f-a7ab31dee839'::uuid,
    'Aprobacion de derrama por pintura',
    'Tras la asamblea del 5 de febrero, se aprobo derrama de $50 (apto), $80 (PH), $30 (local) para pintura de fachada. Vence el 28 de febrero.',
    'important','all','2026-02-08 10:00:00'::timestamptz),
  ('b3b1107d-c614-4c02-80a1-14f1da4079bc'::uuid, '03232926-a120-453e-b97f-a7ab31dee839'::uuid,
    'Mantenimiento ascensor — programado',
    'El sabado 9 de mayo entre 8am y 1pm habra mantenimiento del ascensor. Disculpen las molestias.',
    'important','all','2026-04-26 09:00:00'::timestamptz),
  -- Olivos: enero/feb/marzo
  ('c05ade01-0000-0000-0000-000000000001'::uuid, (SELECT id FROM profiles WHERE email='admin.olivos@atryum.test'),
    'Inicio de gestion 2026',
    'Carmen Herrera asume como administradora del condominio. Estoy disponible de lunes a viernes 9am-12pm en la oficina de admin.',
    'normal','all','2026-01-08 11:00:00'::timestamptz),
  ('c05ade01-0000-0000-0000-000000000001'::uuid, (SELECT id FROM profiles WHERE email='admin.olivos@atryum.test'),
    'Aumento del fondo de reserva',
    'A partir de marzo el fondo de reserva sube de $15 a $20 por unidad para enfrentar reparaciones mayores. Este monto ya esta incluido en la cuota.',
    'important','all','2026-02-15 13:00:00'::timestamptz),
  ('c05ade01-0000-0000-0000-000000000001'::uuid, (SELECT id FROM profiles WHERE email='admin.olivos@atryum.test'),
    'Recordatorio normas piscina',
    'Solo residentes y maximo 3 invitados por unidad. Prohibido vidrio. Menores siempre acompanados. Ducha antes de entrar.',
    'normal','all','2026-03-20 14:00:00'::timestamptz),
  ('c05ade01-0000-0000-0000-000000000001'::uuid, (SELECT id FROM profiles WHERE email='admin.olivos@atryum.test'),
    'Datos bancarios para pagos',
    'Banco Mercantil — Condominio Los Olivos C.A. — RIF J-12345678-9 — Cuenta corriente 0105-XXXX-XX-1234567890. Tambien Pago Movil al 0414-1234567 (Mercantil 0105) RIF.',
    'normal','all','2026-01-12 10:00:00'::timestamptz)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------
-- 19. Reservas adicionales (pasadas + más futuras)
-- ---------------------------------------------------------------------

INSERT INTO reservations (common_area_id, reserved_by, start_time, end_time, status, notes) VALUES
  -- Pasadas Costa (para historial)
  ('ca0a0001-0000-0000-0000-000000000004'::uuid,
    (SELECT id FROM profiles WHERE email='hugo.medina@costa.atryum.test'),
    '2026-03-15 12:00:00'::timestamptz, '2026-03-15 18:00:00'::timestamptz,
    'confirmed', 'Cumple Hugo'),
  ('ca0a0001-0000-0000-0000-000000000003'::uuid,
    (SELECT id FROM profiles WHERE email='diego.silva@costa.atryum.test'),
    '2026-03-22 06:30:00'::timestamptz, '2026-03-22 08:00:00'::timestamptz,
    'confirmed', 'Entrenamiento'),
  ('ca0a0001-0000-0000-0000-000000000002'::uuid,
    (SELECT id FROM profiles WHERE email='claudia.zerpa@costa.atryum.test'),
    '2026-04-02 15:00:00'::timestamptz, '2026-04-02 17:00:00'::timestamptz,
    'cancelled', 'Cancelada por lluvia'),
  -- Pasadas Olivos
  ('ca0b0001-0000-0000-0000-000000000005'::uuid,
    (SELECT id FROM profiles WHERE email='isabel.escudero@olivos.atryum.test'),
    '2026-03-18 09:00:00'::timestamptz, '2026-03-18 12:00:00'::timestamptz,
    'confirmed', 'Reunion teletrabajo'),
  ('ca0b0001-0000-0000-0000-000000000004'::uuid,
    (SELECT id FROM profiles WHERE email='pablo.delgado@olivos.atryum.test'),
    '2026-03-29 16:00:00'::timestamptz, '2026-03-29 18:00:00'::timestamptz,
    'confirmed', 'Partido vecinos vs Torre 1'),
  -- Más futuras Olivos (mostrar agenda llena)
  ('ca0b0001-0000-0000-0000-000000000003'::uuid,
    (SELECT id FROM profiles WHERE email='maximo.huerta@olivos.atryum.test'),
    '2026-05-02 07:00:00'::timestamptz, '2026-05-02 08:30:00'::timestamptz,
    'confirmed', 'Crossfit'),
  ('ca0b0001-0000-0000-0000-000000000001'::uuid,
    (SELECT id FROM profiles WHERE email='helena.cordero@olivos.atryum.test'),
    '2026-05-04 16:00:00'::timestamptz, '2026-05-04 22:00:00'::timestamptz,
    'confirmed', 'Te de la tarde')
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------
-- 20. Cleanup helper temporal
-- ---------------------------------------------------------------------

DROP FUNCTION IF EXISTS _seed_p4_create_user(text, text, uuid);

COMMIT;

-- =====================================================================
-- FIN PHASE 4
--
-- Resumen aproximado tras aplicar (sumado a phase 1-3):
--   profiles ......... ~49 (33 + 16 nuevos)
--   unit_members ..... ~38 (26 + 12 nuevos vínculos owner/tenant)
--   invoices ......... ~160 (64 + ~96: ene+feb+derrama)
--   transactions ..... ~150+ (con multi-currency completo + pending + rejected)
--   expense_records .. ~36 (14 + 22 nuevos)
--   announcements .... ~15 (8 + 7 históricos)
--   maint_status_log . ~30 (3 transiciones por request)
--   access_passes .... ~15 (8 + 7 con tipos diversos)
--   exchange_rates ... ~10 (curva semanal por org)
--   auth_events ...... ~32 (logins + 2 failed)
--   vote_responses ... ~12 (asamblea Costa)
--   reservations ..... ~18 (11 + 7 históricas/futuras)
-- =====================================================================
