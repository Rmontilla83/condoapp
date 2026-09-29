-- 047 · Grupos de prorrateo ("gastos comunes a algunos", LPH arts. 11 y 12)
--
-- La marina de Costa de Plata la pagan solo los 62 apartamentos con puesto, y no
-- por alícuota del edificio sino por su propia proporción. Hasta hoy eso se
-- cobraba en modo "manual": 62 montos tecleados a mano cada mes.
--
-- Un grupo es un conjunto de unidades con un peso cada una. Al emitir en modo
-- "por grupo" se reparte un total entre sus miembros según el peso, exacto al
-- centavo (el mismo distributeExact de siempre); las unidades fuera del grupo
-- no reciben cuota.
--
-- ADITIVA: tablas nuevas. Va antes que el código.

CREATE TABLE IF NOT EXISTS charge_groups (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL CHECK (length(btrim(name)) BETWEEN 2 AND 60),
  description     TEXT,
  active          BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, name)
);

CREATE TABLE IF NOT EXISTS charge_group_members (
  group_id  UUID NOT NULL REFERENCES charge_groups(id) ON DELETE CASCADE,
  unit_id   UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  weight    NUMERIC(14, 6) NOT NULL CHECK (weight > 0),
  PRIMARY KEY (group_id, unit_id)
);

-- Solo la administración los ve y los usa; escribe el servidor.
ALTER TABLE charge_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE charge_group_members ENABLE ROW LEVEL SECURITY;
REVOKE INSERT, UPDATE, DELETE ON charge_groups, charge_group_members FROM anon, authenticated;

DROP POLICY IF EXISTS "Admins ven los grupos" ON charge_groups;
CREATE POLICY "Admins ven los grupos" ON charge_groups
  FOR SELECT TO authenticated
  USING (organization_id = public.user_org_id() AND public.user_role() IN ('admin', 'super_admin'));

DROP POLICY IF EXISTS "Admins ven los miembros" ON charge_group_members;
CREATE POLICY "Admins ven los miembros" ON charge_group_members
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM charge_groups g
     WHERE g.id = group_id
       AND g.organization_id = public.user_org_id()
       AND public.user_role() IN ('admin', 'super_admin')
  ));
