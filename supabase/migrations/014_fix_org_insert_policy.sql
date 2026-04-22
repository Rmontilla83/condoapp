-- Faltaba la policy de INSERT en organizations.
-- Permite a super_admins crear condominios.

DROP POLICY IF EXISTS "Super admins can insert orgs" ON organizations;

CREATE POLICY "Super admins can insert orgs"
  ON organizations FOR INSERT
  TO authenticated
  WITH CHECK (public.user_role() = 'super_admin');
