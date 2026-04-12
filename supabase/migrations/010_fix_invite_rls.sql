-- Allow authenticated users to find organizations by invite code (for joining)
CREATE POLICY "Users can find org by invite code"
  ON organizations FOR SELECT
  TO authenticated
  USING (invite_code IS NOT NULL AND is_active = true);

-- Allow authenticated users to view units of an org they're joining (for unit selection)
-- This is broader than ideal but needed for the onboarding flow
CREATE POLICY "Auth users can view units for joining"
  ON units FOR SELECT
  TO authenticated
  USING (true);
