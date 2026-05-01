-- Devuelve los 4 super_admins a estado neutral: organization_id=NULL y
-- view_as=NULL. Esto fuerza el flujo /super-admin → seleccionar condominio +
-- modo → switchViewAs() setea ambos → dashboard con franja "VIENDO COMO".
--
-- En migration 022 seteé organization_id en iker y monasteriojodany para
-- que el dashboard de resident cargara directo. Pero eso evita que pasen
-- por /super-admin para activar view_as, y sin view_as la franja para
-- volver al panel super-admin nunca aparece. El flujo correcto es:
-- 1. Login → org=NULL → redirect /super-admin
-- 2. Click "Ver como" → switchViewAs() setea org + view_as
-- 3. Dashboard con franja para volver
--
-- Idempotente: solo aplica donde role=super_admin.
-- Aplicada en prod 2026-04-30.

UPDATE profiles
SET organization_id = NULL,
    view_as = NULL
WHERE role = 'super_admin';
