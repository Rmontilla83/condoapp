-- Quick polls (simplified voting without assemblies)
CREATE TABLE IF NOT EXISTS polls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]',
  is_open BOOLEAN NOT NULL DEFAULT true,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS poll_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  voter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  selected_option TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(poll_id, voter_id)
);

CREATE INDEX IF NOT EXISTS idx_polls_org ON polls(organization_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_poll ON poll_votes(poll_id);

ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view polls in their org') THEN
    CREATE POLICY "Users can view polls in their org"
      ON polls FOR SELECT USING (organization_id = public.user_org_id());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can create polls') THEN
    CREATE POLICY "Admins can create polls"
      ON polls FOR ALL
      USING (organization_id = public.user_org_id() AND public.user_role() IN ('admin', 'super_admin'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can vote in polls') THEN
    CREATE POLICY "Users can vote in polls"
      ON poll_votes FOR INSERT
      WITH CHECK (voter_id = auth.uid() AND poll_id IN (SELECT id FROM polls WHERE organization_id = public.user_org_id()));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view poll votes') THEN
    CREATE POLICY "Users can view poll votes"
      ON poll_votes FOR SELECT
      USING (poll_id IN (SELECT id FROM polls WHERE organization_id = public.user_org_id()));
  END IF;
END $$;
