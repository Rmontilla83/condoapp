-- 046 · Notificaciones en la app y paquetes en la garita
--
-- 1) notifications: avisos para una persona dentro de la app (la campana).
--    Hasta hoy el único canal era el correo, y los propietarios de Costa de Plata
--    todavía no tienen correo real cargado. La campana funciona igual.
--    Las escribe solo el servidor (service role). Cada quien lee las suyas; marcar
--    como leída pasa por una server action, no por un UPDATE desde el cliente.
--
-- 2) packages: paquetes que recibe la garita para una unidad. La caseta los
--    registra y los entrega; la unidad recibe el aviso.
--
-- ADITIVA: tablas nuevas. Va antes que el código.

CREATE TABLE IF NOT EXISTS notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  profile_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  kind            TEXT NOT NULL,
  title           TEXT NOT NULL,
  body            TEXT,
  link            TEXT,
  -- Para no avisar dos veces lo mismo (p. ej. el recordatorio de una cuota).
  dedupe_key      TEXT,
  read_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_profile_created ON notifications (profile_id, created_at DESC);
-- Índice completo, no parcial: el upsert (ON CONFLICT profile_id, dedupe_key) no
-- puede inferir un índice parcial. Los NULL no chocan entre sí.
CREATE UNIQUE INDEX IF NOT EXISTS notifications_dedupe ON notifications (profile_id, dedupe_key);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
REVOKE INSERT, UPDATE, DELETE ON notifications FROM anon, authenticated;
DROP POLICY IF EXISTS "Cada quien ve sus avisos" ON notifications;
CREATE POLICY "Cada quien ve sus avisos" ON notifications
  FOR SELECT TO authenticated
  USING (profile_id = auth.uid());

CREATE TABLE IF NOT EXISTS packages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  unit_id         UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  description     TEXT NOT NULL CHECK (length(btrim(description)) BETWEEN 2 AND 120),
  carrier         TEXT,
  recipient_name  TEXT,
  status          TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'delivered', 'cancelled')),
  received_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  received_station_id UUID REFERENCES guard_stations(id) ON DELETE SET NULL,
  delivered_at    TIMESTAMPTZ,
  delivered_to    TEXT,
  delivered_station_id UUID REFERENCES guard_stations(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS packages_org_status ON packages (organization_id, status, received_at DESC);
CREATE INDEX IF NOT EXISTS packages_unit ON packages (unit_id, status);

-- Los miembros de la unidad ven sus paquetes; la administración, todos los del
-- condominio. Escribe solo el servidor (la caseta no tiene sesión).
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;
REVOKE INSERT, UPDATE, DELETE ON packages FROM anon, authenticated;
DROP POLICY IF EXISTS "Unidad y admins ven los paquetes" ON packages;
CREATE POLICY "Unidad y admins ven los paquetes" ON packages
  FOR SELECT TO authenticated
  USING (
    public.is_unit_member(unit_id)
    OR (organization_id = public.user_org_id() AND public.user_role() IN ('admin', 'super_admin'))
  );
