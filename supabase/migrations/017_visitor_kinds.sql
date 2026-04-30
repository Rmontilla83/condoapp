-- ============================================
-- 017 — visitor_kinds + vehicle_plate + unit_id FK on access_passes
-- ============================================
-- Parte de E2 (Comunicación honesta — visitantes).
-- Permite tipos de visitante con duraciones default (delivery/family/uber/etc),
-- placa de vehículo, y unit_id FK normalizado (reemplaza unit_number text libre).
--
-- NO modifica access_logs (tabla viva, sin caller activo de scanned_by).
-- NO crea rol concierge (pospuesto a futura épica con UI vigilante).

-- 1. Nuevas columnas
ALTER TABLE access_passes
  ADD COLUMN IF NOT EXISTS visitor_kind TEXT NOT NULL DEFAULT 'guest'
    CHECK (visitor_kind IN ('guest','family','delivery','rideshare','service','moving','other')),
  ADD COLUMN IF NOT EXISTS vehicle_plate TEXT,
  ADD COLUMN IF NOT EXISTS unit_id UUID REFERENCES units(id) ON DELETE SET NULL;

COMMENT ON COLUMN access_passes.visitor_kind IS
  'Tipo de visitante para UX (icono+duración default). guest=genérico (default).';
COMMENT ON COLUMN access_passes.vehicle_plate IS
  'Placa del vehículo (opcional). Útil para vigilante físico que verifica en pantalla.';
COMMENT ON COLUMN access_passes.unit_id IS
  'FK al apartamento destino. Reemplaza unit_number (texto libre). NULL=pase huérfano (residente sin unit, área común, etc).';

-- 2. Backfill unit_id desde unit_number — best-effort, NULL si no matchea
DO $$
DECLARE
  v_total INT;
  v_matched INT;
BEGIN
  SELECT COUNT(*) INTO v_total FROM access_passes;

  UPDATE access_passes p
  SET unit_id = u.id
  FROM units u
  WHERE u.organization_id = p.organization_id
    AND u.unit_number = p.unit_number
    AND p.unit_id IS NULL;

  SELECT COUNT(*) INTO v_matched FROM access_passes WHERE unit_id IS NOT NULL;

  RAISE NOTICE '[017] access_passes backfill: %/% matched (% huérfanos)',
    v_matched, v_total, v_total - v_matched;
END $$;

-- 3. Drop columna text libre — no se usa más, evita drift
ALTER TABLE access_passes DROP COLUMN IF EXISTS unit_number;

-- 4. Index para queries por destino (admin filtra "todos los pases del apto X")
CREATE INDEX IF NOT EXISTS idx_access_passes_unit
  ON access_passes(unit_id) WHERE unit_id IS NOT NULL;

-- 5. Recargar schema cache de PostgREST
NOTIFY pgrst, 'reload schema';
