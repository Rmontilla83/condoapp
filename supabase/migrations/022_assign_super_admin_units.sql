-- Asigna unidades a super_admins para que puedan probar flujos de residente
-- Idempotente: usa ON CONFLICT DO NOTHING via WHERE NOT EXISTS check.
-- Aplicado en prod 2026-04-30.

DO $$
DECLARE
  v_iker_id UUID;
  v_hr_id UUID;
  v_jodany_id UUID;
  v_unit_2a_id UUID := 'ce57aa01-0000-0000-0000-000000000003'::uuid; -- Costa 2-A
  v_unit_t1_101_id UUID := '011ce501-0000-0000-0000-000000000001'::uuid; -- Olivos T1-101
  v_unit_t2_101_id UUID := '011ce501-0000-0000-0000-000000000009'::uuid; -- Olivos T2-101
BEGIN
  SELECT id INTO v_iker_id FROM profiles WHERE email = 'iker.ascencion@gmail.com';
  SELECT id INTO v_hr_id FROM profiles WHERE email = 'hrmontilla@gmail.com';
  SELECT id INTO v_jodany_id FROM profiles WHERE email = 'monasteriojodany@gmail.com';

  IF v_iker_id IS NULL THEN RAISE EXCEPTION 'iker.ascencion@gmail.com no existe en profiles'; END IF;
  IF v_hr_id IS NULL THEN RAISE EXCEPTION 'hrmontilla@gmail.com no existe en profiles'; END IF;
  IF v_jodany_id IS NULL THEN RAISE EXCEPTION 'monasteriojodany@gmail.com no existe en profiles'; END IF;

  -- Iker → Costa 2-A (owner)
  INSERT INTO unit_members (unit_id, profile_id, role, active, permissions, joined_at)
  SELECT v_unit_2a_id, v_iker_id, 'owner', true, '{"can_see_fee":true,"can_pay_fee":true}'::jsonb, now()
  WHERE NOT EXISTS (
    SELECT 1 FROM unit_members
    WHERE unit_id = v_unit_2a_id AND profile_id = v_iker_id AND active
  );

  -- hrmontilla → Olivos T1-101 (owner)
  INSERT INTO unit_members (unit_id, profile_id, role, active, permissions, joined_at)
  SELECT v_unit_t1_101_id, v_hr_id, 'owner', true, '{"can_see_fee":true,"can_pay_fee":true}'::jsonb, now()
  WHERE NOT EXISTS (
    SELECT 1 FROM unit_members
    WHERE unit_id = v_unit_t1_101_id AND profile_id = v_hr_id AND active
  );

  -- monasteriojodany → Olivos T2-101 (owner)
  INSERT INTO unit_members (unit_id, profile_id, role, active, permissions, joined_at)
  SELECT v_unit_t2_101_id, v_jodany_id, 'owner', true, '{"can_see_fee":true,"can_pay_fee":true}'::jsonb, now()
  WHERE NOT EXISTS (
    SELECT 1 FROM unit_members
    WHERE unit_id = v_unit_t2_101_id AND profile_id = v_jodany_id AND active
  );

  -- Sincronizar organization_id en profile con la org de su unidad
  -- (sin esto, requireAdmin falla y getDashboardContext no carga)
  UPDATE profiles
  SET organization_id = 'b3b1107d-c614-4c02-80a1-14f1da4079bc'::uuid -- Costa de Plata
  WHERE id = v_iker_id AND organization_id IS NULL;

  UPDATE profiles
  SET organization_id = 'c05ade01-0000-0000-0000-000000000001'::uuid -- Los Olivos
  WHERE id = v_jodany_id AND organization_id IS NULL;
END $$;
