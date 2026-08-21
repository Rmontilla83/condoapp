-- 034 · La alícuota se vuelve editable: precisión, nullable y rango
--
-- Hasta hoy `units.aliquot` NO tenía ningún camino de escritura en la app:
-- addUnit() la fijaba en 0 y el único UPDATE sobre `units` tocaba
-- `ownership_mode`. Las alícuotas de producción entraron por SQL directo.
--
-- Eso dejaba inutilizables las dos cosas que dependen de ella: el modo de
-- cobranza `by_aliquot` (corta con "Todas las unidades tienen alícuota 0") y el
-- VOTO PONDERADO, que es lo que el landing vende como diferenciador.
--
-- Precheck ejecutado antes de escribir esta migration:
--   SELECT id, unit_number, aliquot FROM units WHERE aliquot < 0 OR aliquot > 100;
--   -> 0 filas. El CHECK entra sin romper nada.

-- ═══════════════════════════════════════════════════════════════════════
-- A) Precisión: NUMERIC(5,2) -> NUMERIC(7,4)
--
-- Ensanchamiento lossless. Dos motivos:
--  1. Con 2 decimales, 21 unidades iguales no pueden sumar 100 exacto
--     (100/21 = 4,761904...). Con 4 sí se acerca lo suficiente.
--  2. Alinea con `decision_responses.weight NUMERIC(8,4)` (019), que es donde
--     termina copiada la alícuota al votar. Tener menos precisión en el origen
--     que en el destino no tiene sentido.
-- ═══════════════════════════════════════════════════════════════════════

ALTER TABLE units
  ALTER COLUMN aliquot TYPE NUMERIC(7,4);

-- ═══════════════════════════════════════════════════════════════════════
-- B) Nullable: distinguir "sin configurar" de "exenta a propósito"
--
-- Hoy 0 significa las dos cosas a la vez y no hay forma de separarlas. Con la
-- hoja de alícuotas esa ambigüedad se vuelve visible: el admin necesita saber
-- si le faltan unidades por cargar o si esas unidades no pagan por decisión.
-- ═══════════════════════════════════════════════════════════════════════

ALTER TABLE units
  ALTER COLUMN aliquot DROP NOT NULL,
  ALTER COLUMN aliquot SET DEFAULT NULL;

-- Backfill acotado y justificado: las 3 unidades en 0 de Los Olivos (PH5, PH5,
-- ph6) NO son exoneraciones. Se crearon desde la UI probando, y addUnit()
-- hardcodeaba `aliquot: 0` para toda unidad creada por la app. Además no tienen
-- ningún miembro activo ni metraje. Son "pendientes de cargar", que es
-- exactamente lo que NULL significa ahora.
--
-- Deliberadamente NO se hace un backfill genérico de 0 -> NULL: en otro
-- condominio un 0 podría ser una exoneración real.
UPDATE units u
   SET aliquot = NULL
 WHERE u.aliquot = 0
   AND u.area_sqm IS NULL
   AND NOT EXISTS (
     SELECT 1 FROM unit_members m
      WHERE m.unit_id = u.id AND m.active = true
   );

-- ═══════════════════════════════════════════════════════════════════════
-- C) Rango 0–100
--
-- Única defensa contra el próximo "lo cargo rápido por el SQL editor", que es
-- justo el camino por el que entró todo lo que hay hoy en producción.
--
-- NO hay constraint sobre la SUMA, a propósito: un CHECK de tabla no ve otras
-- filas, y para ir de un reparto A a uno B hay que atravesar estados
-- intermedios que no suman 100. La suma es una propiedad que se observa y se
-- advierte en la UI, no una invariante que se impone.
-- ═══════════════════════════════════════════════════════════════════════

ALTER TABLE units
  DROP CONSTRAINT IF EXISTS units_aliquot_range;

ALTER TABLE units
  ADD CONSTRAINT units_aliquot_range
  CHECK (aliquot IS NULL OR (aliquot >= 0 AND aliquot <= 100))
  NOT VALID;

ALTER TABLE units
  VALIDATE CONSTRAINT units_aliquot_range;

COMMENT ON COLUMN units.aliquot IS
  'Alícuota de la unidad en % (0-100, 4 decimales). NULL = sin configurar; '
  '0 = exenta por decisión. Se transcribe del documento de condominio. La suma '
  'del condominio NO tiene por qué dar 100: compute-invoices reparte '
  'proporcionalmente a la suma real y el total cobrado siempre es exacto.';
