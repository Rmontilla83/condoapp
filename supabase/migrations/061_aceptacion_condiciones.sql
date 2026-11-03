-- 061 · Aceptación de las condiciones de uso y del aviso de privacidad
--
-- Cada persona las acepta al entrar. Si cambia la versión, se vuelve a pedir.
--
-- ADITIVA: va antes que el código.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS terms_version TEXT,
  ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;

-- Solo el servidor las escribe: un usuario no puede antedatar la suya, ni un
-- admin marcar como aceptadas las de sus vecinos. El resto de la función es igual
-- a la de la migration 029.
CREATE OR REPLACE FUNCTION public.guard_profile_privileges()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- OJO: deliberadamente NO es SECURITY DEFINER. Necesitamos que `current_user`
  -- sea el rol real de la conexión (PostgREST hace SET LOCAL ROLE authenticated
  -- / anon / service_role). Con SECURITY DEFINER pasaría a ser el dueño de la
  -- función y el guard no distinguiría a nadie.
  IF current_user NOT IN ('service_role', 'supabase_admin', 'postgres') THEN
    -- Camino del usuario común: las columnas de privilegio son de solo lectura.
    -- Sigue pudiendo editar full_name, phone y avatar_url con normalidad.
    NEW.role              := OLD.role;
    NEW.organization_id   := OLD.organization_id;
    NEW.view_as           := OLD.view_as;
    NEW.terms_version     := OLD.terms_version;
    NEW.terms_accepted_at := OLD.terms_accepted_at;
    RETURN NEW;
  END IF;

  -- Camino privilegiado: server actions con admin client, y las funciones
  -- SECURITY DEFINER existentes (redeem_access_code, accept_unit_invitation,
  -- accept_admin_invitation), que corren como su dueño.
  --
  -- Mudarse de condominio no puede conservar el rol de admin: un admin del
  -- condominio A que canjea un código del B aterrizaba como administrador de B.
  -- Un super_admin cambia de organización constantemente —es justo lo que hace
  -- switchViewAs()— y por eso solo se degrada 'admin'.
  IF NEW.organization_id IS DISTINCT FROM OLD.organization_id
     AND OLD.role = 'admin' THEN
    NEW.role := 'resident';
  END IF;

  RETURN NEW;
END;
$$;
