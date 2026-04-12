-- Allow users to link themselves to a unit (onboarding)
CREATE POLICY "Users can link themselves to unit"
  ON unit_residents FOR INSERT
  TO authenticated
  WITH CHECK (profile_id = auth.uid());

-- Allow users to see their own unit links
CREATE POLICY "Users can view own unit links"
  ON unit_residents FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

-- Allow admins to see all unit residents in their org
CREATE POLICY "Admins can view org unit residents"
  ON unit_residents FOR SELECT
  TO authenticated
  USING (
    unit_id IN (SELECT id FROM units WHERE organization_id = public.user_org_id())
    AND public.user_role() IN ('admin', 'super_admin')
  );
