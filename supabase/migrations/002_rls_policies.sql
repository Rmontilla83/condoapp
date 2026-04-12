-- ============================================
-- CONDOAPP — Row Level Security Policies
-- ============================================

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE unit_residents ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_breakdown ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_status_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE common_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE assemblies ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE vote_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_passes ENABLE ROW LEVEL SECURITY;

-- ============================================
-- HELPER: Get user's org
-- ============================================
CREATE OR REPLACE FUNCTION auth.user_org_id()
RETURNS UUID AS $$
  SELECT organization_id FROM public.profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION auth.user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================
-- PROFILES
-- ============================================
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can view profiles in same org"
  ON profiles FOR SELECT
  USING (organization_id = auth.user_org_id());

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Admins can update profiles in their org"
  ON profiles FOR UPDATE
  USING (
    organization_id = auth.user_org_id()
    AND auth.user_role() IN ('admin', 'super_admin')
  );

-- ============================================
-- ORGANIZATIONS
-- ============================================
CREATE POLICY "Users can view their org"
  ON organizations FOR SELECT
  USING (id = auth.user_org_id());

CREATE POLICY "Admins can update their org"
  ON organizations FOR UPDATE
  USING (id = auth.user_org_id() AND auth.user_role() IN ('admin', 'super_admin'));

CREATE POLICY "Super admins can insert orgs"
  ON organizations FOR INSERT
  WITH CHECK (auth.user_role() = 'super_admin');

-- ============================================
-- UNITS
-- ============================================
CREATE POLICY "Users can view units in their org"
  ON units FOR SELECT
  USING (organization_id = auth.user_org_id());

CREATE POLICY "Admins can manage units"
  ON units FOR ALL
  USING (organization_id = auth.user_org_id() AND auth.user_role() IN ('admin', 'super_admin'));

-- ============================================
-- UNIT_RESIDENTS
-- ============================================
CREATE POLICY "Users can view unit residents in their org"
  ON unit_residents FOR SELECT
  USING (
    unit_id IN (SELECT id FROM units WHERE organization_id = auth.user_org_id())
  );

CREATE POLICY "Admins can manage unit residents"
  ON unit_residents FOR ALL
  USING (
    unit_id IN (SELECT id FROM units WHERE organization_id = auth.user_org_id())
    AND auth.user_role() IN ('admin', 'super_admin')
  );

-- ============================================
-- INVOICES
-- ============================================
CREATE POLICY "Residents can view their invoices"
  ON invoices FOR SELECT
  USING (
    unit_id IN (
      SELECT unit_id FROM unit_residents WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all invoices in org"
  ON invoices FOR SELECT
  USING (organization_id = auth.user_org_id() AND auth.user_role() IN ('admin', 'super_admin'));

CREATE POLICY "Admins can manage invoices"
  ON invoices FOR ALL
  USING (organization_id = auth.user_org_id() AND auth.user_role() IN ('admin', 'super_admin'));

-- ============================================
-- TRANSACTIONS
-- ============================================
CREATE POLICY "Users can view their transactions"
  ON transactions FOR SELECT
  USING (
    invoice_id IN (
      SELECT id FROM invoices WHERE unit_id IN (
        SELECT unit_id FROM unit_residents WHERE profile_id = auth.uid()
      )
    )
  );

CREATE POLICY "Admins can view all transactions in org"
  ON transactions FOR SELECT
  USING (
    invoice_id IN (
      SELECT id FROM invoices WHERE organization_id = auth.user_org_id()
    )
    AND auth.user_role() IN ('admin', 'super_admin')
  );

CREATE POLICY "Users can insert transactions for their invoices"
  ON transactions FOR INSERT
  WITH CHECK (
    invoice_id IN (
      SELECT id FROM invoices WHERE unit_id IN (
        SELECT unit_id FROM unit_residents WHERE profile_id = auth.uid()
      )
    )
  );

-- ============================================
-- MAINTENANCE REQUESTS
-- ============================================
CREATE POLICY "Users can view maintenance in their org"
  ON maintenance_requests FOR SELECT
  USING (organization_id = auth.user_org_id());

CREATE POLICY "Users can create maintenance requests"
  ON maintenance_requests FOR INSERT
  WITH CHECK (organization_id = auth.user_org_id() AND reported_by = auth.uid());

CREATE POLICY "Users can update their own requests"
  ON maintenance_requests FOR UPDATE
  USING (reported_by = auth.uid());

CREATE POLICY "Admins can manage all maintenance requests"
  ON maintenance_requests FOR ALL
  USING (organization_id = auth.user_org_id() AND auth.user_role() IN ('admin', 'super_admin'));

-- ============================================
-- MAINTENANCE STATUS LOG
-- ============================================
CREATE POLICY "Users can view status log in their org"
  ON maintenance_status_log FOR SELECT
  USING (
    request_id IN (
      SELECT id FROM maintenance_requests WHERE organization_id = auth.user_org_id()
    )
  );

-- ============================================
-- ANNOUNCEMENTS
-- ============================================
CREATE POLICY "Users can view announcements in their org"
  ON announcements FOR SELECT
  USING (organization_id = auth.user_org_id());

CREATE POLICY "Admins can manage announcements"
  ON announcements FOR ALL
  USING (organization_id = auth.user_org_id() AND auth.user_role() IN ('admin', 'super_admin'));

-- ============================================
-- FEE BREAKDOWN & EXPENSES
-- ============================================
CREATE POLICY "Users can view fee breakdown in their org"
  ON fee_breakdown FOR SELECT
  USING (organization_id = auth.user_org_id());

CREATE POLICY "Users can view expenses in their org"
  ON expense_records FOR SELECT
  USING (organization_id = auth.user_org_id());

CREATE POLICY "Admins can manage fee breakdown"
  ON fee_breakdown FOR ALL
  USING (organization_id = auth.user_org_id() AND auth.user_role() IN ('admin', 'super_admin'));

CREATE POLICY "Admins can manage expenses"
  ON expense_records FOR ALL
  USING (organization_id = auth.user_org_id() AND auth.user_role() IN ('admin', 'super_admin'));

-- ============================================
-- COMMON AREAS & RESERVATIONS
-- ============================================
CREATE POLICY "Users can view common areas in their org"
  ON common_areas FOR SELECT
  USING (organization_id = auth.user_org_id());

CREATE POLICY "Users can view reservations"
  ON reservations FOR SELECT
  USING (
    common_area_id IN (SELECT id FROM common_areas WHERE organization_id = auth.user_org_id())
  );

CREATE POLICY "Users can create reservations"
  ON reservations FOR INSERT
  WITH CHECK (reserved_by = auth.uid());

CREATE POLICY "Users can cancel their reservations"
  ON reservations FOR UPDATE
  USING (reserved_by = auth.uid());

-- ============================================
-- ASSEMBLIES & VOTES
-- ============================================
CREATE POLICY "Users can view assemblies in their org"
  ON assemblies FOR SELECT
  USING (organization_id = auth.user_org_id());

CREATE POLICY "Users can view votes"
  ON votes FOR SELECT
  USING (
    assembly_id IN (SELECT id FROM assemblies WHERE organization_id = auth.user_org_id())
  );

CREATE POLICY "Users can submit vote responses"
  ON vote_responses FOR INSERT
  WITH CHECK (voter_id = auth.uid());

CREATE POLICY "Users can view their votes"
  ON vote_responses FOR SELECT
  USING (voter_id = auth.uid());

-- ============================================
-- ACCESS PASSES
-- ============================================
CREATE POLICY "Users can view passes in their org"
  ON access_passes FOR SELECT
  USING (organization_id = auth.user_org_id());

CREATE POLICY "Users can create passes"
  ON access_passes FOR INSERT
  WITH CHECK (organization_id = auth.user_org_id() AND created_by = auth.uid());
