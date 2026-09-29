-- 055 · Fecha contable del recibo
--
-- Un recibo cargado después de su vencimiento (histórico o de migración) se
-- asienta en la fecha de vencimiento, no en la de carga: si no, en el libro y
-- en el estado de cuenta su pago aparecía antes que el cargo.
-- Se redefine solo la CTE `recibos` de la vista (migration 054).
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
recibos AS (
  SELECT i.organization_id, LEAST((i.created_at AT TIME ZONE o.timezone)::date, i.due_date) AS fecha,
         'recibo'::text AS doc_tipo, i.id AS doc_id,
         'Recibo N° ' || lpad(i.receipt_number::text, 8, '0') AS documento,
         i.description AS descripcion, i.unit_id,
         i.amount AS usd, COALESCE(i.amount_bs, round(i.amount * COALESCE(i.exchange_rate, public.tasa_bcv_en(i.organization_id, (i.created_at AT TIME ZONE o.timezone)::date), 0), 2)) AS bs,
         g.codigo AS cta_ingreso, g.nombre AS nom_ingreso
    FROM invoices i JOIN o ON o.id = i.organization_id
    JOIN ingreso g ON g.kind = i.kind
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
notas AS (
  SELECT n.organization_id, (n.created_at AT TIME ZONE o.timezone)::date AS fecha,
         'nota_credito'::text AS doc_tipo, n.id AS doc_id,
         'Nota de crédito NC-' || lpad(n.number::text, 6, '0') AS documento,
         'Anula recibo N° ' || lpad(i.receipt_number::text, 8, '0') || ': ' || n.reason AS descripcion,
         n.unit_id, n.amount AS usd, COALESCE(n.amount_bs, round(n.amount * COALESCE(n.exchange_rate, 0), 2)) AS bs,
         g.codigo AS cta_ingreso, g.nombre AS nom_ingreso
    FROM credit_notes n JOIN invoices i ON i.id = n.invoice_id JOIN o ON o.id = n.organization_id
    JOIN ingreso g ON g.kind = i.kind
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
         'Gasto' AS documento, e.description AS descripcion, NULL::uuid AS unit_id,
         '5.1.' || lpad((COALESCE(k.position, 98) + 1)::text, 2, '0') AS cta_gasto,
         'Gastos: ' || COALESCE(k.label, 'Sin categoría') AS nom_gasto,
         CASE WHEN e.currency = 'USD' THEN e.amount
              ELSE round(e.amount / NULLIF(public.tasa_bcv_en(e.organization_id, e.expense_date), 0), 2) END AS usd,
         CASE WHEN e.currency = 'USD' THEN round(e.amount * COALESCE(public.tasa_bcv_en(e.organization_id, e.expense_date), 0), 2)
              ELSE e.amount END AS bs
    FROM expense_records e LEFT JOIN expense_categories k ON k.id = e.category_id
   WHERE e.voided_at IS NULL
)
-- ── Asientos ─────────────────────────────────────────────────────────────────
SELECT organization_id, fecha, doc_tipo, doc_id, documento, descripcion, unit_id, 1 AS linea,
       '1.1.03' AS cuenta, 'Cuentas por cobrar a propietarios' AS cuenta_nombre, usd AS debe_usd, 0::numeric AS haber_usd, bs AS debe_bs, 0::numeric AS haber_bs
  FROM recibos
UNION ALL
SELECT organization_id, fecha, doc_tipo, doc_id, documento, descripcion, unit_id, 2,
       cta_ingreso, nom_ingreso, 0, usd, 0, bs
  FROM recibos
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
       cta_ingreso, nom_ingreso, usd, 0, bs, 0
  FROM notas
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
       '1.1.01', 'Bancos', 0, usd, 0, bs
  FROM gastos;

REVOKE ALL ON public.libro_diario FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.libro_diario TO service_role;
