-- 029 · Cierre de agujeros de RLS (bloque de tablas)
--
-- Contexto: la anon key viaja en el bundle del cliente, así que cualquier usuario
-- puede hablarle directo a PostgREST y saltarse por completo las server actions.
-- Toda regla que hoy viva solo en TypeScript es decorativa. Estas policies eran
-- el único control real, y tenían seis huecos verificados contra pg_policies en
-- producción antes de escribir esta migration.
--
-- Storage va aparte, en la 030: invalida las URLs ya guardadas en la base y
-- merece probarse sola.

-- ═══════════════════════════════════════════════════════════════════════
-- A) profiles — congelar las columnas de privilegio
--
-- Bug: "Users can update own profile" es FOR UPDATE USING (id = auth.uid())
-- SIN WITH CHECK. Postgres entonces reutiliza el USING como validación de la
-- fila NUEVA, y `id = auth.uid()` sigue siendo cierto después de cambiarse el
-- rol. Un residente hacía update({role:'super_admin', organization_id:null})
-- desde la consola y entraba a /super-admin como cualquier condominio.
--
-- No se arregla con WITH CHECK: la comprobación necesita leer el valor viejo
-- de la MISMA tabla y la subquery recursa. Se resuelve con un trigger.
-- ═══════════════════════════════════════════════════════════════════════

-- Un solo trigger a propósito. Con dos (congelar / degradar) el orden de
-- disparo es alfabético, y `freeze` revertiría lo que hizo `demote`. Mantener
-- las dos reglas en una función deja la precedencia explícita y no dependiente
-- del nombre.
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
    NEW.role            := OLD.role;
    NEW.organization_id := OLD.organization_id;
    NEW.view_as         := OLD.view_as;
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

COMMENT ON FUNCTION public.guard_profile_privileges() IS
  'Impide que un usuario se auto-asigne rol u organización, y degrada a un '
  'admin que se muda de condominio. Las mutaciones legítimas (switchViewAs) '
  'van por el admin client, que corre como service_role.';

DROP TRIGGER IF EXISTS guard_profile_privileges_trg ON profiles;
CREATE TRIGGER guard_profile_privileges_trg
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_profile_privileges();

-- ═══════════════════════════════════════════════════════════════════════
-- B) organizations — quitar la lectura global
--
-- "Users can find org by invite code" (migration 010) daba SELECT a cualquier
-- autenticado con USING (invite_code IS NOT NULL AND is_active), sin referenciar
-- auth.uid(). Devolvía la tabla entera, incluido bank_accounts. La 013 dropeó la
-- policy gemela sobre `units` pero olvidó ésta, que quedó 19 migrations abierta.
--
-- Ya no hace falta: el onboarding por invite_code se eliminó en la V2 (los
-- residentes entran por email precargado o código físico).
-- /super-admin pasa a leer con el admin client en el mismo commit.
-- ═══════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Users can find org by invite code" ON organizations;

-- ═══════════════════════════════════════════════════════════════════════
-- C) transactions — que un residente no vea los comprobantes del vecino
--
-- Convivían dos policies de SELECT que se suman por OR: una estrecha (las
-- transacciones de mis unidades) y "Users can view org transactions", que daba
-- TODAS las de la organización a cualquier miembro — receipt_url incluido, o sea
-- la captura bancaria del vecino con su cédula y su cuenta.
--
-- No existía ninguna policy de SELECT específica para admins: la de admin se
-- apoyaba en la permisiva. Por eso hay que crearla antes de borrarla, o
-- /admin y payment-reviewer se quedan sin datos.
-- ═══════════════════════════════════════════════════════════════════════

CREATE POLICY "Admins can view org transactions"
  ON transactions FOR SELECT
  TO authenticated
  USING (
    public.user_role() IN ('admin', 'super_admin')
    AND invoice_id IN (
      SELECT id FROM invoices WHERE organization_id = public.user_org_id()
    )
  );

DROP POLICY IF EXISTS "Users can view org transactions" ON transactions;

-- ═══════════════════════════════════════════════════════════════════════
-- D) access_passes — el qr_code es una credencial, no un dato del condominio
--
-- "Users can view passes in their org" exponía la fila completa —qr_code
-- incluido— a cualquier miembro. Ese código es la ÚNICA credencial de
-- /verificar/[code]: con él se abre el portón a nombre de otro.
-- ═══════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Users can view passes in their org" ON access_passes;

CREATE POLICY "Users can view own passes"
  ON access_passes FOR SELECT
  TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Admins can view org passes"
  ON access_passes FOR SELECT
  TO authenticated
  USING (
    public.user_role() IN ('admin', 'super_admin')
    AND organization_id = public.user_org_id()
  );

-- Había dos policies de INSERT idénticas (002 y 003). Queda una.
DROP POLICY IF EXISTS "Users can create passes" ON access_passes;

-- ═══════════════════════════════════════════════════════════════════════
-- E) decision_responses — el voto no puede confiar en el cliente
--
-- El WITH CHECK solo validaba voter_id y organización. No miraba el status de
-- la decisión, ni closes_at, ni el valor de `weight`. Un insert directo con
-- weight: 9999 sobre una asamblea ya cerrada entraba sin resistencia, y eso
-- decide derramas y presupuestos.
--
-- Regla: por RLS solo se admite weight = 1.0 sobre decisiones abiertas y
-- vigentes. El voto ponderado por alícuota lo escribe voteDecision() con el
-- admin client, después de validar permisos y calcular el peso en el servidor.
-- ═══════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Users can submit decision_responses" ON decision_responses;

CREATE POLICY "Users can submit decision_responses"
  ON decision_responses FOR INSERT
  TO authenticated
  WITH CHECK (
    voter_id = auth.uid()
    AND weight = 1.0
    AND question_id IN (
      SELECT q.id
      FROM decision_questions q
      JOIN decisions d ON d.id = q.decision_id
      WHERE d.organization_id = public.user_org_id()
        AND d.status = 'open'
        AND (d.closes_at IS NULL OR d.closes_at > now())
    )
  );

-- ═══════════════════════════════════════════════════════════════════════
-- F) Retirar el helper temporal de introspección de la 028
-- ═══════════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS public._audit_rls_snapshot();
