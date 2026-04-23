"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/queries";
import { revalidatePath } from "next/cache";
import { randomBytes } from "node:crypto";
import type { OwnershipMode, MemberRole, TenantPermissions } from "@/types/database";

function portalUrl() {
  return (
    process.env.NEXT_PUBLIC_PORTAL_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "https://portal.atryum.net"
  );
}

async function logAuthEvent(params: {
  organization_id?: string | null;
  actor_id?: string | null;
  target_email?: string | null;
  event: string;
  payload?: Record<string, unknown>;
}) {
  const admin = createAdminClient();
  await admin.from("auth_events").insert({
    organization_id: params.organization_id ?? null,
    actor_id: params.actor_id ?? null,
    target_email: params.target_email ?? null,
    event: params.event,
    payload: params.payload ?? {},
  });
}

async function ensureUserExists(admin: ReturnType<typeof createAdminClient>, email: string) {
  const { error } = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (!error) return { created: true };
  const msg = (error.message ?? "").toLowerCase();
  const isDuplicate =
    error.status === 422 ||
    msg.includes("already") ||
    msg.includes("duplicate") ||
    msg.includes("registered");
  if (isDuplicate) return { created: false };
  return { error };
}

async function requireAdminOrSuper() {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error("No autenticado");
  if (profile.role !== "admin" && profile.role !== "super_admin") {
    throw new Error("Solo administradores");
  }
  if (!profile.organization_id) throw new Error("Sin organización");
  return profile;
}

async function requireUnitAccess(unitId: string, requireRole?: MemberRole) {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error("No autenticado");

  const supabase = await createClient();

  // Admins tienen acceso a cualquier unidad de su org
  if (profile.role === "admin" || profile.role === "super_admin") {
    const { data: unit } = await supabase
      .from("units")
      .select("id, organization_id")
      .eq("id", unitId)
      .maybeSingle();
    if (!unit || unit.organization_id !== profile.organization_id) {
      throw new Error("Unidad no pertenece a tu organización");
    }
    return { profile, unit, isAdmin: true };
  }

  // Residentes: validar membresía
  const { data: member } = await supabase
    .from("unit_members")
    .select("id, role, active, unit_id, units(id, organization_id)")
    .eq("unit_id", unitId)
    .eq("profile_id", profile.id)
    .eq("active", true)
    .maybeSingle();

  if (!member) throw new Error("No eres miembro de esta unidad");

  if (requireRole && member.role !== requireRole) {
    throw new Error(`Necesitas ser ${requireRole} de esta unidad`);
  }

  return { profile, unit: member.units, isAdmin: false, memberRole: member.role as MemberRole };
}

// ─────────────────────────────────────────────────────────
// UNIDAD: modo de ocupación
// ─────────────────────────────────────────────────────────
export async function setUnitOwnershipMode(unitId: string, mode: OwnershipMode) {
  const profile = await requireAdminOrSuper();
  const admin = createAdminClient();

  const { error } = await admin
    .from("units")
    .update({ ownership_mode: mode })
    .eq("id", unitId)
    .eq("organization_id", profile.organization_id);

  if (error) return { error: error.message };

  revalidatePath("/admin/units");
  revalidatePath("/admin");
  return { success: true };
}

// ─────────────────────────────────────────────────────────
// INVITAR MIEMBRO POR EMAIL
// ─────────────────────────────────────────────────────────
export async function inviteUnitMember(params: {
  unitId: string;
  email: string;
  role: MemberRole;
  permissions?: TenantPermissions;
}) {
  const { unitId, email: rawEmail, role, permissions = {} } = params;
  const email = rawEmail.trim().toLowerCase();
  if (!email) return { error: "Email requerido" };

  // Solo admins o propietarios (si role='tenant') pueden invitar
  const access = await requireUnitAccess(
    unitId,
    role === "tenant" ? undefined : undefined // admin se valida por isAdmin
  );

  if (!access.isAdmin && (access.memberRole !== "owner" || role !== "tenant")) {
    return { error: "Solo el administrador o el propietario pueden invitar" };
  }

  const admin = createAdminClient();
  const { data: unit } = await admin
    .from("units")
    .select("id, organization_id, unit_number")
    .eq("id", unitId)
    .single();
  if (!unit) return { error: "Unidad no encontrada" };

  // 1. Upsert unit_invitation
  const { error: invError } = await admin
    .from("unit_invitations")
    .upsert(
      {
        unit_id: unitId,
        email,
        assigned_role: role,
        invited_by: access.profile.id,
        permissions,
        accepted_at: null,
        accepted_by: null,
      },
      { onConflict: "unit_id,email,assigned_role" }
    );

  if (invError) {
    await logAuthEvent({
      organization_id: unit.organization_id,
      actor_id: access.profile.id,
      target_email: email,
      event: "unit_invite_insert_failed",
      payload: { error: invError.message, unit_id: unitId, role },
    });
    return { error: `Error guardando invitación: ${invError.message}` };
  }

  // 2. Asegurar user existe (fuerza template Magic Link)
  const ensureRes = await ensureUserExists(admin, email);
  if ("error" in ensureRes && ensureRes.error) {
    await logAuthEvent({
      organization_id: unit.organization_id,
      actor_id: access.profile.id,
      target_email: email,
      event: "unit_invite_create_user_failed",
      payload: { error: ensureRes.error.message },
    });
    return { error: `No pudimos crear la cuenta: ${ensureRes.error.message}` };
  }

  // 3. Si el user ya existía, procesar la invitación manualmente
  //    (el trigger solo corre en INSERT de nuevo user)
  if (!ensureRes.created) {
    await admin.rpc("accept_unit_invitation");
  }

  // 4. Enviar magic link
  const { error: otpError } = await admin.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: `${portalUrl()}/auth/confirm`,
    },
  });

  if (otpError) {
    await logAuthEvent({
      organization_id: unit.organization_id,
      actor_id: access.profile.id,
      target_email: email,
      event: "unit_invite_email_failed",
      payload: { error: otpError.message, unit_id: unitId, role },
    });
    return { error: `Invitación guardada pero no pudimos enviar el email: ${otpError.message}` };
  }

  await logAuthEvent({
    organization_id: unit.organization_id,
    actor_id: access.profile.id,
    target_email: email,
    event: "unit_invite_sent",
    payload: { unit_id: unitId, role, new_user: ensureRes.created },
  });

  revalidatePath("/admin/units");
  revalidatePath("/mi-unidad");
  return { success: true };
}

// ─────────────────────────────────────────────────────────
// GENERAR CÓDIGO DE ACCESO FÍSICO
// ─────────────────────────────────────────────────────────
function generateCode(): string {
  // Formato: XXXX-YYYY-ZZZZ (12 chars alfanuméricos sin confusos)
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sin I, O, 0, 1
  const bytes = randomBytes(12);
  let out = "";
  for (let i = 0; i < 12; i++) {
    out += alphabet[bytes[i] % alphabet.length];
    if (i === 3 || i === 7) out += "-";
  }
  return out;
}

export async function generateAccessCode(params: { unitId: string; role: MemberRole }) {
  const { unitId, role } = params;

  const access = await requireUnitAccess(unitId);
  if (!access.isAdmin && (access.memberRole !== "owner" || role !== "tenant")) {
    return { error: "Solo el administrador o el propietario pueden generar códigos" };
  }

  const admin = createAdminClient();
  const { data: unit } = await admin
    .from("units")
    .select("id, organization_id, unit_number")
    .eq("id", unitId)
    .single();
  if (!unit) return { error: "Unidad no encontrada" };

  // Intentar hasta 5 veces por si hay colisión (improbable con 32^12)
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCode();
    const { data, error } = await admin
      .from("unit_access_codes")
      .insert({
        code,
        unit_id: unitId,
        assigned_role: role,
        created_by: access.profile.id,
      })
      .select("id, code, expires_at")
      .single();

    if (!error && data) {
      await logAuthEvent({
        organization_id: unit.organization_id,
        actor_id: access.profile.id,
        event: "access_code_generated",
        payload: { unit_id: unitId, role, code_id: data.id },
      });
      revalidatePath("/admin/units");
      revalidatePath("/mi-unidad");
      return { success: true, code: data.code, expires_at: data.expires_at };
    }

    if (error && error.code !== "23505") {
      return { error: error.message };
    }
  }

  return { error: "No pudimos generar un código único, intenta de nuevo" };
}

export async function revokeAccessCode(codeId: string) {
  const admin = createAdminClient();
  const profile = await getCurrentProfile();
  if (!profile) return { error: "No autenticado" };

  const { data: code } = await admin
    .from("unit_access_codes")
    .select("unit_id, used_at, units(organization_id)")
    .eq("id", codeId)
    .single();

  if (!code) return { error: "Código no encontrado" };
  if (code.used_at) return { error: "No puedes revocar un código ya canjeado" };

  // Verificar acceso
  const access = await requireUnitAccess(code.unit_id).catch(() => null);
  if (!access) return { error: "No autorizado" };

  const { error } = await admin
    .from("unit_access_codes")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", codeId);
  if (error) return { error: error.message };

  const orgId = Array.isArray(code.units)
    ? (code.units[0] as { organization_id?: string } | undefined)?.organization_id
    : (code.units as { organization_id?: string } | null)?.organization_id;

  await logAuthEvent({
    organization_id: orgId ?? null,
    actor_id: profile.id,
    event: "access_code_revoked",
    payload: { code_id: codeId, unit_id: code.unit_id },
  });

  revalidatePath("/admin/units");
  revalidatePath("/mi-unidad");
  return { success: true };
}

// ─────────────────────────────────────────────────────────
// REMOVER MIEMBRO (soft delete)
// ─────────────────────────────────────────────────────────
export async function removeUnitMember(memberId: string) {
  const admin = createAdminClient();
  const profile = await getCurrentProfile();
  if (!profile) return { error: "No autenticado" };

  const { data: member } = await admin
    .from("unit_members")
    .select("id, unit_id, role, profile_id, units(organization_id)")
    .eq("id", memberId)
    .single();

  if (!member) return { error: "Miembro no encontrado" };

  // Admin puede remover a cualquier miembro de su org
  // Owner puede remover solo tenants de su unidad
  const access = await requireUnitAccess(member.unit_id).catch(() => null);
  if (!access) return { error: "No autorizado" };

  if (!access.isAdmin) {
    if (access.memberRole !== "owner" || member.role !== "tenant") {
      return { error: "Solo el admin o el propietario pueden remover miembros" };
    }
  }

  const { error } = await admin
    .from("unit_members")
    .update({ active: false, removed_at: new Date().toISOString() })
    .eq("id", memberId);
  if (error) return { error: error.message };

  const orgId = Array.isArray(member.units)
    ? (member.units[0] as { organization_id?: string } | undefined)?.organization_id
    : (member.units as { organization_id?: string } | null)?.organization_id;

  await logAuthEvent({
    organization_id: orgId ?? null,
    actor_id: profile.id,
    event: "unit_member_removed",
    payload: { unit_id: member.unit_id, role: member.role, profile_id: member.profile_id },
  });

  revalidatePath("/admin/units");
  revalidatePath("/mi-unidad");
  return { success: true };
}

// ─────────────────────────────────────────────────────────
// PERMISOS DEL INQUILINO (solo propietario o admin)
// ─────────────────────────────────────────────────────────
export async function setTenantPermissions(params: {
  memberId: string;
  permissions: TenantPermissions;
}) {
  const { memberId, permissions } = params;
  const admin = createAdminClient();
  const profile = await getCurrentProfile();
  if (!profile) return { error: "No autenticado" };

  const { data: member } = await admin
    .from("unit_members")
    .select("id, unit_id, role, units(organization_id)")
    .eq("id", memberId)
    .single();

  if (!member) return { error: "Miembro no encontrado" };
  if (member.role !== "tenant") return { error: "Solo se pueden configurar permisos de inquilinos" };

  const access = await requireUnitAccess(member.unit_id).catch(() => null);
  if (!access) return { error: "No autorizado" };

  if (!access.isAdmin && access.memberRole !== "owner") {
    return { error: "Solo el propietario puede modificar permisos de su inquilino" };
  }

  const { error } = await admin
    .from("unit_members")
    .update({ permissions })
    .eq("id", memberId);
  if (error) return { error: error.message };

  revalidatePath("/mi-unidad");
  revalidatePath("/admin/units");
  return { success: true };
}

// ─────────────────────────────────────────────────────────
// POLICIES DEL CONDOMINIO (admin o super_admin)
// ─────────────────────────────────────────────────────────
export async function setOrgPolicies(policies: {
  tenant_can_vote?: boolean;
  tenant_can_see_delinquents?: boolean;
  tenant_can_reserve?: boolean;
}) {
  const profile = await requireAdminOrSuper();
  const admin = createAdminClient();

  const { error } = await admin
    .from("organizations")
    .update(policies)
    .eq("id", profile.organization_id!);
  if (error) return { error: error.message };

  await logAuthEvent({
    organization_id: profile.organization_id,
    actor_id: profile.id,
    event: "org_policies_updated",
    payload: policies,
  });

  revalidatePath("/admin");
  revalidatePath("/admin/settings");
  return { success: true };
}
