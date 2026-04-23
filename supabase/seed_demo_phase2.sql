-- =====================================================================
-- ATRYUM DEMO — FASE 2: auth.users (admin olivos + residents) + unit_members
-- =====================================================================

BEGIN;

-- Asegurar extension pgcrypto para crypt()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Helper function: crea auth.user idempotente y retorna id
-- (si ya existe el email, retorna el id existente)
CREATE OR REPLACE FUNCTION _seed_create_user(p_email text, p_name text)
RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE
  v_id uuid;
BEGIN
  SELECT id INTO v_id FROM auth.users WHERE email = p_email;
  IF v_id IS NOT NULL THEN
    RETURN v_id;
  END IF;

  v_id := gen_random_uuid();
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data,
    aud, role, confirmation_token, recovery_token, email_change_token_new, email_change
  ) VALUES (
    v_id,
    '00000000-0000-0000-0000-000000000000'::uuid,
    p_email,
    crypt('demo-atryum-2026', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', p_name),
    'authenticated', 'authenticated', '', '', '', ''
  );
  RETURN v_id;
END $$;

-- Admin de Los Olivos
SELECT _seed_create_user('admin.olivos@atryum.test', 'Carmen Herrera');

-- 8 residents Costa de Plata
SELECT _seed_create_user('ana.torres@costa.atryum.test',     'Ana Torres');
SELECT _seed_create_user('carlos.perez@costa.atryum.test',   'Carlos Perez');
SELECT _seed_create_user('maria.rodriguez@costa.atryum.test','Maria Rodriguez');
SELECT _seed_create_user('luis.gomez@costa.atryum.test',     'Luis Gomez');
SELECT _seed_create_user('elena.morales@costa.atryum.test',  'Elena Morales');
SELECT _seed_create_user('diego.silva@costa.atryum.test',    'Diego Silva');
SELECT _seed_create_user('sofia.linares@costa.atryum.test',  'Sofia Linares');
SELECT _seed_create_user('roberto.paz@costa.atryum.test',    'Roberto Paz');

-- Inquilinos Costa de Plata (para unidades con tenant)
SELECT _seed_create_user('ines.quintero@costa.atryum.test',  'Ines Quintero');
SELECT _seed_create_user('pedro.ramos@costa.atryum.test',    'Pedro Ramos');
SELECT _seed_create_user('laura.vega@costa.atryum.test',     'Laura Vega');

-- 12 residents Los Olivos
SELECT _seed_create_user('juan.acosta@olivos.atryum.test',   'Juan Acosta');
SELECT _seed_create_user('lucia.bravo@olivos.atryum.test',   'Lucia Bravo');
SELECT _seed_create_user('miguel.campo@olivos.atryum.test',  'Miguel Campos');
SELECT _seed_create_user('paula.duran@olivos.atryum.test',   'Paula Duran');
SELECT _seed_create_user('jorge.estevez@olivos.atryum.test', 'Jorge Estevez');
SELECT _seed_create_user('ines.fernandez@olivos.atryum.test','Ines Fernandez');
SELECT _seed_create_user('tomas.guzman@olivos.atryum.test',  'Tomas Guzman');
SELECT _seed_create_user('valentina.h@olivos.atryum.test',   'Valentina Herrera');
SELECT _seed_create_user('andres.iriarte@olivos.atryum.test','Andres Iriarte');
SELECT _seed_create_user('camila.juarez@olivos.atryum.test', 'Camila Juarez');
SELECT _seed_create_user('rafael.kuntz@olivos.atryum.test',  'Rafael Kuntz');
SELECT _seed_create_user('gabriela.leon@olivos.atryum.test', 'Gabriela Leon');

-- Inquilinos Los Olivos
SELECT _seed_create_user('daniel.mora@olivos.atryum.test',   'Daniel Mora');
SELECT _seed_create_user('silvia.nieto@olivos.atryum.test',  'Silvia Nieto');
SELECT _seed_create_user('oscar.ortiz@olivos.atryum.test',   'Oscar Ortiz');

-- Ajustar profiles (trigger handle_new_user los creo con defaults):
-- - admin de Olivos: role=admin + organization_id
-- - residents Costa: role=resident + organization_id
-- - residents Olivos: role=resident + organization_id

UPDATE profiles SET
  full_name = COALESCE(NULLIF(full_name,''), 'Carmen Herrera'),
  role = 'admin',
  organization_id = 'c05ade01-0000-0000-0000-000000000001'::uuid
WHERE email = 'admin.olivos@atryum.test';

UPDATE profiles SET
  full_name = COALESCE(NULLIF(full_name,''), CASE email
    WHEN 'ana.torres@costa.atryum.test' THEN 'Ana Torres'
    WHEN 'carlos.perez@costa.atryum.test' THEN 'Carlos Perez'
    WHEN 'maria.rodriguez@costa.atryum.test' THEN 'Maria Rodriguez'
    WHEN 'luis.gomez@costa.atryum.test' THEN 'Luis Gomez'
    WHEN 'elena.morales@costa.atryum.test' THEN 'Elena Morales'
    WHEN 'diego.silva@costa.atryum.test' THEN 'Diego Silva'
    WHEN 'sofia.linares@costa.atryum.test' THEN 'Sofia Linares'
    WHEN 'roberto.paz@costa.atryum.test' THEN 'Roberto Paz'
    WHEN 'ines.quintero@costa.atryum.test' THEN 'Ines Quintero'
    WHEN 'pedro.ramos@costa.atryum.test' THEN 'Pedro Ramos'
    WHEN 'laura.vega@costa.atryum.test' THEN 'Laura Vega'
  END),
  role = 'resident',
  organization_id = 'b3b1107d-c614-4c02-80a1-14f1da4079bc'::uuid
WHERE email LIKE '%@costa.atryum.test';

UPDATE profiles SET
  full_name = COALESCE(NULLIF(full_name,''), CASE email
    WHEN 'juan.acosta@olivos.atryum.test' THEN 'Juan Acosta'
    WHEN 'lucia.bravo@olivos.atryum.test' THEN 'Lucia Bravo'
    WHEN 'miguel.campo@olivos.atryum.test' THEN 'Miguel Campos'
    WHEN 'paula.duran@olivos.atryum.test' THEN 'Paula Duran'
    WHEN 'jorge.estevez@olivos.atryum.test' THEN 'Jorge Estevez'
    WHEN 'ines.fernandez@olivos.atryum.test' THEN 'Ines Fernandez'
    WHEN 'tomas.guzman@olivos.atryum.test' THEN 'Tomas Guzman'
    WHEN 'valentina.h@olivos.atryum.test' THEN 'Valentina Herrera'
    WHEN 'andres.iriarte@olivos.atryum.test' THEN 'Andres Iriarte'
    WHEN 'camila.juarez@olivos.atryum.test' THEN 'Camila Juarez'
    WHEN 'rafael.kuntz@olivos.atryum.test' THEN 'Rafael Kuntz'
    WHEN 'gabriela.leon@olivos.atryum.test' THEN 'Gabriela Leon'
    WHEN 'daniel.mora@olivos.atryum.test' THEN 'Daniel Mora'
    WHEN 'silvia.nieto@olivos.atryum.test' THEN 'Silvia Nieto'
    WHEN 'oscar.ortiz@olivos.atryum.test' THEN 'Oscar Ortiz'
  END),
  role = 'resident',
  organization_id = 'c05ade01-0000-0000-0000-000000000001'::uuid
WHERE email LIKE '%@olivos.atryum.test';

-- --------------------------------------------------------------------
-- unit_members: asignar owners y tenants a unidades
-- --------------------------------------------------------------------

-- Costa de Plata: owner en cada unidad, tenant en las que aplica
INSERT INTO unit_members (unit_id, profile_id, role, active, permissions)
SELECT unit_id::uuid, profile_id, role, true,
  CASE WHEN role = 'owner'
    THEN '{"can_see_fee":true, "can_pay_fee":true}'::jsonb
    ELSE '{"can_see_fee":false, "can_pay_fee":false}'::jsonb
  END
FROM (VALUES
  -- Costa de Plata owners
  ('ce57aa01-0000-0000-0000-000000000001', (SELECT id FROM profiles WHERE email='ana.torres@costa.atryum.test'),     'owner'),
  ('ce57aa01-0000-0000-0000-000000000002', (SELECT id FROM profiles WHERE email='carlos.perez@costa.atryum.test'),   'owner'),
  ('ce57aa01-0000-0000-0000-000000000003', (SELECT id FROM profiles WHERE email='maria.rodriguez@costa.atryum.test'),'owner'),
  ('ce57aa01-0000-0000-0000-000000000004', (SELECT id FROM profiles WHERE email='luis.gomez@costa.atryum.test'),     'owner'),
  ('ce57aa01-0000-0000-0000-000000000006', (SELECT id FROM profiles WHERE email='elena.morales@costa.atryum.test'),  'owner'),
  ('ce57aa01-0000-0000-0000-000000000007', (SELECT id FROM profiles WHERE email='diego.silva@costa.atryum.test'),    'owner'),
  ('ce57aa01-0000-0000-0000-000000000008', (SELECT id FROM profiles WHERE email='sofia.linares@costa.atryum.test'),  'owner'),
  ('ce57aa01-0000-0000-0000-000000000009', (SELECT id FROM profiles WHERE email='roberto.paz@costa.atryum.test'),    'owner'),
  -- tenants Costa
  ('ce57aa01-0000-0000-0000-000000000003', (SELECT id FROM profiles WHERE email='ines.quintero@costa.atryum.test'),  'tenant'),
  ('ce57aa01-0000-0000-0000-000000000005', (SELECT id FROM profiles WHERE email='pedro.ramos@costa.atryum.test'),    'tenant'),
  ('ce57aa01-0000-0000-0000-000000000008', (SELECT id FROM profiles WHERE email='laura.vega@costa.atryum.test'),     'tenant')
) AS v(unit_id, profile_id, role)
WHERE profile_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Los Olivos: owners + tenants
INSERT INTO unit_members (unit_id, profile_id, role, active, permissions)
SELECT unit_id::uuid, profile_id, role, true,
  CASE WHEN role = 'owner'
    THEN '{"can_see_fee":true, "can_pay_fee":true}'::jsonb
    ELSE '{"can_see_fee":true, "can_pay_fee":false}'::jsonb
  END
FROM (VALUES
  ('011ce501-0000-0000-0000-000000000001', (SELECT id FROM profiles WHERE email='juan.acosta@olivos.atryum.test'),   'owner'),
  ('011ce501-0000-0000-0000-000000000003', (SELECT id FROM profiles WHERE email='lucia.bravo@olivos.atryum.test'),   'owner'),
  ('011ce501-0000-0000-0000-000000000004', (SELECT id FROM profiles WHERE email='miguel.campo@olivos.atryum.test'),  'owner'),
  ('011ce501-0000-0000-0000-000000000005', (SELECT id FROM profiles WHERE email='paula.duran@olivos.atryum.test'),   'owner'),
  ('011ce501-0000-0000-0000-000000000006', (SELECT id FROM profiles WHERE email='jorge.estevez@olivos.atryum.test'), 'owner'),
  ('011ce501-0000-0000-0000-000000000008', (SELECT id FROM profiles WHERE email='ines.fernandez@olivos.atryum.test'),'owner'),
  ('011ce501-0000-0000-0000-000000000009', (SELECT id FROM profiles WHERE email='tomas.guzman@olivos.atryum.test'),  'owner'),
  ('011ce501-0000-0000-0000-000000000010', (SELECT id FROM profiles WHERE email='valentina.h@olivos.atryum.test'),   'owner'),
  ('011ce501-0000-0000-0000-000000000011', (SELECT id FROM profiles WHERE email='andres.iriarte@olivos.atryum.test'),'owner'),
  ('011ce501-0000-0000-0000-000000000012', (SELECT id FROM profiles WHERE email='camila.juarez@olivos.atryum.test'), 'owner'),
  ('011ce501-0000-0000-0000-000000000014', (SELECT id FROM profiles WHERE email='rafael.kuntz@olivos.atryum.test'),  'owner'),
  ('011ce501-0000-0000-0000-000000000015', (SELECT id FROM profiles WHERE email='gabriela.leon@olivos.atryum.test'), 'owner'),
  -- tenants Olivos
  ('011ce501-0000-0000-0000-000000000002', (SELECT id FROM profiles WHERE email='daniel.mora@olivos.atryum.test'),   'tenant'),
  ('011ce501-0000-0000-0000-000000000004', (SELECT id FROM profiles WHERE email='silvia.nieto@olivos.atryum.test'),  'tenant'),
  ('011ce501-0000-0000-0000-000000000007', (SELECT id FROM profiles WHERE email='oscar.ortiz@olivos.atryum.test'),   'tenant')
) AS v(unit_id, profile_id, role)
WHERE profile_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Cleanup
DROP FUNCTION _seed_create_user(text, text);

COMMIT;
