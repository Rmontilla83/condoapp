export type UserRole = "super_admin" | "admin" | "resident";

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
  unit_id: string | null;
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
