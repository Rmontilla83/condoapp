-- 065 · Fotos en los comunicados
--
-- Rafael (2026-11-08): la administración quiere acompañar un comunicado con
-- imágenes, por ejemplo una mejora en la piscina.
--
-- Bucket privado y sin políticas sobre storage.objects: sube el servidor con
-- service role y las imágenes se ven con URL firmada, solo dentro del condominio.
-- El navegador las convierte a JPEG antes de enviarlas, por eso solo acepta ese
-- tipo y hasta 2 MB.
--
-- ADITIVA: va antes que el código.
ALTER TABLE announcements
  ADD COLUMN IF NOT EXISTS photo_urls TEXT[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN announcements.photo_urls IS
  'Referencias bucket/path; se firman al mostrarlas. Ver src/lib/storage.ts.';

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('announcement-photos', 'announcement-photos', false, 2097152, ARRAY['image/jpeg'])
ON CONFLICT (id) DO UPDATE
  SET public = false,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;
