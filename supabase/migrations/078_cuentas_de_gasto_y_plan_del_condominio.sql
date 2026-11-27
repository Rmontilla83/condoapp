-- 078 · Cuentas de gasto y plan de cuentas del condominio
--
-- Costa de Plata entregó su estructura definitiva de tres niveles (2026-11-27):
-- categoría → cuenta de gasto → cuenta contable del plan de su contador. Atryum
-- solo tenía el primer nivel, y el libro numeraba las cuentas a su manera.
--
-- 1. expense_accounts: la cuenta de gasto. Es lo que elige quien carga un gasto;
--    dice a qué categoría pertenece (lo que ve el vecino) y en qué cuenta
--    contable cae (lo que ve el contador).
-- 2. libro_cuentas: traduce las cuentas con las que Atryum arma los asientos
--    (bancos, anticipos, retenciones…) al código y nombre del plan del condominio.
-- 3. units.ledger_code: la cuenta por cobrar de cada unidad, cuando el plan
--    lleva un auxiliar por apartamento.
--
-- Todo es opcional: un condominio sin estas tablas cargadas ve el libro igual
-- que antes. La vista conserva en «cuenta_base» la cuenta interna, para que el
-- código pueda preguntar por provisiones o retenciones sin depender del plan.

CREATE TABLE IF NOT EXISTS public.expense_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.expense_categories(id) ON DELETE CASCADE,
  code text NOT NULL,
  label text NOT NULL,
  ledger_code text,
  ledger_name text,
  position integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, code, label)
);
CREATE INDEX IF NOT EXISTS expense_accounts_org_idx ON public.expense_accounts (organization_id, position);
ALTER TABLE public.expense_accounts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.expense_accounts FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.expense_accounts TO service_role;

ALTER TABLE public.expense_records
  ADD COLUMN IF NOT EXISTS expense_account_id uuid REFERENCES public.expense_accounts(id);

CREATE TABLE IF NOT EXISTS public.libro_cuentas (
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  cuenta_base text NOT NULL,
  codigo text NOT NULL,
  nombre text NOT NULL,
  PRIMARY KEY (organization_id, cuenta_base)
);
ALTER TABLE public.libro_cuentas ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.libro_cuentas FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.libro_cuentas TO service_role;

ALTER TABLE public.units ADD COLUMN IF NOT EXISTS ledger_code text;

-- La vista es la de la migration 073 con tres cambios: el gasto cae en la
-- cuenta contable de su cuenta de gasto, las cuentas se traducen al plan del
-- condominio, y se agrega la columna «cuenta_base» al final.
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
  SELECT i.organization_id, (i.created_at AT TIME ZONE o.timezone)::date AS fecha, 'apertura'::text AS doc_tipo, i.id AS doc_id,
         'Saldo anterior' AS documento, i.description AS descripcion, i.unit_id,
         i.amount AS usd, COALESCE(i.amount_bs, round(i.amount * COALESCE(i.exchange_rate, 0), 2)) AS bs
    FROM invoices i JOIN o ON o.id = i.organization_id WHERE i.kind = 'opening'
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
           ELSE CASE WHEN e.paid_from_reserve AND e.fund = 'contingencia' THEN '2.2.02' WHEN e.paid_from_reserve THEN '2.2.01' ELSE COALESCE(ea.ledger_code, '5.1.' || lpad((COALESCE(k.position, 98) + 1)::text, 2, '0')) END
         END AS cta_gasto,
         CASE e.tipo_contable
           WHEN 'pago_provision' THEN 'Provisiones por pagar'
           WHEN 'entero_retencion' THEN 'Retenciones de ISLR por enterar'
           ELSE CASE WHEN e.paid_from_reserve AND e.fund = 'contingencia' THEN 'Fondo de contingencia' WHEN e.paid_from_reserve THEN 'Fondo de reserva' ELSE COALESCE(ea.ledger_name, 'Gastos: ' || COALESCE(k.label, 'Sin categoría')) END
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
    LEFT JOIN expense_accounts ea ON ea.id = e.expense_account_id
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
),
base AS (
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
  FROM otros
)
SELECT b.organization_id, b.fecha, b.doc_tipo, b.doc_id, b.documento, b.descripcion, b.unit_id, b.linea,
       COALESCE(CASE WHEN b.cuenta = '1.1.03' THEN u.ledger_code END, m.codigo, b.cuenta) AS cuenta,
       COALESCE(
         CASE WHEN b.cuenta = '1.1.03' AND u.ledger_code IS NOT NULL
              THEN 'Cuentas por cobrar · ' || COALESCE(u.block || ' ', '') || u.unit_number END,
         m.nombre, b.cuenta_nombre) AS cuenta_nombre,
       b.debe_usd, b.haber_usd, b.debe_bs, b.haber_bs,
       b.cuenta AS cuenta_base
  FROM base b
  LEFT JOIN public.libro_cuentas m ON m.organization_id = b.organization_id AND m.cuenta_base = b.cuenta
  LEFT JOIN public.units u ON u.id = b.unit_id AND b.cuenta = '1.1.03';

REVOKE ALL ON public.libro_diario FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.libro_diario TO service_role;
