-- 070 · Segundo fondo: contingencia
--
-- La Junta de Costa de Plata maneja dos fondos (2026-11-09): reserva y
-- contingencia, cada uno con su porcentaje. El de contingencia funciona igual
-- que el de reserva (migration 058): un porcentaje que se suma a la cuota, un
-- saldo que se deriva de los documentos y pagos que exigen un acta.
--
-- En el libro, reserva sigue en la cuenta 2.2.01 y contingencia va a la 2.2.02.
--
-- ADITIVA: va antes que el código. Todo lo que existe queda en reserva.
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS contingency_fund_pct NUMERIC(5, 2)
    CHECK (contingency_fund_pct IS NULL OR (contingency_fund_pct >= 0 AND contingency_fund_pct <= 100)),
  ADD COLUMN IF NOT EXISTS contingency_fund_acta TEXT;

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS contingency_amount NUMERIC(12, 2) NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invoices_fondos_validos') THEN
    ALTER TABLE invoices ADD CONSTRAINT invoices_fondos_validos
      CHECK (contingency_amount >= 0 AND reserve_amount + contingency_amount <= amount);
  END IF;
END $$;

-- En un gasto, paid_from_reserve dice «pagado con un fondo» y fund dice cuál.
ALTER TABLE expense_records
  ADD COLUMN IF NOT EXISTS fund TEXT NOT NULL DEFAULT 'reserva' CHECK (fund IN ('reserva', 'contingencia'));

ALTER TABLE reserve_fund_movements
  ADD COLUMN IF NOT EXISTS fund TEXT NOT NULL DEFAULT 'reserva' CHECK (fund IN ('reserva', 'contingencia'));

-- Un saldo inicial por fondo.
DROP INDEX IF EXISTS uq_fondo_saldo_inicial;
CREATE UNIQUE INDEX IF NOT EXISTS uq_fondo_saldo_inicial
  ON reserve_fund_movements (organization_id, fund)
  WHERE kind = 'opening' AND voided_at IS NULL;

-- Igual a la de la migration 058, más contingency_amount.
CREATE OR REPLACE FUNCTION public.proteger_recibo()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_setting('atryum.mantenimiento', true) = 'on' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Un recibo emitido no se borra: se anula con una nota de crédito (LPH art. 14).'
      USING ERRCODE = 'P0001';
  END IF;
  IF NEW.organization_id IS DISTINCT FROM OLD.organization_id
     OR NEW.unit_id        IS DISTINCT FROM OLD.unit_id
     OR NEW.amount         IS DISTINCT FROM OLD.amount
     OR NEW.reserve_amount IS DISTINCT FROM OLD.reserve_amount
     OR NEW.contingency_amount IS DISTINCT FROM OLD.contingency_amount
     OR NEW.currency       IS DISTINCT FROM OLD.currency
     OR NEW.description    IS DISTINCT FROM OLD.description
     OR NEW.due_date       IS DISTINCT FROM OLD.due_date
     OR NEW.kind           IS DISTINCT FROM OLD.kind
     OR NEW.exchange_rate  IS DISTINCT FROM OLD.exchange_rate
     OR NEW.amount_bs      IS DISTINCT FROM OLD.amount_bs
     OR NEW.receipt_number IS DISTINCT FROM OLD.receipt_number
     OR NEW.created_at     IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Un recibo emitido no se modifica. Anúlalo con nota de crédito y emite uno nuevo.'
      USING ERRCODE = 'P0001';
  END IF;
  IF OLD.status = 'cancelled' AND NEW.status <> 'cancelled' THEN
    RAISE EXCEPTION 'Un recibo anulado no se reactiva.' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

-- La vista es la de la migration 067 con la cuenta 2.2.02.
CREATE OR REPLACE VIEW public.libro_diario AS
WITH o AS (SELECT id, timezone FROM organizations),
ingreso AS (
  SELECT * FROM (VALUES
    ('monthly', '4.1.01', 'Ingresos por cuotas ordinarias'),
    ('extraordinary', '4.1.02', 'Ingresos por cuotas extraordinarias'),
    ('interest', '4.1.03', 'Ingresos por intereses de mora')
  ) AS t(kind, codigo, nombre)
),
-- ── Recibos emitidos: CxC contra ingreso ─────────────────────────────────────
recibos0 AS (
  SELECT COALESCE(i.reserve_amount, 0) AS fondo_usd, COALESCE(i.contingency_amount, 0) AS conting_usd, i.organization_id, LEAST((i.created_at AT TIME ZONE o.timezone)::date, i.due_date) AS fecha,
         'recibo'::text AS doc_tipo, i.id AS doc_id,
         'Recibo N° ' || lpad(i.receipt_number::text, 8, '0') AS documento,
         i.description AS descripcion, i.unit_id,
         i.amount AS usd, COALESCE(i.amount_bs, round(i.amount * COALESCE(i.exchange_rate, public.tasa_bcv_en(i.organization_id, (i.created_at AT TIME ZONE o.timezone)::date), 0), 2)) AS bs,
         g.codigo AS cta_ingreso, g.nombre AS nom_ingreso
    FROM invoices i JOIN o ON o.id = i.organization_id
    JOIN ingreso g ON g.kind = i.kind
),
recibos AS (
  SELECT r.*, CASE WHEN r.usd > 0 THEN round(r.bs * r.fondo_usd / r.usd, 2) ELSE 0 END AS fondo_bs,
         CASE WHEN r.usd > 0 THEN round(r.bs * r.conting_usd / r.usd, 2) ELSE 0 END AS conting_bs FROM recibos0 r
),
-- ── Pagos aprobados (dinero real) ────────────────────────────────────────────
pagos AS (
  SELECT i.organization_id, (t.paid_at AT TIME ZONE o.timezone)::date AS fecha,
         'pago'::text AS doc_tipo, t.id AS doc_id,
         CASE WHEN t.reference IS NOT NULL THEN 'Pago ref. ' || t.reference ELSE 'Pago' END AS documento,
         'Cobro de ' || COALESCE('recibo N° ' || lpad(i.receipt_number::text, 8, '0'), 'saldo anterior') AS descripcion,
         i.unit_id, t.payment_method,
         t.amount AS usd,
         -- Bolívares cobrados (tasa del pago) y bolívares de la deuda (tasa de emisión)
         COALESCE(t.amount_bs, round(t.amount * COALESCE(t.exchange_rate, i.exchange_rate, 0), 2)) AS bs_cobro,
         round(t.amount * COALESCE(i.exchange_rate, t.exchange_rate, 0), 2) AS bs_deuda
    FROM transactions t JOIN invoices i ON i.id = t.invoice_id JOIN o ON o.id = i.organization_id
   WHERE t.status = 'approved' AND t.payment_method <> 'credit'
),
-- ── Saldo a favor aplicado a un recibo ───────────────────────────────────────
aplicaciones AS (
  SELECT i.organization_id, (COALESCE(t.reviewed_at, t.paid_at) AT TIME ZONE o.timezone)::date AS fecha,
         'aplicacion'::text AS doc_tipo, t.id AS doc_id, 'Saldo a favor' AS documento,
         'Aplicado a ' || COALESCE('recibo N° ' || lpad(i.receipt_number::text, 8, '0'), 'saldo anterior') AS descripcion,
         i.unit_id, t.amount AS usd, round(t.amount * COALESCE(i.exchange_rate, 0), 2) AS bs
    FROM transactions t JOIN invoices i ON i.id = t.invoice_id JOIN o ON o.id = i.organization_id
   WHERE t.status = 'approved' AND t.payment_method = 'credit'
),
-- ── Notas de crédito: reversan el ingreso ────────────────────────────────────
notas0 AS (
  SELECT CASE WHEN i.amount > 0 THEN round(n.amount * COALESCE(i.reserve_amount, 0) / i.amount, 2) ELSE 0 END AS fondo_usd,
         CASE WHEN i.amount > 0 THEN round(n.amount * COALESCE(i.contingency_amount, 0) / i.amount, 2) ELSE 0 END AS conting_usd,
         n.organization_id, (n.created_at AT TIME ZONE o.timezone)::date AS fecha,
         'nota_credito'::text AS doc_tipo, n.id AS doc_id,
         'Nota de crédito NC-' || lpad(n.number::text, 6, '0') AS documento,
         'Anula recibo N° ' || lpad(i.receipt_number::text, 8, '0') || ': ' || n.reason AS descripcion,
         n.unit_id, n.amount AS usd, COALESCE(n.amount_bs, round(n.amount * COALESCE(n.exchange_rate, 0), 2)) AS bs,
         g.codigo AS cta_ingreso, g.nombre AS nom_ingreso
    FROM credit_notes n JOIN invoices i ON i.id = n.invoice_id JOIN o ON o.id = n.organization_id
    JOIN ingreso g ON g.kind = i.kind
),
notas AS (
  SELECT r.*, CASE WHEN r.usd > 0 THEN round(r.bs * r.fondo_usd / r.usd, 2) ELSE 0 END AS fondo_bs,
         CASE WHEN r.usd > 0 THEN round(r.bs * r.conting_usd / r.usd, 2) ELSE 0 END AS conting_bs FROM notas0 r
),
-- ── Saldo anterior (apertura) ────────────────────────────────────────────────
aperturas AS (
  SELECT i.organization_id, i.due_date AS fecha, 'apertura'::text AS doc_tipo, i.id AS doc_id,
         'Saldo anterior' AS documento, i.description AS descripcion, i.unit_id,
         i.amount AS usd, COALESCE(i.amount_bs, round(i.amount * COALESCE(i.exchange_rate, 0), 2)) AS bs
    FROM invoices i WHERE i.kind = 'opening'
),
-- ── Depósitos y ajustes de saldo a favor ─────────────────────────────────────
anticipos AS (
  SELECT c.organization_id, (c.created_at AT TIME ZONE o.timezone)::date AS fecha,
         'anticipo'::text AS doc_tipo, c.id AS doc_id,
         CASE WHEN c.note LIKE 'Saldo de apertura%' THEN 'Saldo inicial a favor' ELSE 'Saldo a favor' END AS documento,
         COALESCE(c.note, 'Saldo a favor') AS descripcion, c.unit_id, c.kind, c.note,
         c.amount AS usd,
         round(c.amount * COALESCE(public.tasa_bcv_en(c.organization_id, (c.created_at AT TIME ZONE o.timezone)::date), 0), 2) AS bs
    FROM unit_credits c JOIN o ON o.id = c.organization_id
   WHERE c.kind IN ('deposit', 'adjustment')
),
-- ── Gastos ───────────────────────────────────────────────────────────────────
gastos AS (
  SELECT e.organization_id, e.expense_date AS fecha, 'gasto'::text AS doc_tipo, e.id AS doc_id,
         CASE e.tipo_contable
           WHEN 'provision' THEN 'Provisión'
           WHEN 'pago_provision' THEN 'Pago de provisión'
           WHEN 'entero_retencion' THEN 'Entero de retenciones ISLR'
           ELSE CASE WHEN e.paid_from_reserve AND e.fund = 'contingencia' THEN 'Gasto con fondo de contingencia' WHEN e.paid_from_reserve THEN 'Gasto con fondo de reserva' ELSE 'Gasto' END
         END AS documento,
         e.description AS descripcion, NULL::uuid AS unit_id,
         CASE e.tipo_contable
           WHEN 'pago_provision' THEN '2.3.01'
           WHEN 'entero_retencion' THEN '2.3.02'
           ELSE CASE WHEN e.paid_from_reserve AND e.fund = 'contingencia' THEN '2.2.02' WHEN e.paid_from_reserve THEN '2.2.01' ELSE '5.1.' || lpad((COALESCE(k.position, 98) + 1)::text, 2, '0') END
         END AS cta_gasto,
         CASE e.tipo_contable
           WHEN 'pago_provision' THEN 'Provisiones por pagar'
           WHEN 'entero_retencion' THEN 'Retenciones de ISLR por enterar'
           ELSE CASE WHEN e.paid_from_reserve AND e.fund = 'contingencia' THEN 'Fondo de contingencia' WHEN e.paid_from_reserve THEN 'Fondo de reserva' ELSE 'Gastos: ' || COALESCE(k.label, 'Sin categoría') END
         END AS nom_gasto,
         CASE WHEN e.tipo_contable = 'provision' THEN '2.3.01' ELSE '1.1.01' END AS cta_contra,
         CASE WHEN e.tipo_contable = 'provision' THEN 'Provisiones por pagar' ELSE 'Bancos' END AS nom_contra,
         CASE WHEN e.currency = 'USD' THEN e.amount
              ELSE round(e.amount / NULLIF(public.tasa_bcv_en(e.organization_id, e.expense_date), 0), 2) END AS usd,
         CASE WHEN e.currency = 'USD' THEN round(e.amount * COALESCE(public.tasa_bcv_en(e.organization_id, e.expense_date), 0), 2)
              ELSE e.amount END AS bs,
         CASE WHEN e.currency = 'USD' THEN e.retencion_islr
              ELSE round(e.retencion_islr / NULLIF(public.tasa_bcv_en(e.organization_id, e.expense_date), 0), 2) END AS ret_usd,
         CASE WHEN e.currency = 'USD' THEN round(e.retencion_islr * COALESCE(public.tasa_bcv_en(e.organization_id, e.expense_date), 0), 2)
              ELSE e.retencion_islr END AS ret_bs
    FROM expense_records e LEFT JOIN expense_categories k ON k.id = e.category_id
   WHERE e.voided_at IS NULL
),
-- ── Fondo de reserva: saldo inicial, aportes adicionales y ajustes ───────────
fondo AS (
  SELECT m.organization_id, m.movement_date AS fecha, 'fondo'::text AS doc_tipo, m.id AS doc_id,
         CASE m.kind WHEN 'opening' THEN 'Saldo inicial del fondo'
                     WHEN 'contribution' THEN 'Aporte al fondo'
                     ELSE 'Ajuste del fondo' END AS documento,
         m.concept AS descripcion, NULL::uuid AS unit_id, m.kind, m.fund, m.amount AS usd,
         round(m.amount * COALESCE(public.tasa_bcv_en(m.organization_id, m.movement_date), 0), 2) AS bs
    FROM reserve_fund_movements m
   WHERE m.voided_at IS NULL
),
-- ── Otros ingresos ───────────────────────────────────────────────────────────
otros AS (
  SELECT x.organization_id, x.income_date AS fecha, 'otro_ingreso'::text AS doc_tipo, x.id AS doc_id,
         'Otro ingreso' AS documento, x.description AS descripcion, NULL::uuid AS unit_id,
         x.payment_method,
         CASE WHEN x.currency = 'USD' THEN x.amount
              ELSE round(x.amount / NULLIF(public.tasa_bcv_en(x.organization_id, x.income_date), 0), 2) END AS usd,
         CASE WHEN x.currency = 'USD' THEN round(x.amount * COALESCE(public.tasa_bcv_en(x.organization_id, x.income_date), 0), 2)
              ELSE x.amount END AS bs
    FROM other_incomes x
   WHERE x.voided_at IS NULL
)
-- ── Asientos ─────────────────────────────────────────────────────────────────
SELECT organization_id, fecha, doc_tipo, doc_id, documento, descripcion, unit_id, 1 AS linea,
       '1.1.03' AS cuenta, 'Cuentas por cobrar a propietarios' AS cuenta_nombre, usd AS debe_usd, 0::numeric AS haber_usd, bs AS debe_bs, 0::numeric AS haber_bs
  FROM recibos
UNION ALL
SELECT organization_id, fecha, doc_tipo, doc_id, documento, descripcion, unit_id, 2,
       cta_ingreso, nom_ingreso, 0, usd - fondo_usd - conting_usd, 0, bs - fondo_bs - conting_bs
  FROM recibos WHERE usd - fondo_usd - conting_usd > 0 OR (fondo_usd = 0 AND conting_usd = 0)
UNION ALL
SELECT organization_id, fecha, doc_tipo, doc_id, documento, descripcion, unit_id, 3,
       '2.2.01', 'Fondo de reserva', 0, fondo_usd, 0, fondo_bs
  FROM recibos WHERE fondo_usd > 0
UNION ALL
SELECT organization_id, fecha, doc_tipo, doc_id, documento, descripcion, unit_id, 4,
       '2.2.02', 'Fondo de contingencia', 0, conting_usd, 0, conting_bs
  FROM recibos WHERE conting_usd > 0
UNION ALL
SELECT organization_id, fecha, doc_tipo, doc_id, documento, descripcion, unit_id, 1,
       CASE WHEN payment_method = 'cash' THEN '1.1.02' ELSE '1.1.01' END,
       CASE WHEN payment_method = 'cash' THEN 'Caja' ELSE 'Bancos' END, usd, 0, bs_cobro, 0
  FROM pagos
UNION ALL
SELECT organization_id, fecha, doc_tipo, doc_id, documento, descripcion, unit_id, 2,
       '1.1.03', 'Cuentas por cobrar a propietarios', 0, usd, 0, bs_deuda
  FROM pagos
UNION ALL
SELECT organization_id, fecha, doc_tipo, doc_id, documento, descripcion, unit_id, 3,
       '7.1.01', 'Diferencial cambiario', 0, 0,
       CASE WHEN bs_deuda > bs_cobro THEN bs_deuda - bs_cobro ELSE 0 END,
       CASE WHEN bs_cobro > bs_deuda THEN bs_cobro - bs_deuda ELSE 0 END
  FROM pagos WHERE bs_cobro <> bs_deuda
UNION ALL
SELECT organization_id, fecha, doc_tipo, doc_id, documento, descripcion, unit_id, 1,
       '2.1.01', 'Anticipos de propietarios', usd, 0, bs, 0
  FROM aplicaciones
UNION ALL
SELECT organization_id, fecha, doc_tipo, doc_id, documento, descripcion, unit_id, 2,
       '1.1.03', 'Cuentas por cobrar a propietarios', 0, usd, 0, bs
  FROM aplicaciones
UNION ALL
SELECT organization_id, fecha, doc_tipo, doc_id, documento, descripcion, unit_id, 1,
       cta_ingreso, nom_ingreso, usd - fondo_usd - conting_usd, 0, bs - fondo_bs - conting_bs, 0
  FROM notas WHERE usd - fondo_usd - conting_usd > 0 OR (fondo_usd = 0 AND conting_usd = 0)
UNION ALL
SELECT organization_id, fecha, doc_tipo, doc_id, documento, descripcion, unit_id, 3,
       '2.2.01', 'Fondo de reserva', fondo_usd, 0, fondo_bs, 0
  FROM notas WHERE fondo_usd > 0
UNION ALL
SELECT organization_id, fecha, doc_tipo, doc_id, documento, descripcion, unit_id, 4,
       '2.2.02', 'Fondo de contingencia', conting_usd, 0, conting_bs, 0
  FROM notas WHERE conting_usd > 0
UNION ALL
SELECT organization_id, fecha, doc_tipo, doc_id, documento, descripcion, unit_id, 2,
       '1.1.03', 'Cuentas por cobrar a propietarios', 0, usd, 0, bs
  FROM notas
UNION ALL
SELECT organization_id, fecha, doc_tipo, doc_id, documento, descripcion, unit_id, 1,
       '1.1.03', 'Cuentas por cobrar a propietarios', usd, 0, bs, 0
  FROM aperturas
UNION ALL
SELECT organization_id, fecha, doc_tipo, doc_id, documento, descripcion, unit_id, 2,
       '3.1.01', 'Saldos iniciales', 0, usd, 0, bs
  FROM aperturas
-- Anticipo positivo: entra dinero (o saldo inicial) y queda a favor del propietario.
UNION ALL
SELECT organization_id, fecha, doc_tipo, doc_id, documento, descripcion, unit_id, 1,
       CASE WHEN note LIKE 'Saldo de apertura%' THEN '3.1.01' ELSE '1.1.01' END,
       CASE WHEN note LIKE 'Saldo de apertura%' THEN 'Saldos iniciales' ELSE 'Bancos' END,
       CASE WHEN usd > 0 THEN usd ELSE 0 END, CASE WHEN usd < 0 THEN -usd ELSE 0 END,
       CASE WHEN bs > 0 THEN bs ELSE 0 END, CASE WHEN bs < 0 THEN -bs ELSE 0 END
  FROM anticipos
UNION ALL
SELECT organization_id, fecha, doc_tipo, doc_id, documento, descripcion, unit_id, 2,
       '2.1.01', 'Anticipos de propietarios',
       CASE WHEN usd < 0 THEN -usd ELSE 0 END, CASE WHEN usd > 0 THEN usd ELSE 0 END,
       CASE WHEN bs < 0 THEN -bs ELSE 0 END, CASE WHEN bs > 0 THEN bs ELSE 0 END
  FROM anticipos
UNION ALL
SELECT organization_id, fecha, doc_tipo, doc_id, documento, descripcion, unit_id, 1,
       cta_gasto, nom_gasto, usd, 0, bs, 0
  FROM gastos
UNION ALL
SELECT organization_id, fecha, doc_tipo, doc_id, documento, descripcion, unit_id, 2,
       cta_contra, nom_contra, 0, usd - ret_usd, 0, bs - ret_bs
  FROM gastos
UNION ALL
SELECT organization_id, fecha, doc_tipo, doc_id, documento, descripcion, unit_id, 3,
       '2.3.02', 'Retenciones de ISLR por enterar', 0, ret_usd, 0, ret_bs
  FROM gastos WHERE ret_usd > 0 OR ret_bs > 0
-- Fondo: el saldo inicial y un aporte adicional son dinero en el banco. Un ajuste no mueve dinero y va contra saldos iniciales.
UNION ALL
SELECT organization_id, fecha, doc_tipo, doc_id, documento, descripcion, unit_id, 1,
       CASE WHEN kind IN ('opening', 'contribution') THEN '1.1.01' ELSE '3.1.01' END,
       CASE WHEN kind IN ('opening', 'contribution') THEN 'Bancos' ELSE 'Saldos iniciales' END,
       CASE WHEN usd > 0 THEN usd ELSE 0 END, CASE WHEN usd < 0 THEN -usd ELSE 0 END,
       CASE WHEN bs > 0 THEN bs ELSE 0 END, CASE WHEN bs < 0 THEN -bs ELSE 0 END
  FROM fondo
UNION ALL
SELECT organization_id, fecha, doc_tipo, doc_id, documento, descripcion, unit_id, 2,
       CASE WHEN fund = 'contingencia' THEN '2.2.02' ELSE '2.2.01' END,
       CASE WHEN fund = 'contingencia' THEN 'Fondo de contingencia' ELSE 'Fondo de reserva' END,
       CASE WHEN usd < 0 THEN -usd ELSE 0 END, CASE WHEN usd > 0 THEN usd ELSE 0 END,
       CASE WHEN bs < 0 THEN -bs ELSE 0 END, CASE WHEN bs > 0 THEN bs ELSE 0 END
  FROM fondo
-- Otros ingresos.
UNION ALL
SELECT organization_id, fecha, doc_tipo, doc_id, documento, descripcion, unit_id, 1,
       CASE WHEN payment_method = 'cash' THEN '1.1.02' ELSE '1.1.01' END,
       CASE WHEN payment_method = 'cash' THEN 'Caja' ELSE 'Bancos' END, usd, 0, bs, 0
  FROM otros
UNION ALL
SELECT organization_id, fecha, doc_tipo, doc_id, documento, descripcion, unit_id, 2,
       '4.2.01', 'Otros ingresos', 0, usd, 0, bs
  FROM otros;

REVOKE ALL ON public.libro_diario FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.libro_diario TO service_role;
