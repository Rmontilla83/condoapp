export type UserRole = "super_admin" | "admin" | "resident";
export type OwnershipMode = "owner_occupied" | "tenant_with_active_owner" | "tenant_only";
export type MemberRole = "owner" | "tenant";

export type MaintenanceStatus =
  | "new"
  | "in_review"
  | "in_progress"
  | "resolved"
  | "cancelled";

export type PaymentStatus = "pending" | "paid" | "overdue" | "cancelled";

export interface Organization {
  id: string;
  name: string;
  address: string;
  city: string;
  country: string;
  currency: string;
  timezone: string;
  logo_url: string | null;
  invite_code: string | null;
  is_active: boolean;
  tenant_can_vote: boolean;
  tenant_can_see_delinquents: boolean;
  tenant_can_reserve: boolean;
  created_at: string;
}

export interface Unit {
  id: string;
  organization_id: string;
  unit_number: string;
  floor: number | null;
  block: string | null;
  type: string;
  area_sqm: number | null;
  aliquot: number;
  ownership_mode: OwnershipMode;
  created_at: string;
}

export interface TenantPermissions {
  can_see_fee?: boolean;
  can_pay_fee?: boolean;
}

export interface UnitMember {
  id: string;
  unit_id: string;
  profile_id: string;
  role: MemberRole;
  active: boolean;
  permissions: TenantPermissions;
  joined_at: string;
  removed_at: string | null;
  created_at: string;
}

export interface UnitAccessCode {
  id: string;
  code: string;
  unit_id: string;
  assigned_role: MemberRole;
  created_by: string;
  used_by: string | null;
  used_at: string | null;
  revoked_at: string | null;
  expires_at: string;
  created_at: string;
}

export interface UnitInvitation {
  id: string;
  unit_id: string;
  email: string;
  assigned_role: MemberRole;
  invited_by: string;
  permissions: TenantPermissions;
  accepted_at: string | null;
  accepted_by: string | null;
  expires_at: string;
  created_at: string;
}

export interface AdminInvitation {
  id: string;
  organization_id: string;
  email: string;
  invited_by: string;
  accepted_at: string | null;
  accepted_by: string | null;
  created_at: string;
}

export interface AuthEvent {
  id: string;
  organization_id: string | null;
  actor_id: string | null;
  target_email: string | null;
  event: string;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  role: UserRole;
  organization_id: string | null;
  created_at: string;
}

export interface Invoice {
  id: string;
  organization_id: string;
  unit_id: string;
  amount: number;
  currency: string;
  description: string;
  due_date: string;
  status: PaymentStatus;
  created_at: string;
}

export interface Transaction {
  id: string;
  invoice_id: string;
  amount: number;
  currency: string;
  payment_method: string;
  reference: string | null;
  receipt_url: string | null;
  paid_at: string;
  created_at: string;
}

export interface MaintenanceRequest {
  id: string;
  organization_id: string;
  unit_id: string;
  reported_by: string;
  title: string;
  description: string;
  category: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: MaintenanceStatus;
  photo_urls: string[];
  assigned_to: string | null;
  resolved_at: string | null;
  created_at: string;
}

export type PassStatus = "active" | "used" | "expired" | "cancelled";

export interface AccessPass {
  id: string;
  organization_id: string;
  created_by: string;
  visitor_name: string;
  visitor_id_number: string | null;
  qr_code: string;
  unit_number: string | null;
  status: PassStatus;
  valid_from: string;
  valid_until: string;
  used_at: string | null;
  created_at: string;
}

export interface AccessLog {
  id: string;
  pass_id: string;
  scanned_at: string;
  action: "granted" | "denied";
  notes: string | null;
}

export interface Announcement {
  id: string;
  organization_id: string;
  author_id: string;
  title: string;
  content: string;
  priority: "normal" | "important" | "urgent";
  target_audience: "all" | "owners" | "tenants" | "specific_block";
  target_block: string | null;
  published_at: string;
  created_at: string;
}
