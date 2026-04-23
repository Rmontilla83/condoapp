-- ============================================
-- FIX: Recursión infinita units <-> unit_members
-- ============================================
--
-- Diagnóstico:
--   SELECT sobre units → policy "Users view units where they are members"
--     evalúa `unit_id IN (SELECT unit_id FROM unit_members WHERE ...)`
--   → evalúa policy sobre unit_members "Admins can view all members in org"
--     que tiene `unit_id IN (SELECT id FROM units WHERE ...)`
--   → vuelve a units → loop infinito.
--
--   Postgres detecta esto con ERROR 42P17 y **devuelve array vacío al
--   client con un error en el response**. Los server components leían
--   `data: []` y renderizaban la app como si no hubiera unidades.
--
-- Fix:
-- 1. DROP la policy "Users view units where they are members" — su
--    OR-branch `id IN (SELECT unit_id FROM unit_members ...)` es lo
--    que causa el loop. La policy "Users can view units in their org"
--    ya cubre el caso real: todos los users del condominio ven todas
--    las unidades de su organization_id.
--
-- 2. Reemplazar "Admins can view all members in org" con una versión
--    que NO hace subquery a units. Usa directo `auth.user_org_id()` +
--    valida org via trigger o join en app code.
--    Como workaround: usamos is_unit_member() o consultamos profiles
--    directo por auth.uid().
--    Approach más simple: la policy de ALL (Admins can manage members)
--    ya cubre lectura por admin, no necesitamos duplicar SELECT
--    policy recursiva.

-- Eliminar la policy recursiva de units
DROP POLICY IF EXISTS "Users view units where they are members" ON units;

-- Re-crear la policy de unit_members sin subquery a units
-- El admin ya puede ver TODOS los miembros via la policy FOR ALL
-- "Admins can manage members in org". La SELECT policy redundante
-- con subquery a units se elimina.
DROP POLICY IF EXISTS "Admins can view all members in org" ON unit_members;

-- Verificación: las policies que quedan son no-recursivas
-- units:
--   "Users can view units in their org" SELECT: organization_id = user_org_id()
--   "Admins can manage units" ALL: organization_id = user_org_id() AND user_role() IN ('admin','super_admin')
-- unit_members:
--   "Users can view own unit memberships" SELECT: profile_id = auth.uid()
--   "Owners can view members of their units" SELECT: is_unit_member(unit_id, 'owner') -- SECURITY DEFINER, no recursa
--   "Admins can manage members in org" ALL: ... (subquery a units OK porque ya no hay policy de units recursiva)
--   "Owners can update tenants in their units" UPDATE: is_unit_member(unit_id, 'owner') AND role='tenant'
--   "Owners can remove tenants in their units" DELETE: is_unit_member(unit_id, 'owner') AND role='tenant'
