import { createClient } from "@/lib/supabase/server";
import type {
  Profile,
  Invoice,
  MaintenanceRequest,
  Announcement,
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
        .eq("organization_id", orgId),
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
