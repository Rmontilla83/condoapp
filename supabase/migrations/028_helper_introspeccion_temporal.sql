-- 028 · Helper TEMPORAL de introspección de RLS
--
-- Necesario para escribir la migration de seguridad con la verdad del estado
-- vivo de la base en vez de inferirla del historial de migrations (varias
-- policies de 002 referencian `unit_residents`, tabla reemplazada en 013).
--
-- SE ELIMINA en la migration 029. No otorga EXECUTE a `authenticated`:
-- solo el service_role puede invocarla.

CREATE OR REPLACE FUNCTION public._audit_rls_snapshot()
RETURNS TABLE (
  tabla        text,
  policy_name  text,
  cmd          text,
  roles        text,
  qual         text,
  with_check   text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT tablename::text,
         policyname::text,
         cmd::text,
         array_to_string(roles, ',')::text,
         COALESCE(qual, '')::text,
         COALESCE(with_check, '')::text
  FROM pg_policies
  WHERE schemaname IN ('public', 'storage')
  ORDER BY tablename, policyname;
$$;

REVOKE ALL ON FUNCTION public._audit_rls_snapshot() FROM PUBLIC, anon, authenticated;
