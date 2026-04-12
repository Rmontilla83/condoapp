-- Create maintenance photos bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('maintenance-photos', 'maintenance-photos', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Policies for storage
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Auth users can upload maintenance photos' AND tablename = 'objects') THEN
    CREATE POLICY "Auth users can upload maintenance photos"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'maintenance-photos');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can view maintenance photos' AND tablename = 'objects') THEN
    CREATE POLICY "Public can view maintenance photos"
      ON storage.objects FOR SELECT
      TO public
      USING (bucket_id = 'maintenance-photos');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Auth users can delete own maintenance photos' AND tablename = 'objects') THEN
    CREATE POLICY "Auth users can delete own maintenance photos"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (bucket_id = 'maintenance-photos');
  END IF;
END $$;
