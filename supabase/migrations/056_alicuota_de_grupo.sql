-- 056 · Porcentaje de un grupo que se cobra aparte
--
-- En Costa de Plata las 103 unidades suman 94,30272146 %. El 5,69727854 % que
-- falta para 100 no es un error de carga: es lo que representa la marina. La
-- suma de los pesos del grupo (1.008,746553) dividida por el valor del punto de
-- septiembre (16.696,99 / 94,30272146) da ese mismo número.
--
-- La marina NO entra en la alícuota de ningún apartamento y solo la pagan sus 62
-- puestos. Este dato no cambia ningún cobro ni el peso de ningún voto: sirve
-- para que la hoja de alícuotas explique ese porcentaje en vez de avisar que
-- falta. Las alícuotas de las unidades no se reescalan.
--
-- ADITIVA: va antes que el código.
ALTER TABLE charge_groups
  ADD COLUMN IF NOT EXISTS aliquot NUMERIC(12, 8)
  CHECK (aliquot IS NULL OR (aliquot >= 0 AND aliquot <= 100));

COMMENT ON COLUMN charge_groups.aliquot IS
  'Porcentaje que representa el grupo, cobrado aparte a sus miembros. Solo explica la suma de la hoja de alícuotas: no reparte dinero ni da votos. NULL: no aplica.';
