-- ============================================
-- 026_amenity_policies.sql
-- Políticas de uso por amenidad: cuántas veces por semana puede reservar
-- un mismo residente, duración máxima, y ventana de anticipación.
-- Se modelan como columnas en common_areas (relación 1:1 con la amenidad).
-- NULL = sin límite.
-- ============================================

ALTER TABLE common_areas
  ADD COLUMN IF NOT EXISTS max_reservations_per_week INTEGER,
  ADD COLUMN IF NOT EXISTS max_duration_hours NUMERIC(4,1),
  ADD COLUMN IF NOT EXISTS min_advance_hours INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_advance_days INTEGER;

COMMENT ON COLUMN common_areas.max_reservations_per_week IS
  'Máx reservas por semana (lun-dom) de un mismo residente para esta amenidad. NULL = sin límite.';
COMMENT ON COLUMN common_areas.max_duration_hours IS
  'Duración máxima de una reserva en horas. NULL = sin límite.';
COMMENT ON COLUMN common_areas.min_advance_hours IS
  'Anticipación mínima en horas para reservar. 0 = sin restricción.';
COMMENT ON COLUMN common_areas.max_advance_days IS
  'Anticipación máxima en días para reservar. NULL = sin límite.';
