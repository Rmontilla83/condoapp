-- 069 · Funciones dentro de la administración, historial y actas
--
-- La Junta de Costa de Plata pidió control interno (2026-11-09): que quien carga
-- no sea quien aprueba, y que quede a nombre de quién se hizo cada cosa.
--
--   1. profiles.admin_funcion: qué hace cada cuenta de administración.
--      NULL = administración completa, como hasta hoy.
--   2. Una cuenta de contador es de solo lectura también en la base, no solo
--      en las pantallas.
--   3. Quién anuló un gasto o un ingreso, y quién emitió un recibo.
--   4. Si los inquilinos ven las consultas y asambleas.
--
-- ADITIVA: va antes que el código.

-- ── 1. Función de cada cuenta de administración ──────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS admin_funcion TEXT
    CHECK (admin_funcion IS NULL OR admin_funcion IN ('administradora', 'junta', 'asistente', 'contador'));

COMMENT ON COLUMN profiles.admin_funcion IS
  'Solo aplica con role = admin. NULL: administración completa. administradora: opera todo salvo las aprobaciones de la Junta. '
  'junta: ve y aprueba. asistente: carga sin aprobar. contador: solo lectura.';

-- Igual a la de la migration 061, más admin_funcion: nadie se cambia su función.
CREATE OR REPLACE FUNCTION public.guard_profile_privileges()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- OJO: deliberadamente NO es SECURITY DEFINER. Necesitamos que `current_user`
  -- sea el rol real de la conexión (PostgREST hace SET LOCAL ROLE authenticated
  -- / anon / service_role).
  IF current_user NOT IN ('service_role', 'supabase_admin', 'postgres') THEN
    NEW.role              := OLD.role;
    NEW.organization_id   := OLD.organization_id;
    NEW.view_as           := OLD.view_as;
    NEW.terms_version     := OLD.terms_version;
    NEW.terms_accepted_at := OLD.terms_accepted_at;
    NEW.admin_funcion     := OLD.admin_funcion;
    RETURN NEW;
  END IF;

  -- Mudarse de condominio no conserva el rol de admin ni su función.
  IF NEW.organization_id IS DISTINCT FROM OLD.organization_id
     AND OLD.role = 'admin' THEN
    NEW.role := 'resident';
  END IF;
  IF NEW.role <> 'admin' THEN
    NEW.admin_funcion := NULL;
  END IF;

  RETURN NEW;
END;
$$;

-- ── 2. El contador no escribe ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.es_solo_lectura()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT admin_funcion = 'contador' AND role = 'admin' FROM profiles WHERE id = auth.uid()), false);
$$;
REVOKE ALL ON FUNCTION public.es_solo_lectura() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.es_solo_lectura() TO authenticated, service_role;

-- Políticas RESTRICTIVAS: se suman con AND a las que ya existen, así que no
-- abren nada. profiles y notifications quedan fuera: el contador sí edita su
-- nombre y marca sus avisos como leídos.
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'announcements', 'charge_group_members', 'charge_groups', 'common_areas', 'cost_centers', 'credit_notes',
    'decision_questions', 'decision_responses', 'decisions', 'exchange_rates', 'expense_categories', 'expense_records',
    'fee_breakdown', 'fee_type_amounts', 'guard_stations', 'invoices', 'maintenance_requests', 'maintenance_status_log',
    'org_budget_items', 'org_budgets', 'organizations', 'other_incomes', 'payment_plans', 'reservations',
    'reserve_fund_movements', 'service_providers', 'transactions', 'unit_access_codes', 'unit_credits',
    'unit_invitations', 'unit_members', 'units', 'vendors'
  ] LOOP
    IF to_regclass('public.' || t) IS NULL THEN CONTINUE; END IF;
    EXECUTE format('DROP POLICY IF EXISTS "Solo lectura no inserta" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Solo lectura no modifica" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Solo lectura no borra" ON public.%I', t);
    EXECUTE format('CREATE POLICY "Solo lectura no inserta" ON public.%I AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (NOT public.es_solo_lectura())', t);
    EXECUTE format('CREATE POLICY "Solo lectura no modifica" ON public.%I AS RESTRICTIVE FOR UPDATE TO authenticated USING (NOT public.es_solo_lectura())', t);
    EXECUTE format('CREATE POLICY "Solo lectura no borra" ON public.%I AS RESTRICTIVE FOR DELETE TO authenticated USING (NOT public.es_solo_lectura())', t);
  END LOOP;
END $$;

-- ── 3. A nombre de quién ─────────────────────────────────────────────────────
ALTER TABLE expense_records ADD COLUMN IF NOT EXISTS voided_by UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE other_incomes   ADD COLUMN IF NOT EXISTS voided_by UUID REFERENCES profiles(id) ON DELETE SET NULL;
-- proteger_recibo no vigila esta columna: es un dato de quién emitió, no del recibo.
ALTER TABLE invoices        ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE unit_members    ADD COLUMN IF NOT EXISTS added_by   UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE unit_members    ADD COLUMN IF NOT EXISTS removed_by UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE org_budgets     ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- ── 4. Inquilinos y las consultas ────────────────────────────────────────────
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS tenant_can_see_decisions BOOLEAN NOT NULL DEFAULT true;
COMMENT ON COLUMN organizations.tenant_can_see_decisions IS
  'Si los inquilinos ven las consultas y asambleas de Decisiones. Votar depende de tenant_can_vote.';
