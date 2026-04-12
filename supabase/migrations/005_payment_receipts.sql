-- Add receipt_url and status tracking to transactions
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected'));
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS paid_by UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS notes TEXT;

-- Storage bucket for payment receipts
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('payment-receipts', 'payment-receipts', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Auth users can upload payment receipts' AND tablename = 'objects') THEN
    CREATE POLICY "Auth users can upload payment receipts"
      ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'payment-receipts');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can view payment receipts' AND tablename = 'objects') THEN
    CREATE POLICY "Public can view payment receipts"
      ON storage.objects FOR SELECT TO public
      USING (bucket_id = 'payment-receipts');
  END IF;

  -- RLS: residents can insert transactions for their invoices
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Residents can create transactions') THEN
    CREATE POLICY "Residents can create transactions"
      ON transactions FOR INSERT
      WITH CHECK (
        invoice_id IN (
          SELECT id FROM invoices WHERE unit_id IN (
            SELECT unit_id FROM unit_residents WHERE profile_id = auth.uid()
          )
        )
      );
  END IF;

  -- RLS: admins can update transactions (approve/reject)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can update transactions') THEN
    CREATE POLICY "Admins can update transactions"
      ON transactions FOR UPDATE
      USING (
        invoice_id IN (
          SELECT id FROM invoices WHERE organization_id = public.user_org_id()
        )
        AND public.user_role() IN ('admin', 'super_admin')
      );
  END IF;

  -- RLS: users can view transactions for their org
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view org transactions') THEN
    CREATE POLICY "Users can view org transactions"
      ON transactions FOR SELECT
      USING (
        invoice_id IN (
          SELECT id FROM invoices WHERE organization_id = public.user_org_id()
        )
      );
  END IF;
END $$;
