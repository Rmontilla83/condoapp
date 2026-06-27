-- ============================================
-- 025_divide_total_fee_mode.sql
-- Agrega el modo de cobranza 'divide_total' (reparte un costo total en
-- partes iguales entre todas las unidades). Relaja el CHECK de
-- organizations.fee_mode para permitirlo como default de la organización.
-- ============================================

ALTER TABLE organizations
  DROP CONSTRAINT IF EXISTS organizations_fee_mode_check;

ALTER TABLE organizations
  ADD CONSTRAINT organizations_fee_mode_check
    CHECK (fee_mode IN ('flat', 'divide_total', 'by_aliquot', 'by_type', 'manual'));

COMMENT ON COLUMN organizations.fee_mode IS
  'flat | divide_total (total / N unidades, partes iguales) | by_aliquot (reparto proporcional a la alícuota, total exacto) | by_type (lookup fee_type_amounts) | manual (override por unidad cada generación)';
