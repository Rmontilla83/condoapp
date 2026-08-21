-- 030 · Buckets privados y aislados por condominio
--
-- Verificado explotando en producción antes de escribir el arreglo: con la sola
-- anon key (que viaja en el bundle del navegador) y SIN sesión se podían listar
-- las carpetas de todos los condominios y descargar cualquier comprobante
-- bancario — HTTP 200, imagen completa. Son capturas de transferencia con
-- cédula, número de cuenta, nombre y monto de cada residente.
--
-- Dos defectos que se sumaban:
--   1) los buckets se crearon con `public = true`, así que la ruta
--      /object/public/... sirve el archivo sin credencial alguna;
--   2) las policies de SELECT eran `TO public USING (bucket_id = '...')`, sin
--      ningún filtro de path, de modo que la API de listado tampoco pedía nada.
--   3) las de INSERT tampoco filtraban el prefijo: un residente del condominio A
--      podía escribir dentro de la carpeta del condominio B.

-- ═══════════════════════════════════════════════════════════════════════
-- A) Cerrar los buckets
-- ═══════════════════════════════════════════════════════════════════════

UPDATE storage.buckets
   SET public = false
 WHERE id IN ('payment-receipts', 'maintenance-photos');

-- ═══════════════════════════════════════════════════════════════════════
-- B) Policies con aislamiento por organización
--
-- Convenciones de ruta que ya usa el código:
--   payment-receipts/<org_id>/group-<ts>-<uid>.png     (pagos)
--   maintenance-photos/<org_id>/<ts>-<rand>.jpg        (mantenimiento)
--   maintenance-photos/expenses/<org_id>/<ts>.jpg      (finanzas)
--
-- La tercera rompe el patrón "primera carpeta = organización", así que la
-- policy contempla las dos formas en vez de forzar una migración de archivos
-- ya subidos.
-- ═══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.storage_path_belongs_to_org(object_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public, storage
AS $$
  SELECT public.user_org_id() IS NOT NULL
     AND (
       (storage.foldername(object_name))[1] = public.user_org_id()::text
       OR (
         (storage.foldername(object_name))[1] = 'expenses'
         AND (storage.foldername(object_name))[2] = public.user_org_id()::text
       )
     );
$$;

COMMENT ON FUNCTION public.storage_path_belongs_to_org(text) IS
  'Un objeto pertenece al condominio del usuario si su primera carpeta es el '
  'organization_id, o si está bajo expenses/<organization_id>/ (recibos de gasto).';

-- --- payment-receipts ---
DROP POLICY IF EXISTS "Public can view payment receipts" ON storage.objects;
DROP POLICY IF EXISTS "Auth users can upload payment receipts" ON storage.objects;

CREATE POLICY "Org members can view payment receipts"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'payment-receipts'
    AND public.storage_path_belongs_to_org(name)
  );

CREATE POLICY "Org members can upload payment receipts"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'payment-receipts'
    AND public.storage_path_belongs_to_org(name)
  );

-- --- maintenance-photos ---
DROP POLICY IF EXISTS "Public can view maintenance photos" ON storage.objects;
DROP POLICY IF EXISTS "Auth users can upload maintenance photos" ON storage.objects;
DROP POLICY IF EXISTS "Auth users can delete own maintenance photos" ON storage.objects;

CREATE POLICY "Org members can view maintenance photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'maintenance-photos'
    AND public.storage_path_belongs_to_org(name)
  );

CREATE POLICY "Org members can upload maintenance photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'maintenance-photos'
    AND public.storage_path_belongs_to_org(name)
  );

-- El borrado era `USING (bucket_id = 'maintenance-photos')`: cualquier
-- autenticado podía borrar la foto de cualquier condominio.
CREATE POLICY "Org members can delete maintenance photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'maintenance-photos'
    AND public.storage_path_belongs_to_org(name)
  );

-- ═══════════════════════════════════════════════════════════════════════
-- C) Nota sobre los datos existentes
--
-- Las filas viejas de `transactions.receipt_url`, `expense_records.receipt_url`
-- y `maintenance_requests.photo_urls` guardan la URL pública completa, que a
-- partir de ahora no resuelve. NO hace falta migrarlas: esa URL sigue
-- codificando bucket y path, y `parseStorageRef()` en src/lib/storage.ts
-- acepta tanto el formato viejo como el nuevo (`bucket/path`) y firma ambos.
-- ═══════════════════════════════════════════════════════════════════════
