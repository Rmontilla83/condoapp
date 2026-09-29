-- 048 · Aceptar una invitación de unidad no cambia de condominio a un admin
--
-- accept_unit_invitation_for movía profiles.organization_id al condominio de la
-- unidad sin mirar el rol. El admin del condominio B podía invitar como
-- propietario el correo del admin del condominio A: al vincularse, ese admin
-- pasaba a administrar B y perdía A. (Hallazgo de la revisión de seguridad del
-- 2026-09-29.)
--
-- Ahora la membresía se crea igual, pero el condominio de un admin o de un
-- super_admin no se toca: eso solo lo cambia el panel de super admin.
--
-- RESTRICTIVA sobre una función: el código no depende del cambio.

CREATE OR REPLACE FUNCTION public.accept_unit_invitation_for(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT;
  v_inv RECORD;
  v_org_id UUID;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no_user');
  END IF;

  SELECT lower(email) INTO v_email FROM profiles WHERE id = p_user_id;
  IF v_email IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'profile_not_found');
  END IF;

  SELECT ui.*, u.organization_id INTO v_inv
  FROM unit_invitations ui
  JOIN units u ON u.id = ui.unit_id
  WHERE lower(ui.email) = v_email
    AND ui.accepted_at IS NULL
    AND ui.expires_at > now()
  ORDER BY ui.created_at DESC
  LIMIT 1
  FOR UPDATE OF ui;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no_pending_invitation');
  END IF;

  v_org_id := v_inv.organization_id;

  INSERT INTO unit_members (unit_id, profile_id, role, active, permissions)
  VALUES (v_inv.unit_id, p_user_id, v_inv.assigned_role, true, COALESCE(v_inv.permissions, '{}'::jsonb))
  ON CONFLICT (unit_id, profile_id, role) DO UPDATE
    SET active = true, removed_at = NULL, permissions = EXCLUDED.permissions;

  UPDATE unit_invitations
  SET accepted_at = now(), accepted_by = p_user_id
  WHERE id = v_inv.id;

  UPDATE profiles
  SET organization_id = v_org_id
  WHERE id = p_user_id
    AND (organization_id IS NULL OR organization_id != v_org_id)
    AND role NOT IN ('admin', 'super_admin');

  INSERT INTO auth_events (organization_id, actor_id, target_email, event, payload)
  VALUES (
    v_org_id,
    p_user_id,
    v_email,
    'invite_accepted',
    jsonb_build_object('unit_id', v_inv.unit_id, 'role', v_inv.assigned_role)
  );

  RETURN jsonb_build_object(
    'ok', true,
    'unit_id', v_inv.unit_id,
    'role', v_inv.assigned_role,
    'organization_id', v_org_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.accept_unit_invitation_for(UUID) FROM PUBLIC, anon, authenticated;
