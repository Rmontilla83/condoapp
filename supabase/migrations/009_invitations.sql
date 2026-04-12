-- Invite code per organization
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS invite_code TEXT UNIQUE;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Generate invite codes for existing orgs
UPDATE organizations SET invite_code = upper(substring(md5(random()::text) from 1 for 4)) || '-' || extract(year from now())::text
WHERE invite_code IS NULL;

-- Admin invitations (super_admin invites someone to be admin of an org)
CREATE TABLE IF NOT EXISTS admin_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  invited_by UUID NOT NULL REFERENCES profiles(id),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, email)
);

ALTER TABLE admin_invitations ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_admin_invitations_email ON admin_invitations(email);
CREATE INDEX IF NOT EXISTS idx_organizations_invite_code ON organizations(invite_code);

-- RLS: super_admin can manage invitations
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Super admins can manage invitations') THEN
    CREATE POLICY "Super admins can manage invitations"
      ON admin_invitations FOR ALL
      USING (public.user_role() = 'super_admin');
  END IF;

  -- Invited users can see their own invitations
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own invitations') THEN
    CREATE POLICY "Users can view own invitations"
      ON admin_invitations FOR SELECT
      USING (email = (SELECT email FROM profiles WHERE id = auth.uid()));
  END IF;
END $$;

-- Mark Rafael as super_admin
UPDATE profiles SET role = 'super_admin' WHERE email = 'rafaelmontilla8@gmail.com';

-- Add view_as column for role switching (only used by super_admin)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS view_as TEXT;
