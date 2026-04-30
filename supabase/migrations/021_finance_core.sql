-- ============================================
-- 021 — Ciclo completo de gasto (E5)
-- ============================================
-- Normaliza expense_records.category text -> FK a expense_categories.
-- Agrega vendors (proveedores), org_budgets (presupuesto anual) +
-- org_budget_items (monthly_amount + JSONB overrides). Soft-delete
-- via voided_at + voided_reason.
--
-- Backfill case-insensitive con map de UI viejo (Capitalizadas).
-- Drop expense_records.category al final (atómico en migration).

-- ============================================
-- 1. expense_categories
-- ============================================
CREATE TABLE IF NOT EXISTS expense_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  label TEXT NOT NULL,
  icon TEXT,
  is_system BOOLEAN NOT NULL DEFAULT false,
  position INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, code)
);

COMMENT ON TABLE expense_categories IS
  'Categorías de gasto normalizadas por org. is_system=true para defaults; admin puede crear extras.';
COMMENT ON COLUMN expense_categories.code IS 'lowercase slug. UNIQUE por org. Ej: vigilancia, mantenimiento.';
COMMENT ON COLUMN expense_categories.icon IS 'Emoji o nombre de icono (ej. lucide).';

CREATE INDEX IF NOT EXISTS idx_expense_categories_org ON expense_categories(organization_id);

-- ============================================
-- 2. vendors (proveedores)
-- ============================================
CREATE TABLE IF NOT EXISTS vendors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  rif TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE vendors IS
  'Proveedores del condo (vigilancia, mantenimiento, etc). Quick-create permitido al crear gasto.';

CREATE UNIQUE INDEX IF NOT EXISTS vendors_org_name_lower ON vendors(organization_id, lower(name));
CREATE INDEX IF NOT EXISTS idx_vendors_org ON vendors(organization_id);

-- ============================================
-- 3. Función reusable: seed default categories para un org
-- ============================================
CREATE OR REPLACE FUNCTION seed_default_expense_categories(p_org_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO expense_categories (organization_id, code, label, icon, is_system, position) VALUES
    (p_org_id, 'vigilancia',     'Vigilancia',                '🛡️', true, 0),
    (p_org_id, 'mantenimiento',  'Mantenimiento',             '🔧', true, 1),
    (p_org_id, 'aseo',           'Aseo y limpieza',           '✨', true, 2),
    (p_org_id, 'servicios',      'Servicios (luz/agua/gas)',  '⚡', true, 3),
    (p_org_id, 'piscina',        'Piscina',                   '💧', true, 4),
    (p_org_id, 'jardineria',     'Jardinería',                '🌿', true, 5),
    (p_org_id, 'nomina',         'Nómina',                    '👥', true, 6),
    (p_org_id, 'seguros',        'Seguros',                   '🛡', true, 7),
    (p_org_id, 'impuestos',      'Impuestos',                 '🏛', true, 8),
    (p_org_id, 'repuestos',      'Repuestos',                 '📦', true, 9),
    (p_org_id, 'oficina',        'Oficina admin',             '💼', true, 10),
    (p_org_id, 'eventos',        'Eventos',                   '🎉', true, 11),
    (p_org_id, 'otros',          'Otros',                     '·',  true, 12)
  ON CONFLICT (organization_id, code) DO NOTHING;
END;
$$;

-- ============================================
-- 4. Bootstrap orgs existentes (Costa+Olivos)
-- ============================================
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM organizations LOOP
    PERFORM seed_default_expense_categories(r.id);
  END LOOP;
END $$;

-- ============================================
-- 5. Trigger AFTER INSERT en organizations: nuevas orgs reciben defaults
-- ============================================
CREATE OR REPLACE FUNCTION trg_seed_categories_on_new_org()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM seed_default_expense_categories(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS organizations_seed_categories ON organizations;
CREATE TRIGGER organizations_seed_categories
  AFTER INSERT ON organizations
  FOR EACH ROW EXECUTE FUNCTION trg_seed_categories_on_new_org();

-- ============================================
-- 6. expense_records: ALTER + backfill + drop legacy column
-- ============================================
ALTER TABLE expense_records
  ADD COLUMN IF NOT EXISTS category_id UUID,
  ADD COLUMN IF NOT EXISTS vendor_id UUID,
  ADD COLUMN IF NOT EXISTS voided_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS voided_reason TEXT;

-- Backfill directo (lowercase ya en seeds)
UPDATE expense_records er
SET category_id = ec.id
FROM expense_categories ec
WHERE er.category_id IS NULL
  AND ec.organization_id = er.organization_id
  AND ec.code = lower(trim(er.category));

-- Map de Capitalizadas / aliases del UI viejo
UPDATE expense_records er
SET category_id = ec.id
FROM expense_categories ec
WHERE er.category_id IS NULL
  AND ec.organization_id = er.organization_id
  AND ec.code = CASE lower(trim(er.category))
    WHEN 'limpieza'        THEN 'aseo'
    WHEN 'reparaciones'    THEN 'mantenimiento'
    WHEN 'administrativo'  THEN 'oficina'
    WHEN 'seguridad'       THEN 'vigilancia'
    WHEN 'otro'            THEN 'otros'
    ELSE 'otros'
  END;

-- Verify zero orphans
DO $$
DECLARE n INT;
BEGIN
  SELECT count(*) INTO n FROM expense_records WHERE category_id IS NULL;
  IF n > 0 THEN
    RAISE EXCEPTION '[021] Backfill orphans: % expense_records sin category_id', n;
  END IF;
END $$;

-- Set NOT NULL + FKs
ALTER TABLE expense_records ALTER COLUMN category_id SET NOT NULL;
ALTER TABLE expense_records
  DROP CONSTRAINT IF EXISTS expense_records_category_fk,
  DROP CONSTRAINT IF EXISTS expense_records_vendor_fk;
ALTER TABLE expense_records
  ADD CONSTRAINT expense_records_category_fk
    FOREIGN KEY (category_id) REFERENCES expense_categories(id) ON DELETE RESTRICT,
  ADD CONSTRAINT expense_records_vendor_fk
    FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE SET NULL;

-- DROP legacy column
ALTER TABLE expense_records DROP COLUMN IF EXISTS category;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_expense_records_category ON expense_records(category_id);
CREATE INDEX IF NOT EXISTS idx_expense_records_vendor
  ON expense_records(vendor_id) WHERE vendor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_expense_records_voided
  ON expense_records(voided_at) WHERE voided_at IS NOT NULL;

-- ============================================
-- 7. org_budgets + org_budget_items
-- ============================================
CREATE TABLE IF NOT EXISTS org_budgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  year INT NOT NULL CHECK (year >= 2020 AND year <= 2100),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'approved', 'archived')),
  approved_at TIMESTAMPTZ,
  approved_by_decision_id UUID REFERENCES decisions(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, year)
);

COMMENT ON TABLE org_budgets IS
  'Presupuesto anual por org. status=approved -> visible para residentes en /finanzas.';
COMMENT ON COLUMN org_budgets.approved_by_decision_id IS
  'FK opcional a decisions (E3) si aprobado por asamblea formal. NULL si admin aprobo directo.';

CREATE INDEX IF NOT EXISTS idx_org_budgets_org ON org_budgets(organization_id);

CREATE TABLE IF NOT EXISTS org_budget_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  budget_id UUID NOT NULL REFERENCES org_budgets(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES expense_categories(id) ON DELETE RESTRICT,
  monthly_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  monthly_overrides JSONB,
  notes TEXT,
  UNIQUE (budget_id, category_id)
);

COMMENT ON COLUMN org_budget_items.monthly_amount IS
  'Monto base mensual (default todos los meses si no hay override).';
COMMENT ON COLUMN org_budget_items.monthly_overrides IS
  'JSONB {"3": 1500.00, "11": 250.00} keyed por mes 1-12 para overrides puntuales.';

CREATE INDEX IF NOT EXISTS idx_org_budget_items_budget ON org_budget_items(budget_id);

-- ============================================
-- 8. RLS policies
-- ============================================
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_budget_items ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  -- expense_categories: todos ven (necesario para mostrar labels en lista de gastos)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='Users view expense_categories' AND tablename='expense_categories') THEN
    CREATE POLICY "Users view expense_categories" ON expense_categories FOR SELECT TO authenticated
      USING (organization_id = public.user_org_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='Admins manage expense_categories' AND tablename='expense_categories') THEN
    CREATE POLICY "Admins manage expense_categories" ON expense_categories FOR ALL TO authenticated
      USING (organization_id = public.user_org_id() AND public.user_role() IN ('admin','super_admin'));
  END IF;

  -- vendors: solo admins
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='Admins view vendors' AND tablename='vendors') THEN
    CREATE POLICY "Admins view vendors" ON vendors FOR SELECT TO authenticated
      USING (organization_id = public.user_org_id() AND public.user_role() IN ('admin','super_admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='Admins manage vendors' AND tablename='vendors') THEN
    CREATE POLICY "Admins manage vendors" ON vendors FOR ALL TO authenticated
      USING (organization_id = public.user_org_id() AND public.user_role() IN ('admin','super_admin'));
  END IF;

  -- org_budgets: residents ven approved, admins gestionan
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='Users view approved budgets' AND tablename='org_budgets') THEN
    CREATE POLICY "Users view approved budgets" ON org_budgets FOR SELECT TO authenticated
      USING (organization_id = public.user_org_id() AND status = 'approved');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='Admins manage budgets' AND tablename='org_budgets') THEN
    CREATE POLICY "Admins manage budgets" ON org_budgets FOR ALL TO authenticated
      USING (organization_id = public.user_org_id() AND public.user_role() IN ('admin','super_admin'));
  END IF;

  -- org_budget_items: heredan visibilidad de budget parent
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='View budget items via parent' AND tablename='org_budget_items') THEN
    CREATE POLICY "View budget items via parent" ON org_budget_items FOR SELECT TO authenticated
      USING (budget_id IN (SELECT id FROM org_budgets WHERE organization_id = public.user_org_id() AND status = 'approved'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='Admins manage budget items' AND tablename='org_budget_items') THEN
    CREATE POLICY "Admins manage budget items" ON org_budget_items FOR ALL TO authenticated
      USING (budget_id IN (SELECT id FROM org_budgets WHERE organization_id = public.user_org_id() AND public.user_role() IN ('admin','super_admin')));
  END IF;
END $$;

-- ============================================
-- 9. Reload PostgREST schema cache
-- ============================================
NOTIFY pgrst, 'reload schema';
