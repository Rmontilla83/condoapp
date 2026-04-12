-- RLS policies for reservations
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view reservations in their org') THEN
    CREATE POLICY "Users can view reservations in their org"
      ON reservations FOR SELECT
      USING (common_area_id IN (SELECT id FROM common_areas WHERE organization_id = public.user_org_id()));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can create reservations') THEN
    CREATE POLICY "Users can create reservations"
      ON reservations FOR INSERT
      WITH CHECK (
        reserved_by = auth.uid()
        AND common_area_id IN (SELECT id FROM common_areas WHERE organization_id = public.user_org_id())
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can cancel own reservations') THEN
    CREATE POLICY "Users can cancel own reservations"
      ON reservations FOR UPDATE
      USING (reserved_by = auth.uid());
  END IF;
END $$;
