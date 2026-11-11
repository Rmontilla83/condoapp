-- 072 · Las funciones también en la base, y el voto reservado
--
-- 1. La migration 069 dejó en la base solo el bloqueo del contador. La
--    separación entre Junta, asistente y administradora vivía en las acciones
--    del servidor: una cuenta de Junta o de asistente todavía podía escribir
--    por la API en las tablas donde RLS deja escribir a un admin (comprobado en
--    organizations). Ahora esas dos funciones tampoco escriben por fuera de la
--    app. Todo lo que les corresponde pasa por acciones del servidor, que usan
--    el cliente de servicio después de comprobar el permiso.
--
--    Quedan fuera las tablas donde esa persona actúa como vecino con su propia
--    sesión: pagar (transactions), reservar (reservations), reportar una
--    avería (maintenance_requests), visitantes (access_passes) y su perfil.
--
-- 2. decision_responses dejaba que cualquier miembro del condominio leyera cómo
--    votó cada persona. Ahora cada quien lee solo sus propios votos; los
--    conteos los hace el servidor y viajan sin identidad.
--
-- RESTRICTIVA: el código que cuenta los votos con el cliente de servicio se
-- publica ANTES de aplicar esta migración.

CREATE OR REPLACE FUNCTION public.sin_escritura_directa()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role = 'admin' AND admin_funcion IN ('junta', 'asistente') FROM profiles WHERE id = auth.uid()),
    false
  );
$$;
REVOKE ALL ON FUNCTION public.sin_escritura_directa() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sin_escritura_directa() TO authenticated, service_role;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'announcements', 'charge_group_members', 'charge_groups', 'common_areas', 'cost_centers', 'credit_notes',
    'decision_questions', 'decisions', 'exchange_rates', 'expense_categories', 'expense_records',
    'fee_breakdown', 'fee_type_amounts', 'guard_stations', 'invoices', 'maintenance_status_log',
    'org_budget_items', 'org_budgets', 'organizations', 'other_incomes', 'payment_plans',
    'reserve_fund_movements', 'service_providers', 'unit_access_codes', 'unit_credits',
    'unit_invitations', 'unit_members', 'units', 'vendors'
  ] LOOP
    IF to_regclass('public.' || t) IS NULL THEN CONTINUE; END IF;
    EXECUTE format('DROP POLICY IF EXISTS "Junta y asistente no insertan por fuera" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Junta y asistente no modifican por fuera" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Junta y asistente no borran por fuera" ON public.%I', t);
    EXECUTE format('CREATE POLICY "Junta y asistente no insertan por fuera" ON public.%I AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (NOT public.sin_escritura_directa())', t);
    EXECUTE format('CREATE POLICY "Junta y asistente no modifican por fuera" ON public.%I AS RESTRICTIVE FOR UPDATE TO authenticated USING (NOT public.sin_escritura_directa())', t);
    EXECUTE format('CREATE POLICY "Junta y asistente no borran por fuera" ON public.%I AS RESTRICTIVE FOR DELETE TO authenticated USING (NOT public.sin_escritura_directa())', t);
  END LOOP;
END $$;

-- Un pago lo aprueba o lo rechaza quien administra. La Junta y el asistente sí
-- pueden reportar el pago de su propia unidad (INSERT), pero no tocar uno ya
-- reportado: ahí está la aprobación.
DROP POLICY IF EXISTS "Junta y asistente no modifican por fuera" ON public.transactions;
DROP POLICY IF EXISTS "Junta y asistente no borran por fuera" ON public.transactions;
CREATE POLICY "Junta y asistente no modifican por fuera" ON public.transactions
  AS RESTRICTIVE FOR UPDATE TO authenticated USING (NOT public.sin_escritura_directa());
CREATE POLICY "Junta y asistente no borran por fuera" ON public.transactions
  AS RESTRICTIVE FOR DELETE TO authenticated USING (NOT public.sin_escritura_directa());

-- ── El voto ──────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can view decision_responses" ON decision_responses;
DROP POLICY IF EXISTS "Cada quien ve sus propios votos" ON decision_responses;
CREATE POLICY "Cada quien ve sus propios votos" ON decision_responses
  FOR SELECT TO authenticated
  USING (voter_id = auth.uid());
