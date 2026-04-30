-- ============================================
-- 018 — maintenance_requests.common_area_id
-- ============================================
-- Permite que un reporte de mantenimiento se asocie a un área común
-- (piscina, salón, parrilla, etc.) en lugar de a una unidad específica.
-- Antes de E4 todos los reportes se asumían en la unidad del residente,
-- lo cual generaba confusión y duplicados (varios residentes reportando
-- la misma fuga en la piscina como si fueran de su unidad).

ALTER TABLE maintenance_requests
  ADD COLUMN IF NOT EXISTS common_area_id UUID
    REFERENCES common_areas(id) ON DELETE SET NULL;

COMMENT ON COLUMN maintenance_requests.common_area_id IS
  'NULL si el reporte es de una unidad específica (unit_id). Set si es de un área común.';

CREATE INDEX IF NOT EXISTS idx_maintenance_common_area
  ON maintenance_requests(common_area_id)
  WHERE common_area_id IS NOT NULL;

NOTIFY pgrst, 'reload schema';
