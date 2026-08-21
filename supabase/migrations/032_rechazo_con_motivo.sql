-- 032 · Rechazo de comprobante con motivo
--
-- El peor callejón sin salida del producto: `rejectPayment(transactionId)` solo
-- hacía `.update({ status: 'rejected' })`. Del lado del residente, el único
-- lector de transacciones es getInvoiceIdsWithPendingTransactions(), que filtra
-- `status = 'pending'`, así que al rechazar **la cuota simplemente reaparecía
-- como pendiente**: sin aviso, sin motivo, sin rastro.
--
-- Es exactamente el escenario "yo ya pagué" que genera la pelea real en un
-- condominio, y la app lo fabricaba. Peor: la pantalla le había prometido que
-- recibiría una notificación (promesa ya retirada, no hay infraestructura).

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

COMMENT ON COLUMN transactions.rejection_reason IS
  'Motivo por el que el admin rechazó el comprobante. Obligatorio al rechazar; '
  'se le muestra al residente para que sepa qué corregir.';
COMMENT ON COLUMN transactions.reviewed_at IS
  'Cuándo el admin aprobó o rechazó el comprobante.';
COMMENT ON COLUMN transactions.reviewed_by IS
  'Qué admin revisó el comprobante. Deja rastro auditable de la decisión.';

-- Un rechazo sin motivo deja al residente sin saber qué corregir, así que la
-- regla se sostiene en la base y no solo en la server action.
ALTER TABLE transactions
  DROP CONSTRAINT IF EXISTS transactions_rejection_reason_required;

ALTER TABLE transactions
  ADD CONSTRAINT transactions_rejection_reason_required
  CHECK (
    status <> 'rejected'
    OR (rejection_reason IS NOT NULL AND length(btrim(rejection_reason)) >= 4)
  )
  NOT VALID;   -- NOT VALID: no rompemos las filas históricas ya rechazadas.

-- El residente tiene que poder leer el motivo de SU propio rechazo. La policy
-- estrecha "Users can view their transactions" (transacciones de sus unidades)
-- ya lo cubre; se documenta acá para que no se pierda el porqué al releer.
