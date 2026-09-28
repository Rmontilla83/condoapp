-- 041 · La alícuota con la precisión del documento de condominio
--
-- La migration 034 la dejó en NUMERIC(7,4). Alcanzaba para la data demo, y no para
-- el primer edificio real: el CxC de Costa de Plata (septiembre 2026) trae
-- alícuotas con 5 y con 12 decimales (Torre A: 1.241475098388).
--
-- Medido corriendo el `distributeExact` real contra los 103 apartamentos del
-- Excel de la junta, con la base de reparto = suma de los recibos al centavo:
--
--   alícuota a 4 decimales ....... 46 de 103 recibos distintos al Excel
--   alícuota a 6 decimales .......  0 de 103
--   alícuota a 8 decimales .......  0 de 103
--
-- El motor de reparto ya redondeaba igual que el Excel (cada unidad al centavo, el
-- residuo a la de mayor peso). Lo que descuadraba era la precisión de entrada:
-- truncar 1.241475098388 a 1.2415 mueve el recibo un centavo, y en 46 unidades.
--
-- Se elige 8 y no 12: 8 ya da 0 diferencias con margen, y los decimales 13-16 del
-- Excel son ruido de coma flotante, no dato del documento.
--
-- NUMERIC(12,8): hasta 9999.99999999. El CHECK de rango 0-100 (migration 034)
-- sigue vigente y es el que limita de verdad.
--
-- ADITIVA: amplía la precisión. Todo valor de 4 decimales entra igual, y el código
-- desplegado (que valida hasta 4) sigue funcionando. Por la regla del proyecto, va
-- ANTES que el código que empieza a escribir 8 decimales.

ALTER TABLE units
  ALTER COLUMN aliquot TYPE NUMERIC(12, 8);

COMMENT ON COLUMN units.aliquot IS
  'Porcentaje de condominio, transcrito del documento protocolizado. NUMERIC(12,8): '
  'con menos de 6 decimales, los recibos de Costa de Plata no cuadran con el Excel '
  'de la junta (migration 041). NULL = sin cargar; 0 = exenta.';
