-- Demo de Costa de Plata (2026-10-28, autorizado por Rafael para el video de propietarios):
-- la vista «como residente» de Rafael (en pantalla «María González») pasa del apartamento
-- A 1-1 (moroso en la demo) al A 4-2 (al día), como propietaria. restaurar.py la quita.
DO $$
DECLARE
  v_org uuid := '29c3644c-eef8-40dd-aa6c-d26ead566d4f';
  v_actor uuid;
  v_nueva uuid;
BEGIN
  SELECT id INTO v_actor FROM profiles WHERE email = 'rafaelmontilla8@gmail.com';
  SELECT id INTO v_nueva FROM units WHERE organization_id = v_org AND block = 'Torre A' AND unit_number = '4-2';
  IF v_nueva IS NULL THEN RAISE EXCEPTION 'No existe Torre A 4-2'; END IF;
  DELETE FROM unit_members um USING units u
   WHERE u.id = um.unit_id AND u.organization_id = v_org AND um.profile_id = v_actor;
  INSERT INTO unit_members (unit_id, profile_id, role) VALUES (v_nueva, v_actor, 'owner');
END $$;

SELECT u.block || ' ' || u.unit_number AS unidad, um.role
  FROM unit_members um JOIN units u ON u.id = um.unit_id
 WHERE um.profile_id = (SELECT id FROM profiles WHERE email = 'rafaelmontilla8@gmail.com');
