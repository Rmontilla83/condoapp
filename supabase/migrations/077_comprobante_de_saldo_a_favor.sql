-- 077 · Datos del pago en un saldo a favor
--
-- Un pago que no tiene recibo al que aplicarse (alguien paga diciembre por
-- adelantado) queda como saldo a favor. Hasta ahora solo se guardaba el monto y
-- una nota, así que no había cómo darle al vecino un comprobante de ese pago:
-- ni método, ni referencia, ni fecha, ni bolívares.
--
-- Aditiva: columnas opcionales. Los saldos anteriores quedan con lo que tenían.
ALTER TABLE unit_credits
  ADD COLUMN IF NOT EXISTS payment_method   TEXT,
  ADD COLUMN IF NOT EXISTS reference        TEXT,
  ADD COLUMN IF NOT EXISTS paid_at          TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS exchange_rate    NUMERIC(12, 4),
  ADD COLUMN IF NOT EXISTS amount_bs        NUMERIC(14, 2),
  -- El mismo grupo de las transacciones del pago, cuando parte se aplicó a recibos.
  ADD COLUMN IF NOT EXISTS payment_group_id UUID;
CREATE INDEX IF NOT EXISTS unit_credits_grupo ON unit_credits (payment_group_id) WHERE payment_group_id IS NOT NULL;

-- Los excedentes ya registrados desde la ficha: método y referencia salen del
-- historial (el mismo registro, a segundos de distancia). La fecha del pago no
-- se guardó en ninguna parte, así que queda vacía.
UPDATE unit_credits c
   SET payment_method = e.payload->>'metodo',
       reference      = NULLIF(e.payload->>'referencia', '')
  FROM auth_events e
 WHERE c.kind = 'deposit'
   AND c.payment_method IS NULL
   AND c.note LIKE 'Pago recibido%'
   AND e.event = 'payment_registered'
   AND e.organization_id = c.organization_id
   AND e.payload->>'unit_id' = c.unit_id::text
   AND e.created_at BETWEEN c.created_at - interval '30 seconds' AND c.created_at + interval '30 seconds';
