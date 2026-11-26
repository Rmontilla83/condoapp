-- 076 · La relación de gastos que cobra un recibo
--
-- El condominio cobra a mes vencido: el recibo de diciembre reparte los gastos
-- reales de noviembre, y su aviso de cobro lista cada gasto con la parte que le
-- toca al apartamento. Hasta ahora el recibo solo decía el total.
--
-- Al emitir se guarda una copia de los gastos del mes que se está cobrando. El
-- recibo es inmutable (052) y su detalle también: si después se anula o se
-- carga un gasto de ese mes, el recibo ya emitido sigue diciendo lo mismo.
--
-- Aditiva: una tabla nueva y una columna opcional. Los recibos anteriores
-- quedan sin relación y se ven como siempre.

CREATE TABLE IF NOT EXISTS relaciones_de_cobro (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  expense_month   DATE NOT NULL,                       -- primer día del mes de los gastos
  description     TEXT NOT NULL,                       -- el concepto de la emisión
  due_date        DATE NOT NULL,
  total_gastos    NUMERIC(14, 2) NOT NULL CHECK (total_gastos >= 0),
  reserve_pct     NUMERIC(6, 3) NOT NULL DEFAULT 0,
  contingency_pct NUMERIC(6, 3) NOT NULL DEFAULT 0,
  detalle         JSONB NOT NULL CHECK (jsonb_typeof(detalle) = 'array'),
  created_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS relaciones_de_cobro_org ON relaciones_de_cobro (organization_id, expense_month);

-- Solo el servidor (service_role) la lee y la escribe: el recibo la muestra
-- después de comprobar que quien mira puede ver esa unidad.
ALTER TABLE relaciones_de_cobro ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON relaciones_de_cobro FROM anon, authenticated;

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS relacion_id UUID REFERENCES relaciones_de_cobro(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS invoices_relacion ON invoices (relacion_id) WHERE relacion_id IS NOT NULL;
