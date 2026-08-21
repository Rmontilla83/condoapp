-- 036 · La tasa a la que se pagó, congelada en la transacción
--
-- `transactions.amount_bs` y `currency_paid` existen desde la migration 007 y
-- NUNCA las escribió nadie: de un pago hecho en bolívares no quedaba rastro de
-- a qué tasa se hizo. Seis meses después, nadie puede reconstruir cuánto se
-- transfirió realmente — y eso es justo lo que una constancia de pago tiene que
-- poder demostrar cuando el propietario vende o alquila el apartamento.
--
-- `invoices` ya guardaba su propio `exchange_rate` (la del día en que se emitió
-- la cuota), pero esa no es la tasa del pago: entre emisión y pago pueden pasar
-- semanas, y en Venezuela eso es mucho.

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(14,4);

COMMENT ON COLUMN transactions.exchange_rate IS
  'Tasa vigente al momento de registrar el pago. Junto con amount_bs y '
  'currency_paid permite reconstruir la constancia. NULL si no había tasa.';
