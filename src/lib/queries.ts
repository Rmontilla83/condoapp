import { createClient } from "@/lib/supabase/server";
import type {
  Profile,
  Invoice,
  MaintenanceRequest,
  Announcement,
  Organization,
  MemberRole,
  TenantPermissions,
} from "@/types/database";

// ── User & Profile ──────────────────────────────────────

export async function getCurrentProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return data as (Profile & { view_as?: string | null }) | null;
}

export function getEffectiveRole(profile: Profile & { view_as?: string | null }): string {
  // Super admin can impersonate other roles for testing
  if (profile.role === "super_admin" && profile.view_as) {
    return profile.view_as === "admin" ? "admin" : "resident";
  }
  return profile.role;
}

export async function getUserUnitIds(profileId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("unit_members")
    .select("unit_id")
    .eq("profile_id", profileId)
    .eq("active", true);

  return (data ?? []).map((r) => r.unit_id as string);
}

// ── Invoices ────────────────────────────────────────────

export async function getInvoicesForUser(unitIds: string[]) {
  if (unitIds.length === 0) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("invoices")
    .select("*")
    .in("unit_id", unitIds)
    .order("due_date", { ascending: false });

  return (data ?? []) as Invoice[];
}

/**
 * Set de invoice_ids con al menos 1 transaction `pending` (comprobante
 * subido pero aún no aprobado por admin). Útil para mostrar badge
 * "EN REVISIÓN" en la UI sin re-querar.
 */
export async function getInvoiceIdsWithPendingTransactions(invoiceIds: string[]): Promise<Set<string>> {
  if (invoiceIds.length === 0) return new Set();
  const supabase = await createClient();
  const { data } = await supabase
    .from("transactions")
    .select("invoice_id")
    .in("invoice_id", invoiceIds)
    .eq("status", "pending");

  return new Set((data ?? []).map((r) => r.invoice_id as string));
}

export async function getOrgInvoices(orgId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("invoices")
    .select("*, units(unit_number)")
    .eq("organization_id", orgId)
    .order("due_date", { ascending: false });

  return data ?? [];
}

// ── Maintenance ─────────────────────────────────────────

export async function getMaintenanceForUser(profileId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("maintenance_requests")
    .select("*")
    .eq("reported_by", profileId)
    .order("created_at", { ascending: false });

  return (data ?? []) as MaintenanceRequest[];
}

export async function getOrgMaintenance(orgId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("maintenance_requests")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });

  return (data ?? []) as MaintenanceRequest[];
}

// ── Announcements ───────────────────────────────────────

export async function getAnnouncements(orgId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("announcements")
    .select("*, profiles:author_id(full_name)")
    .eq("organization_id", orgId)
    .order("published_at", { ascending: false });

  return data ?? [];
}

// ── Admin Stats ─────────────────────────────────────────

export async function getAdminStats(orgId: string) {
  const supabase = await createClient();

  const [unitsRes, invoicesRes, maintenanceRes, expensesRes, transactionsRes] =
    await Promise.all([
      supabase
        .from("units")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", orgId),
      supabase
        .from("invoices")
        .select("id, status, amount, unit_id")
        .eq("organization_id", orgId),
      supabase
        .from("maintenance_requests")
        .select("id, status")
        .eq("organization_id", orgId),
      supabase
        .from("expense_records")
        .select("amount")
        .eq("organization_id", orgId)
        .is("voided_at", null),
      supabase
        .from("transactions")
        .select("amount, paid_at, invoice_id, invoices!inner(organization_id)")
        .eq("invoices.organization_id", orgId)
        .order("paid_at", { ascending: false }),
    ]);

  const totalUnits = unitsRes.count ?? 0;
  const invoices = invoicesRes.data ?? [];
  const maintenance = maintenanceRes.data ?? [];
  const expenses = expensesRes.data ?? [];
  const transactions = transactionsRes.data ?? [];

  const paidInvoices = invoices.filter((i) => i.status === "paid").length;
  const totalInvoices = invoices.length;
  const paymentRate =
    totalInvoices > 0 ? Math.round((paidInvoices / totalInvoices) * 100) : 0;

  const overdueCount = new Set(
    invoices
      .filter((i) => i.status === "overdue" || i.status === "pending")
      .map((i) => i.unit_id)
  ).size;

  const openRequests = maintenance.filter(
    (m) => m.status !== "resolved" && m.status !== "cancelled"
  ).length;

  const totalIncome = transactions.reduce(
    (sum, t) => sum + Number(t.amount),
    0
  );
  const totalExpenses = expenses.reduce(
    (sum, e) => sum + Number(e.amount),
    0
  );

  return {
    totalUnits,
    paymentRate,
    overdueCount,
    openRequests,
    totalIncome,
    totalExpenses,
    balance: totalIncome - totalExpenses,
    recentTransactions: transactions.slice(0, 5),
  };
}

// ── Fee Breakdown ───────────────────────────────────────

export async function getFeeBreakdown(orgId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("fee_breakdown")
    .select("*")
    .eq("organization_id", orgId)
    .eq("is_active", true)
    .order("amount", { ascending: false });

  return data ?? [];
}

/**
 * Igual que getFeeBreakdown pero incluye items inactivos. Para el editor de admin.
 */
export async function getFeeBreakdownAll(orgId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("fee_breakdown")
    .select("*")
    .eq("organization_id", orgId)
    .order("amount", { ascending: false });

  return data ?? [];
}

export async function getFeeTypeAmounts(orgId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("fee_type_amounts")
    .select("*")
    .eq("organization_id", orgId)
    .order("unit_type", { ascending: true });

  return data ?? [];
}

export async function getOrgUnitTypes(orgId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("units")
    .select("type")
    .eq("organization_id", orgId);

  const types = new Set((data ?? []).map((r) => r.type as string).filter(Boolean));
  return [...types].sort();
}

// ── Finance (E5) ────────────────────────────────────────

export async function getExpenseCategories(orgId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("expense_categories")
    .select("*")
    .eq("organization_id", orgId)
    .eq("is_active", true)
    .order("position", { ascending: true });

  return data ?? [];
}

export async function getActiveVendors(orgId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("vendors")
    .select("*")
    .eq("organization_id", orgId)
    .eq("active", true)
    .order("name", { ascending: true });

  return data ?? [];
}

// ── Common Areas ────────────────────────────────────────

export async function getCommonAreas(orgId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("common_areas")
    .select("*")
    .eq("organization_id", orgId)
    .eq("is_active", true)
    .order("name", { ascending: true });

  return data ?? [];
}

// ── Organization ────────────────────────────────────────

export async function getOrganization(orgId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", orgId)
    .single();

  return data;
}

// ── Exchange Rate ───────────────────────────────────────

export async function getCurrentRate(orgId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("exchange_rates")
    .select("rate, effective_date, source")
    .eq("organization_id", orgId)
    .order("effective_date", { ascending: false })
    .limit(1)
    .single();

  return data ?? { rate: 0, effective_date: "", source: "bcv" };
}

// ── Pending invoices (light query for layout-level FAB) ──

/**
 * Carga ligera de invoices pendientes del residente, separadas en
 * accionables vs en revisión, + tasa actual. Para el FAB del layout
 * que aparece en TODA página del dashboard sin re-correr getDashboardContext.
 */
export async function getPendingInvoicesForFAB(profileId: string): Promise<{
  actionable: Invoice[];
  inReview: Invoice[];
  rate: number;
  canSeeFee: boolean;
} | null> {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id || profile.id !== profileId) return null;

  const supabase = await createClient();

  const [membersRes, rateData] = await Promise.all([
    supabase
      .from("unit_members")
      .select("unit_id, role, permissions")
      .eq("profile_id", profileId)
      .eq("active", true),
    getCurrentRate(profile.organization_id),
  ]);

  const memberships = membersRes.data ?? [];
  const unitIds = memberships.map((m) => m.unit_id as string);

  const canSeeFee = memberships.some(
    (m) =>
      m.role === "owner" ||
      ((m.permissions as TenantPermissions)?.can_see_fee !== false),
  );

  if (!unitIds.length || !canSeeFee) {
    return { actionable: [], inReview: [], rate: Number(rateData.rate) || 0, canSeeFee };
  }

  const { data: pending } = await supabase
    .from("invoices")
    .select("*")
    .in("unit_id", unitIds)
    .in("status", ["pending", "overdue"])
    .order("due_date", { ascending: true });

  const all = (pending ?? []) as Invoice[];
  const inReviewIds = await getInvoiceIdsWithPendingTransactions(all.map((i) => i.id));

  return {
    actionable: all.filter((i) => !inReviewIds.has(i.id)),
    inReview: all.filter((i) => inReviewIds.has(i.id)),
    rate: Number(rateData.rate) || 0,
    canSeeFee,
  };
}

// ── Dashboard Context ───────────────────────────────────

export interface DashboardMembership {
  unit_member_id: string;
  unit_id: string;
  role: MemberRole;
  permissions: TenantPermissions;
  unit: {
    id: string;
    unit_number: string;
    block: string | null;
    floor: number | null;
    type: string;
  };
}

export interface DashboardContext {
  profile: Profile & { view_as?: string | null };
  org: Organization | null;
  rate: { rate: number; effective_date: string; source: string };
  memberships: DashboardMembership[];
  primaryMembership: DashboardMembership | null;
  pendingInvoices: Invoice[];
  inReviewInvoiceIds: Set<string>;
  pendingTotalUsd: number;
  upcomingReservation: {
    id: string;
    start_time: string;
    end_time: string;
    common_area_name: string;
    notes: string | null;
  } | null;
  openDecisionsNotVoted: Array<{
    id: string;
    kind: import("@/types/database").DecisionKind;
    title: string;
    closes_at: string | null;
    total_voters: number;
  }>;
  urgentAnnouncements: Announcement[];
  totalRecentAnnouncements: number;
  recentRequests: MaintenanceRequest[];
  /** True si el residente puede ver/pagar fees: owner en alguna unit, o tenant con can_see_fee=true. */
  canSeeFee: boolean;
}

/**
 * Snapshot completo del estado del residente para el dashboard.
 * Una sola roundtrip mental, paralelización interna con Promise.all.
 *
 * NULL cases manejados:
 * - Sin memberships → memberships=[], primaryMembership=null, canSeeFee=false
 * - Sin reserva futura → upcomingReservation=null
 * - Sin polls abiertos → openPollsNotVoted=[]
 * - Tenant con tenant_can_vote=false → openPollsNotVoted=[] (filtrado)
 */
export async function getDashboardContext(
  profileWithView: Profile & { view_as?: string | null },
): Promise<DashboardContext | null> {
  if (!profileWithView.organization_id) return null;
  const supabase = await createClient();
  const orgId = profileWithView.organization_id;

  // Round 1: memberships + org + rate (paralelo)
  const [membersRes, org, rateData] = await Promise.all([
    supabase
      .from("unit_members")
      .select("id, unit_id, role, permissions, joined_at, units(id, unit_number, block, floor, type)")
      .eq("profile_id", profileWithView.id)
      .eq("active", true)
      .order("joined_at", { ascending: false }),
    getOrganization(orgId),
    getCurrentRate(orgId),
  ]);

  const memberships: DashboardMembership[] = (membersRes.data ?? [])
    .map((m) => {
      const unit = Array.isArray(m.units) ? m.units[0] : m.units;
      if (!unit) return null;
      return {
        unit_member_id: m.id as string,
        unit_id: m.unit_id as string,
        role: m.role as MemberRole,
        permissions: (m.permissions as TenantPermissions) ?? {},
        unit: {
          id: unit.id as string,
          unit_number: unit.unit_number as string,
          block: (unit.block as string | null) ?? null,
          floor: (unit.floor as number | null) ?? null,
          type: (unit.type as string) ?? "apartment",
        },
      };
    })
    .filter((m): m is DashboardMembership => m !== null);

  const unitIds = memberships.map((m) => m.unit_id);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600_000).toISOString();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600_000).toISOString();
  const nowIso = new Date().toISOString();

  // Round 2: todo en paralelo
  const [
    invoicesRes,
    reservationRes,
    pollsRes,
    urgentRes,
    recentCountRes,
    requestsRes,
  ] = await Promise.all([
    unitIds.length
      ? supabase
          .from("invoices")
          .select("*")
          .in("unit_id", unitIds)
          .in("status", ["pending", "overdue"])
          .order("due_date", { ascending: true })
      : Promise.resolve({ data: [] as Invoice[] }),
    supabase
      .from("reservations")
      .select("id, start_time, end_time, notes, common_areas(name)")
      .eq("reserved_by", profileWithView.id)
      .eq("status", "confirmed")
      .gte("end_time", nowIso)
      .order("start_time", { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("decisions")
      .select("id, kind, title, closes_at, decision_questions(id, decision_responses(voter_id))")
      .eq("organization_id", orgId)
      .eq("status", "open"),
    supabase
      .from("announcements")
      .select("*")
      .eq("organization_id", orgId)
      .eq("priority", "urgent")
      .gte("published_at", sevenDaysAgo)
      .order("published_at", { ascending: false }),
    supabase
      .from("announcements")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .gte("published_at", thirtyDaysAgo),
    supabase
      .from("maintenance_requests")
      .select("*")
      .eq("reported_by", profileWithView.id)
      .order("created_at", { ascending: false })
      .limit(3),
  ]);

  const pendingInvoices = (invoicesRes.data ?? []) as Invoice[];
  const inReviewInvoiceIds = await getInvoiceIdsWithPendingTransactions(
    pendingInvoices.map((i) => i.id),
  );

  // Filtro client-side: decisions donde el user NO ha votado en NINGUNA pregunta.
  // Criterio conservador: si votó al menos una pregunta del formal_assembly,
  // se considera "ya votó" (la card del dashboard desaparece). El detalle
  // muestra "VOTASTE 1 DE N" para que pueda completar.
  type DecisionRow = {
    id: string;
    kind: import("@/types/database").DecisionKind;
    title: string;
    closes_at: string | null;
    decision_questions: Array<{ id: string; decision_responses: Array<{ voter_id: string }> }>;
  };
  const decisions = ((pollsRes.data ?? []) as unknown as DecisionRow[])
    .filter((d) => {
      const allResponses = (d.decision_questions ?? []).flatMap((q) => q.decision_responses ?? []);
      return !allResponses.some((r) => r.voter_id === profileWithView.id);
    })
    .map((d) => {
      const allResponses = (d.decision_questions ?? []).flatMap((q) => q.decision_responses ?? []);
      const uniqueVoters = new Set(allResponses.map((r) => r.voter_id));
      return {
        id: d.id,
        kind: d.kind,
        title: d.title,
        closes_at: d.closes_at,
        total_voters: uniqueVoters.size,
      };
    })
    .sort((a, b) => {
      if (!a.closes_at) return 1;
      if (!b.closes_at) return -1;
      return new Date(a.closes_at).getTime() - new Date(b.closes_at).getTime();
    });

  // Si tenant en su primaria y org tenant_can_vote=false → no mostrar decisiones
  const orgTyped = org as Organization | null;
  const isPrimaryTenant = memberships[0]?.role === "tenant";
  const canSeeVotes = !isPrimaryTenant || !!orgTyped?.tenant_can_vote;

  // Reservation shape unwrap
  const r = reservationRes.data;
  const upcomingReservation = r
    ? {
        id: r.id as string,
        start_time: r.start_time as string,
        end_time: r.end_time as string,
        notes: (r.notes as string | null) ?? null,
        common_area_name: (() => {
          const ca = r.common_areas;
          if (Array.isArray(ca)) return ca[0]?.name ?? "";
          if (ca && typeof ca === "object") return (ca as { name: string }).name;
          return "";
        })(),
      }
    : null;

  // canSeeFee: owner en alguna unit, o tenant con can_see_fee !== false en alguna
  const canSeeFee = memberships.some(
    (m) => m.role === "owner" || m.permissions?.can_see_fee !== false,
  );

  return {
    profile: profileWithView,
    org: orgTyped,
    rate: rateData,
    memberships,
    primaryMembership: memberships[0] ?? null,
    pendingInvoices,
    inReviewInvoiceIds,
    pendingTotalUsd: pendingInvoices.reduce((s, i) => s + Number(i.amount), 0),
    upcomingReservation,
    openDecisionsNotVoted: canSeeVotes ? decisions : [],
    urgentAnnouncements: (urgentRes.data ?? []) as Announcement[],
    totalRecentAnnouncements: recentCountRes.count ?? 0,
    recentRequests: (requestsRes.data ?? []) as MaintenanceRequest[],
    canSeeFee,
  };
}
