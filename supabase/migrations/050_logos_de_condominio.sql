-- 050 · Logo del condominio
--
-- Rafael (2026-09-29): el logo del condominio tiene que verse más que el de
-- Atryum. organizations.logo_url existía desde la 001 pero nada lo llenaba.
--
-- Bucket público para que <img> lo cargue sin firmar (un logo no es un dato
-- sensible), pero SIN políticas sobre storage.objects: nadie puede listar ni
-- subir con la anon key; sube el servidor con service role. Solo imágenes
-- rasterizadas (sin SVG: puede llevar scripts) y hasta 2 MB.
--
-- ADITIVA.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('org-logos', 'org-logos', true, 2097152, ARRAY['image/png', 'image/jpeg', 'image/webp'])
ON CONFLICT (id) DO UPDATE
  SET public = true,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;
