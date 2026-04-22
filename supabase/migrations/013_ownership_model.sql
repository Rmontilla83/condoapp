-- ============================================
-- 013 — Ownership model + access codes + observabilidad
-- Audit V2: ver AUDIT_V2.md en raíz de condoapp
--
-- AVISO: Esta migración LIMPIA todos los datos de prueba.
-- Preserva solo los super_admins (rafaelmontilla8@gmail.com, iker.ascencion@gmail.com).
-- ============================================

-- ============================================
-- 0. LIMPIEZA DE DATOS DE PRUEBA
-- ============================================
-- Preserva solo super_admins. El resto se borra.
-- profiles.id tiene FK a auth.users(id) ON DELETE CASCADE,
-- así que borrar auth.users arrastra profiles y todo lo que cascadea detrás.

DELETE FROM auth.users
WHERE id NOT IN (
  SELECT id FROM public.profiles WHERE role = 'super_admin'
);

-- Limpiar organizations (cascadea: units, invoices, expenses, announcements, reservations, etc.)
DELETE FROM public.organizations;

-- Limpiar admin_invitations residuales
DELETE FROM public.admin_invitations;

-- Desvincular super_admins de orgs ya borradas (por si quedó valor huérfano)
UPDATE public.profiles SET organization_id = NULL WHERE role = 'super_admin';

-- ============================================
-- 1. POLICIES DEL CONDOMINIO (nivel organización)
-- ============================================
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS tenant_can_vote             BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tenant_can_see_delinquents  BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tenant_can_reserve          BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN organizations.tenant_can_vote IS 'Si los inquilinos pueden votar en asambleas (legal varía por país/condo)';
COMMENT ON COLUMN organizations.tenant_can_see_delinquents IS 'Si los inquilinos ven la lista de morosos de todo el condo';
COMMENT ON COLUMN organizations.tenant_can_reserve IS 'Si los inquilinos pueden reservar áreas comunes';

-- ============================================
-- 2. MODO DE OCUPACIÓN POR UNIDAD
-- ============================================
ALTER TABLE units
  ADD COLUMN IF NOT EXISTS ownership_mode TEXT NOT NULL DEFAULT 'owner_occupied'
    CHECK (ownership_mode IN ('owner_occupied', 'tenant_with_active_owner', 'tenant_only'));

COMMENT ON COLUMN units.ownership_mode IS
  'owner_occupied: propietario vive allí | tenant_with_active_owner: arrendada con propietario en la app | tenant_only: arrendada con propietario ausente';

-- ============================================
-- 3. UNIT_MEMBERS — reemplaza unit_residents con roles explícitos
-- ============================================
CREATE TABLE unit_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'tenant')),
  active BOOLEAN NOT NULL DEFAULT true,
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  removed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(unit_id, profile_id, role)
);

CREATE INDEX idx_unit_members_unit ON unit_members(unit_id) WHERE active;
CREATE INDEX idx_unit_members_profile ON unit_members(profile_id) WHERE active;
CREATE INDEX idx_unit_members_role ON unit_members(role) WHERE active;

COMMENT ON TABLE unit_members IS 'Relación profile ↔ unit con role owner/tenant. Reemplaza unit_residents.';
COMMENT ON COLUMN unit_members.permissions IS 'Para tenant: {can_see_fee, can_pay_fee}. Configurable por el propietario.';

-- ============================================
-- 4. DROP unit_residents — ya no se usa
-- ============================================
-- Primero migrar FKs de otras tablas que apuntaban a unit_residents (si hubiera)
-- En el schema actual no hay FK a unit_residents, solo queries que la usan.

-- Quitar policies viejas que referencian unit_residents o permitían self-link
DROP POLICY IF EXISTS "Users can link themselves to unit" ON unit_residents;
DROP POLICY IF EXISTS "Users can view own unit links" ON unit_residents;
DROP POLICY IF EXISTS "Admins can view org unit residents" ON unit_residents;
DROP POLICY IF EXISTS "Users can view unit residents in their org" ON unit_residents;
DROP POLICY IF EXISTS "Admins can manage unit residents" ON unit_residents;

-- Policies en OTRAS tablas que usan subqueries sobre unit_residents — recrear apuntando a unit_members
DROP POLICY IF EXISTS "Residents can view their invoices" ON invoices;
CREATE POLICY "Residents can view their invoices"
  ON invoices FOR SELECT TO authenticated
  USING (
    unit_id IN (
      SELECT unit_id FROM unit_members
      WHERE profile_id = auth.uid() AND active = true
    )
  );

DROP POLICY IF EXISTS "Users can view their transactions" ON transactions;
CREATE POLICY "Users can view their transactions"
  ON transactions FOR SELECT TO authenticated
  USING (
    invoice_id IN (
      SELECT id FROM invoices WHERE unit_id IN (
        SELECT unit_id FROM unit_members
        WHERE profile_id = auth.uid() AND active = true
      )
    )
  );

DROP POLICY IF EXISTS "Users can insert transactions for their invoices" ON transactions;
CREATE POLICY "Users can insert transactions for their invoices"
  ON transactions FOR INSERT TO authenticated
  WITH CHECK (
    invoice_id IN (
      SELECT id FROM invoices WHERE unit_id IN (
        SELECT unit_id FROM unit_members
        WHERE profile_id = auth.uid() AND active = true
      )
    )
  );

-- Ahora sí se puede borrar
DROP TABLE IF EXISTS unit_residents CASCADE;

-- ============================================
-- 5. UNIT_ACCESS_CODES — códigos físicos del híbrido 1+2
-- ============================================
CREATE TABLE unit_access_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  assigned_role TEXT NOT NULL CHECK (assigned_role IN ('owner', 'tenant')),
  created_by UUID NOT NULL REFERENCES profiles(id),
  used_by UUID REFERENCES profiles(id),
  used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_access_codes_unit ON unit_access_codes(unit_id);
CREATE INDEX idx_access_codes_code ON unit_access_codes(code) WHERE used_at IS NULL AND revoked_at IS NULL;

COMMENT ON TABLE unit_access_codes IS 'Códigos únicos por unidad para residentes sin email precargado. Un solo uso.';

-- ============================================
-- 6. UNIT_INVITATIONS — email precargado (Opción 1 del híbrido)
-- ============================================
CREATE TABLE unit_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  assigned_role TEXT NOT NULL CHECK (assigned_role IN ('owner', 'tenant')),
  invited_by UUID NOT NULL REFERENCES profiles(id),
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  accepted_at TIMESTAMPTZ,
  accepted_by UUID REFERENCES profiles(id),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(unit_id, email, assigned_role)
);

CREATE INDEX idx_unit_invitations_email ON unit_invitations(lower(email)) WHERE accepted_at IS NULL;

COMMENT ON TABLE unit_invitations IS 'Email precargado por admin/propietario. Al crearse el profile, trigger lo vincula.';

-- ============================================
-- 7. ADMIN_INVITATIONS — agregar campo para saber quién lo tomó
-- ============================================
ALTER TABLE admin_invitations
  ADD COLUMN IF NOT EXISTS accepted_by UUID REFERENCES profiles(id);

-- B7: fix RLS para usar auth.jwt()
DROP POLICY IF EXISTS "Users can view own invitations" ON admin_invitations;

CREATE POLICY "Users can view own admin invitations"
  ON admin_invitations FOR SELECT TO authenticated
  USING (lower(email) = lower(auth.jwt() ->> 'email'));

-- ============================================
-- 8. AUTH_EVENTS — observabilidad
-- ============================================
CREATE TABLE auth_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  target_email TEXT,
  event TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_auth_events_org ON auth_events(organization_id, created_at DESC);
CREATE INDEX idx_auth_events_event ON auth_events(event, created_at DESC);
CREATE INDEX idx_auth_events_target ON auth_events(lower(target_email), created_at DESC);

COMMENT ON TABLE auth_events IS 'Log de eventos de auth: invite_sent, invite_accepted, magic_link_verified, code_redeemed, *_failed';

-- ============================================
-- 9. FUNCIÓN: redeem_access_code(code) — canjear código físico
-- ============================================
CREATE OR REPLACE FUNCTION public.redeem_access_code(p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_access RECORD;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT c.*, u.organization_id INTO v_access
  FROM unit_access_codes c
  JOIN units u ON u.id = c.unit_id
  WHERE c.code = upper(trim(p_code))
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO auth_events (actor_id, event, payload)
    VALUES (v_user_id, 'code_redeem_failed', jsonb_build_object('reason', 'not_found', 'code', p_code));
    RETURN jsonb_build_object('ok', false, 'error', 'code_not_found');
  END IF;

  IF v_access.used_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'code_already_used');
  END IF;

  IF v_access.revoked_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'code_revoked');
  END IF;

  IF v_access.expires_at < now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'code_expired');
  END IF;

  INSERT INTO unit_members (unit_id, profile_id, role, active)
  VALUES (v_access.unit_id, v_user_id, v_access.assigned_role, true)
  ON CONFLICT (unit_id, profile_id, role) DO UPDATE
    SET active = true, removed_at = NULL;

  UPDATE unit_access_codes
  SET used_by = v_user_id, used_at = now()
  WHERE id = v_access.id;

  UPDATE profiles
  SET organization_id = v_access.organization_id
  WHERE id = v_user_id AND (organization_id IS NULL OR organization_id != v_access.organization_id);

  INSERT INTO auth_events (organization_id, actor_id, event, payload)
  VALUES (
    v_access.organization_id,
    v_user_id,
    'code_redeemed',
    jsonb_build_object('unit_id', v_access.unit_id, 'role', v_access.assigned_role)
  );

  RETURN jsonb_build_object(
    'ok', true,
    'unit_id', v_access.unit_id,
    'role', v_access.assigned_role,
    'organization_id', v_access.organization_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.redeem_access_code(TEXT) TO authenticated;

-- ============================================
-- 10. FUNCIÓN: accept_unit_invitation() — auto-vincular por email
-- ============================================
CREATE OR REPLACE FUNCTION public.accept_unit_invitation()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_email TEXT;
  v_inv RECORD;
  v_org_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT lower(email) INTO v_email FROM profiles WHERE id = v_user_id;
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
  VALUES (v_inv.unit_id, v_user_id, v_inv.assigned_role, true, COALESCE(v_inv.permissions, '{}'::jsonb))
  ON CONFLICT (unit_id, profile_id, role) DO UPDATE
    SET active = true, removed_at = NULL, permissions = EXCLUDED.permissions;

  UPDATE unit_invitations
  SET accepted_at = now(), accepted_by = v_user_id
  WHERE id = v_inv.id;

  UPDATE profiles
  SET organization_id = v_org_id
  WHERE id = v_user_id AND (organization_id IS NULL OR organization_id != v_org_id);

  INSERT INTO auth_events (organization_id, actor_id, target_email, event, payload)
  VALUES (
    v_org_id,
    v_user_id,
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

GRANT EXECUTE ON FUNCTION public.accept_unit_invitation() TO authenticated;

-- ============================================
-- 11. FUNCIÓN: accept_admin_invitation() — auto-promover admin
-- ============================================
CREATE OR REPLACE FUNCTION public.accept_admin_invitation()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_email TEXT;
  v_current_role TEXT;
  v_inv RECORD;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT lower(email), role INTO v_email, v_current_role
  FROM profiles WHERE id = v_user_id;

  -- B9: NO degradar super_admins
  IF v_current_role = 'super_admin' THEN
    RETURN jsonb_build_object('ok', true, 'skipped', 'super_admin');
  END IF;

  SELECT * INTO v_inv
  FROM admin_invitations
  WHERE lower(email) = v_email AND accepted_at IS NULL
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no_pending_invitation');
  END IF;

  UPDATE profiles
  SET role = 'admin', organization_id = v_inv.organization_id
  WHERE id = v_user_id;

  UPDATE admin_invitations
  SET accepted_at = now(), accepted_by = v_user_id
  WHERE id = v_inv.id;

  INSERT INTO auth_events (organization_id, actor_id, target_email, event, payload)
  VALUES (v_inv.organization_id, v_user_id, v_email, 'admin_invite_accepted', '{}'::jsonb);

  RETURN jsonb_build_object('ok', true, 'organization_id', v_inv.organization_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_admin_invitation() TO authenticated;

-- ============================================
-- 12. TRIGGER handle_new_user extendido
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT;
  v_admin_inv RECORD;
  v_unit_inv RECORD;
BEGIN
  v_email := lower(NEW.email);

  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );

  -- Admin invitation pendiente
  SELECT * INTO v_admin_inv
  FROM admin_invitations
  WHERE lower(email) = v_email AND accepted_at IS NULL
  ORDER BY created_at DESC LIMIT 1;

  IF FOUND THEN
    UPDATE profiles
    SET role = 'admin', organization_id = v_admin_inv.organization_id
    WHERE id = NEW.id;

    UPDATE admin_invitations
    SET accepted_at = now(), accepted_by = NEW.id
    WHERE id = v_admin_inv.id;

    INSERT INTO auth_events (organization_id, actor_id, target_email, event, payload)
    VALUES (v_admin_inv.organization_id, NEW.id, v_email, 'admin_invite_accepted', jsonb_build_object('via', 'signup_trigger'));
  ELSE
    -- Unit invitation pendiente
    SELECT ui.*, u.organization_id AS org_id INTO v_unit_inv
    FROM unit_invitations ui
    JOIN units u ON u.id = ui.unit_id
    WHERE lower(ui.email) = v_email
      AND ui.accepted_at IS NULL
      AND ui.expires_at > now()
    ORDER BY ui.created_at DESC LIMIT 1;

    IF FOUND THEN
      INSERT INTO unit_members (unit_id, profile_id, role, active, permissions)
      VALUES (v_unit_inv.unit_id, NEW.id, v_unit_inv.assigned_role, true, COALESCE(v_unit_inv.permissions, '{}'::jsonb))
      ON CONFLICT (unit_id, profile_id, role) DO NOTHING;

      UPDATE profiles
      SET organization_id = v_unit_inv.org_id, role = 'resident'
      WHERE id = NEW.id;

      UPDATE unit_invitations
      SET accepted_at = now(), accepted_by = NEW.id
      WHERE id = v_unit_inv.id;

      INSERT INTO auth_events (organization_id, actor_id, target_email, event, payload)
      VALUES (v_unit_inv.org_id, NEW.id, v_email, 'invite_accepted', jsonb_build_object('unit_id', v_unit_inv.unit_id, 'role', v_unit_inv.assigned_role, 'via', 'signup_trigger'));
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================
-- 13. HELPER: ¿usuario es miembro de unidad X con role Y?
-- ============================================
CREATE OR REPLACE FUNCTION public.is_unit_member(p_unit_id UUID, p_role TEXT DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM unit_members
    WHERE unit_id = p_unit_id
      AND profile_id = auth.uid()
      AND active = true
      AND (p_role IS NULL OR role = p_role)
  );
$$;

-- ============================================
-- 14. HELPER: ¿inquilino tiene permiso X?
-- ============================================
CREATE OR REPLACE FUNCTION public.tenant_has_permission(p_unit_id UUID, p_permission TEXT)
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT (permissions ->> p_permission)::boolean
     FROM unit_members
     WHERE unit_id = p_unit_id
       AND profile_id = auth.uid()
       AND role = 'tenant'
       AND active = true),
    false
  );
$$;

GRANT EXECUTE ON FUNCTION public.tenant_has_permission(UUID, TEXT) TO authenticated;

-- ============================================
-- 15. RLS — unit_members
-- ============================================
ALTER TABLE unit_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own unit memberships"
  ON unit_members FOR SELECT TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY "Owners can view members of their units"
  ON unit_members FOR SELECT TO authenticated
  USING (public.is_unit_member(unit_id, 'owner'));

CREATE POLICY "Admins can view all members in org"
  ON unit_members FOR SELECT TO authenticated
  USING (
    unit_id IN (SELECT id FROM units WHERE organization_id = public.user_org_id())
    AND public.user_role() IN ('admin', 'super_admin')
  );

CREATE POLICY "Admins can manage members in org"
  ON unit_members FOR ALL TO authenticated
  USING (
    unit_id IN (SELECT id FROM units WHERE organization_id = public.user_org_id())
    AND public.user_role() IN ('admin', 'super_admin')
  );

CREATE POLICY "Owners can update tenants in their units"
  ON unit_members FOR UPDATE TO authenticated
  USING (public.is_unit_member(unit_id, 'owner') AND role = 'tenant');

CREATE POLICY "Owners can remove tenants in their units"
  ON unit_members FOR DELETE TO authenticated
  USING (public.is_unit_member(unit_id, 'owner') AND role = 'tenant');

-- ============================================
-- 16. RLS — unit_access_codes
-- ============================================
ALTER TABLE unit_access_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage access codes in org"
  ON unit_access_codes FOR ALL TO authenticated
  USING (
    unit_id IN (SELECT id FROM units WHERE organization_id = public.user_org_id())
    AND public.user_role() IN ('admin', 'super_admin')
  );

CREATE POLICY "Owners manage access codes for tenant in their units"
  ON unit_access_codes FOR ALL TO authenticated
  USING (assigned_role = 'tenant' AND public.is_unit_member(unit_id, 'owner'));

-- ============================================
-- 17. RLS — unit_invitations
-- ============================================
ALTER TABLE unit_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage unit invitations in org"
  ON unit_invitations FOR ALL TO authenticated
  USING (
    unit_id IN (SELECT id FROM units WHERE organization_id = public.user_org_id())
    AND public.user_role() IN ('admin', 'super_admin')
  );

CREATE POLICY "Owners invite tenants to their units"
  ON unit_invitations FOR ALL TO authenticated
  USING (assigned_role = 'tenant' AND public.is_unit_member(unit_id, 'owner'));

CREATE POLICY "Users can view own pending invitations"
  ON unit_invitations FOR SELECT TO authenticated
  USING (lower(email) = lower(auth.jwt() ->> 'email'));

-- ============================================
-- 18. RLS — auth_events (solo lectura admins)
-- ============================================
ALTER TABLE auth_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins read all events"
  ON auth_events FOR SELECT TO authenticated
  USING (public.user_role() = 'super_admin');

CREATE POLICY "Admins read events in their org"
  ON auth_events FOR SELECT TO authenticated
  USING (organization_id = public.user_org_id() AND public.user_role() = 'admin');

-- ============================================
-- 19. Quitar policy insegura "Auth users can view units for joining"
-- (el residente ya no elige su unidad)
-- ============================================
DROP POLICY IF EXISTS "Auth users can view units for joining" ON units;

-- Nueva policy: solo ves unidades de tu org o donde eres miembro
CREATE POLICY "Users view units where they are members"
  ON units FOR SELECT TO authenticated
  USING (
    organization_id = public.user_org_id()
    OR id IN (SELECT unit_id FROM unit_members WHERE profile_id = auth.uid() AND active)
  );

-- ============================================
-- FIN 013
-- ============================================
