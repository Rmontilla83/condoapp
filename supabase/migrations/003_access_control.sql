-- Add unit destination to access_passes
ALTER TABLE access_passes ADD COLUMN IF NOT EXISTS unit_number TEXT;
ALTER TABLE access_passes ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired', 'cancelled'));

-- Access logs table
CREATE TABLE IF NOT EXISTS access_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pass_id UUID NOT NULL REFERENCES access_passes(id) ON DELETE CASCADE,
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  action TEXT NOT NULL DEFAULT 'granted' CHECK (action IN ('granted', 'denied')),
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_access_logs_pass ON access_logs(pass_id);
CREATE INDEX IF NOT EXISTS idx_access_passes_org ON access_passes(organization_id);
CREATE INDEX IF NOT EXISTS idx_access_passes_status ON access_passes(status);
CREATE INDEX IF NOT EXISTS idx_access_passes_created_by ON access_passes(created_by);

-- RLS for access_logs
ALTER TABLE access_logs ENABLE ROW LEVEL SECURITY;

-- Policies for access_passes (add missing ones)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can create passes in their org') THEN
    CREATE POLICY "Users can create passes in their org"
      ON access_passes FOR INSERT
      WITH CHECK (organization_id = public.user_org_id() AND created_by = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update their own passes') THEN
    CREATE POLICY "Users can update their own passes"
      ON access_passes FOR UPDATE
      USING (created_by = auth.uid());
  END IF;

  -- Access logs: anyone in org can insert (vigilante registra acceso)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Org members can log access') THEN
    CREATE POLICY "Org members can log access"
      ON access_logs FOR INSERT
      WITH CHECK (
        pass_id IN (SELECT id FROM access_passes WHERE organization_id = public.user_org_id())
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Org members can view access logs') THEN
    CREATE POLICY "Org members can view access logs"
      ON access_logs FOR SELECT
      USING (
        pass_id IN (SELECT id FROM access_passes WHERE organization_id = public.user_org_id())
      );
  END IF;
END $$;
