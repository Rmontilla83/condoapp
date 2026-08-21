"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/queries";
import { isAdminRole } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { randomBytes } from "node:crypto";
import {
  parseAliquotInput,
  sumAliquots,
  ALIQUOT_MAX_DECIMALS,
} from "@/lib/units/aliquot";
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
  if (!isAdminRole(profile)) {
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
  if (isAdminRole(profile)) {
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
  //    (el trigger handle_new_user solo corre en INSERT de nuevo user).
  //
  //    OJO: aquí se llamaba a `accept_unit_invitation()` con el admin client.
  //    Esa función resuelve el usuario con auth.uid(), que con el service-role
  //    client es NULL, así que devolvía 'not_authenticated' y no hacía nada —
  //    y el retorno ni se miraba. Invitar a alguien con cuenta previa nunca lo
  //    vinculaba a la unidad, pero el admin leía "invitación enviada".
  //    La migration 031 agrega la variante que recibe el usuario explícito.
  if (!ensureRes.created) {
    const { data: existing } = await admin
      .from("profiles")
      .select("id")
      .ilike("email", email)
      .maybeSingle();

    if (!existing?.id) {
      await logAuthEvent({
        organization_id: unit.organization_id,
        actor_id: access.profile.id,
        target_email: email,
        event: "unit_invite_link_failed",
        payload: { reason: "profile_not_found_for_existing_user" },
      });
    } else {
      const { data: linkRes, error: linkError } = await admin.rpc(
        "accept_unit_invitation_for",
        { p_user_id: existing.id },
      );

      const linkOk = !linkError && (linkRes as { ok?: boolean } | null)?.ok === true;
      if (!linkOk) {
        await logAuthEvent({
          organization_id: unit.organization_id,
          actor_id: access.profile.id,
          target_email: email,
          event: "unit_invite_link_failed",
          payload: {
            error: linkError?.message ?? null,
            result: linkRes ?? null,
          },
        });
        return {
          error:
            "Guardamos la invitación pero no pudimos vincular la unidad. Revisa el registro de eventos.",
        };
      }
    }
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


/**
 * Guarda las alícuotas de todas las unidades del condominio, en un solo lote.
 *
 * Es la primera vía de escritura de `units.aliquot` en la historia de la app:
 * hasta ahora addUnit() la fijaba en 0 y no había ningún UPDATE, así que el
 * cobro `by_aliquot` y el voto ponderado —el diferenciador del landing— eran
 * inutilizables para cualquier condominio nuevo.
 *
 * Todo-o-nada a propósito: un reparto a medio guardar es peor que no guardar.
 */
export async function setUnitAliquots(formData: FormData) {
  const profile = await requireAdminOrSuper();
  const orgId = profile.organization_id as string;

  const motivo = ((formData.get("reason") as string) ?? "").trim();
  if (motivo.length < 10) {
    return {
      error:
        "Escribe por qué cambias las alícuotas (mínimo 10 caracteres). Es un dato con efectos de cobranza y de voto.",
    };
  }

  let crudo: unknown;
  try {
    crudo = JSON.parse((formData.get("items") as string) ?? "[]");
  } catch {
    return { error: "No pudimos leer los valores enviados." };
  }
  if (!Array.isArray(crudo) || crudo.length === 0) {
    return { error: "No hay alícuotas que guardar." };
  }

  // 1) Parseo y validación de cada fila ANTES de tocar la base.
  const parsed: Array<{ id: string; value: number | null }> = [];
  for (const item of crudo) {
    const row = item as { id?: unknown; value?: unknown };
    if (typeof row.id !== "string" || !row.id) {
      return { error: "Envío inválido: falta el identificador de una unidad." };
    }
    const r = parseAliquotInput(
      row.value === null || row.value === undefined ? "" : String(row.value),
    );
    if (!r.ok) return { error: `Unidad ${row.id.slice(0, 8)}: ${r.error}` };
    parsed.push({ id: row.id, value: r.value });
  }

  const admin = createAdminClient();

  // 2) Toda unidad recibida tiene que ser de ESTA organización.
  //    Obligatorio: el admin client bypassa RLS y acá se escriben N filas de
  //    una, así que un id colado escribiría en otro condominio.
  const { data: propias, error: unitsError } = await admin
    .from("units")
    .select("id, unit_number, aliquot")
    .eq("organization_id", orgId);

  if (unitsError) return { error: `No pudimos leer las unidades: ${unitsError.message}` };

  const porId = new Map((propias ?? []).map((u) => [u.id as string, u]));
  const ajenas = parsed.filter((p) => !porId.has(p.id));
  if (ajenas.length > 0) {
    await logAuthEvent({
      organization_id: orgId,
      actor_id: profile.id,
      event: "aliquots_update_rejected",
      payload: { reason: "unit_not_in_org", count: ajenas.length },
    });
    return { error: "Algunas unidades no pertenecen a este condominio. No se guardó nada." };
  }

  // 3) Con una asamblea ponderada abierta Y con votos ya emitidos, cambiar las
  //    alícuotas corrompe un cómputo en curso: decision_responses.weight quedó
  //    congelado al votar, pero el quórum se recalcula en vivo en cada lectura.
  //    Si todavía nadie votó, no hay nada que corromper y se deja pasar.
  const { data: abiertas } = await admin
    .from("decisions")
    .select("id, title, decision_questions(id, decision_responses(id))")
    .eq("organization_id", orgId)
    .eq("status", "open")
    .eq("weighted_by_aliquot", true);

  const conVotos = (abiertas ?? []).filter((d) => {
    const qs = (d.decision_questions ?? []) as Array<{ decision_responses?: unknown[] }>;
    return qs.some((q) => (q.decision_responses ?? []).length > 0);
  });

  if (conVotos.length > 0) {
    const nombres = conVotos.map((d) => `"${d.title}"`).join(", ");
    return {
      error:
        `No puedes cambiar las alícuotas mientras ${conVotos.length === 1 ? "la asamblea" : "las asambleas"} ` +
        `${nombres} ${conVotos.length === 1 ? "está" : "están"} en curso y con votos emitidos: los votos ya ` +
        `contados quedaron con el peso anterior. Ciérrala en Decisiones y vuelve.`,
    };
  }

  // 4) Escritura. Solo las que efectivamente cambian.
  const antes = sumAliquots(
    (propias ?? []).map((u) => ({ aliquot: u.aliquot === null ? null : Number(u.aliquot) })),
  );

  const cambios: Record<string, [number | null, number | null]> = {};
  const aEscribir = parsed.filter((p) => {
    const actual = porId.get(p.id)!.aliquot;
    const valorActual = actual === null ? null : Number(actual);
    if (valorActual === p.value) return false;
    cambios[porId.get(p.id)!.unit_number as string] = [valorActual, p.value];
    return true;
  });

  if (aEscribir.length === 0) {
    return { success: true, changed: 0, sum: antes };
  }

  const resultados = await Promise.all(
    aEscribir.map((p) =>
      admin
        .from("units")
        .update({ aliquot: p.value })
        .eq("id", p.id)
        .eq("organization_id", orgId),
    ),
  );

  const fallo = resultados.find((r) => r.error);
  if (fallo?.error) {
    await logAuthEvent({
      organization_id: orgId,
      actor_id: profile.id,
      event: "aliquots_update_failed",
      payload: { error: fallo.error.message, intentadas: aEscribir.length },
    });
    return { error: `No se pudieron guardar todas las alícuotas: ${fallo.error.message}` };
  }

  const despues = sumAliquots(parsed.map((p) => ({ aliquot: p.value })));

  await logAuthEvent({
    organization_id: orgId,
    actor_id: profile.id,
    event: "aliquots_updated",
    payload: {
      reason: motivo,
      sum_before: antes,
      sum_after: despues,
      decimals: ALIQUOT_MAX_DECIMALS,
      changes: cambios,
    },
  });

  revalidatePath("/admin/units");
  revalidatePath("/admin/units/alicuotas");
  revalidatePath("/admin");
  revalidatePath("/decisiones");

  return { success: true, changed: aEscribir.length, sum: despues };
}
