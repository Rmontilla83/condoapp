-- 033 · Cerrar el ciclo del CHECK de la 032
--
-- La 032 creó `transactions_rejection_reason_required` como NOT VALID para no
-- romper las filas historicas. Pero NOT VALID solo salta la verificación de las
-- filas EXISTENTES en el momento del ALTER: a partir de ahí Postgres evalúa el
-- CHECK en cada INSERT **y en cada UPDATE**, sobre la fila nueva completa.
--
-- O sea que una transacción vieja con status='rejected' y rejection_reason NULL
-- quedaba envenenada: cualquier UPDATE futuro sobre esa fila —aunque no tocara
-- el status— fallaría con violación del constraint.
--
-- Se backfillea el histórico y se valida el constraint para que la garantía sea
-- real y no solo declarativa.

UPDATE transactions
   SET rejection_reason = 'Rechazado antes de que la app pidiera un motivo'
 WHERE status = 'rejected'
   AND (rejection_reason IS NULL OR length(btrim(rejection_reason)) < 4);

ALTER TABLE transactions
  VALIDATE CONSTRAINT transactions_rejection_reason_required;
