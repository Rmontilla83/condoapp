-- 031 · accept_unit_invitation_for(uuid): vincular a un usuario que YA existe
--
-- Bug: `inviteUnitMember` (src/app/(dashboard)/admin/units/actions.ts) hace
--
--     if (!ensureRes.created) { await admin.rpc("accept_unit_invitation"); }
--
-- con el client de service-role. Dentro de esa función `auth.uid()` es NULL,
-- así que devuelve `{ok:false, error:'not_authenticated'}` y no hace nada. El
-- retorno además se descarta. Consecuencia: invitar a alguien que ya tiene
-- cuenta NUNCA lo vinculaba a la unidad, mientras el admin leía "invitación
-- enviada" y se quedaba tranquilo. Solo funcionaba con usuarios nuevos, porque
-- ahí el vínculo lo hace el trigger handle_new_user.
--
-- Se extrae la lógica a una variante que recibe el usuario explícitamente, y la
-- original pasa a delegar en ella para que no haya dos copias que se separen.

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
  WHERE id = p_user_id AND (organization_id IS NULL OR organization_id != v_org_id);

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

-- Solo el servidor puede vincular a un tercero. Un usuario autenticado sigue
-- teniendo la versión sin parámetros, que resuelve su propio auth.uid().
REVOKE ALL ON FUNCTION public.accept_unit_invitation_for(UUID) FROM PUBLIC, anon, authenticated;

-- La original queda como envoltorio: una sola implementación.
CREATE OR REPLACE FUNCTION public.accept_unit_invitation()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;
  RETURN public.accept_unit_invitation_for(auth.uid());
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_unit_invitation() TO authenticated;
