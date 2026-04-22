"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/queries";
import { revalidatePath } from "next/cache";

function requireSuperAdmin(profile: { role: string } | null) {
  if (!profile || profile.role !== "super_admin") {
    throw new Error("No autorizado");
  }
}

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "https://condoapp-wine.vercel.app";
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

export async function createOrganization(formData: FormData) {
  const profile = await getCurrentProfile();
  requireSuperAdmin(profile);

  const name = (formData.get("name") as string)?.trim();
  const address = (formData.get("address") as string)?.trim();
  const city = (formData.get("city") as string)?.trim();

  if (!name || !address || !city) return { error: "Completa todos los campos" };

  const code =
    Math.random().toString(36).substring(2, 6).toUpperCase() +
    "-" +
    new Date().getFullYear();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organizations")
    .insert({ name, address, city, invite_code: code })
    .select("id, invite_code")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/super-admin");
  return { success: true, orgId: data.id, inviteCode: data.invite_code };
}

async function ensureUserExists(admin: ReturnType<typeof createAdminClient>, email: string) {
  // Intenta crear el user con email ya confirmado.
  // Si ya existe, Supabase devuelve error 422/duplicate — lo tratamos como ok.
  const { error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
  });

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

export async function inviteAdmin(formData: FormData) {
  const profile = await getCurrentProfile();
  requireSuperAdmin(profile);

  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const orgId = formData.get("org_id") as string;

  if (!email || !orgId) return { error: "Email y condominio requeridos" };

  const admin = createAdminClient();

  // B9: si el email ya es super_admin, no tocarlo
  const { data: existingProfile } = await admin
    .from("profiles")
    .select("id, role")
    .ilike("email", email)
    .maybeSingle();

  if (existingProfile?.role === "super_admin") {
    return { error: "Este email ya es super administrador — no se puede degradar" };
  }

  // 1. Upsert invitación
  const { error: invError } = await admin
    .from("admin_invitations")
    .upsert(
      {
        organization_id: orgId,
        email,
        invited_by: profile!.id,
        accepted_at: null,
        accepted_by: null,
      },
      { onConflict: "organization_id,email" }
    );

  if (invError) {
    await logAuthEvent({
      organization_id: orgId,
      actor_id: profile!.id,
      target_email: email,
      event: "admin_invite_insert_failed",
      payload: { error: invError.message },
    });
    return { error: `Error guardando invitación: ${invError.message}` };
  }

  // 2. Asegurar que el user existe. Si es nuevo, el trigger handle_new_user procesa
  //    la invitación y promueve a admin. Si existe, promovemos manualmente.
  const ensureRes = await ensureUserExists(admin, email);
  if ("error" in ensureRes && ensureRes.error) {
    await logAuthEvent({
      organization_id: orgId,
      actor_id: profile!.id,
      target_email: email,
      event: "admin_invite_create_user_failed",
      payload: { error: ensureRes.error.message },
    });
    return { error: `No pudimos crear la cuenta: ${ensureRes.error.message}` };
  }

  // Si el user ya existía, promover a admin manualmente (el trigger no corre en ese caso)
  if (!ensureRes.created && existingProfile) {
    await admin
      .from("profiles")
      .update({ role: "admin", organization_id: orgId })
      .eq("id", existingProfile.id);

    await admin
      .from("admin_invitations")
      .update({ accepted_at: new Date().toISOString(), accepted_by: existingProfile.id })
      .eq("organization_id", orgId)
      .eq("email", email);
  }

  // 3. Enviar magic link. shouldCreateUser:false fuerza uso del template "Magic Link"
  //    en vez de "Confirm signup" — el usuario ya existe por el paso 2.
  const { error: otpError } = await admin.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: `${siteUrl()}/auth/confirm`,
    },
  });

  if (otpError) {
    await logAuthEvent({
      organization_id: orgId,
      actor_id: profile!.id,
      target_email: email,
      event: "admin_invite_email_failed",
      payload: { error: otpError.message },
    });
    return { error: `Invitación guardada pero no pudimos enviar el email: ${otpError.message}` };
  }

  await logAuthEvent({
    organization_id: orgId,
    actor_id: profile!.id,
    target_email: email,
    event: "admin_invite_sent",
    payload: { new_user: ensureRes.created },
  });

  revalidatePath("/super-admin");
  return { success: true, alreadyRegistered: !ensureRes.created };
}

export async function resendAdminInvite(invitationId: string) {
  const profile = await getCurrentProfile();
  requireSuperAdmin(profile);

  const admin = createAdminClient();

  const { data: inv, error } = await admin
    .from("admin_invitations")
    .select("id, organization_id, email, accepted_at")
    .eq("id", invitationId)
    .maybeSingle();

  if (error || !inv) return { error: "Invitación no encontrada" };
  if (inv.accepted_at) return { error: "Esta invitación ya fue aceptada" };

  // Asegurar user existe para forzar template "Magic Link" (no "Confirm signup")
  const ensureRes = await ensureUserExists(admin, inv.email);
  if ("error" in ensureRes && ensureRes.error) {
    await logAuthEvent({
      organization_id: inv.organization_id,
      actor_id: profile!.id,
      target_email: inv.email,
      event: "admin_invite_resend_create_user_failed",
      payload: { error: ensureRes.error.message },
    });
    return { error: `No pudimos preparar la cuenta: ${ensureRes.error.message}` };
  }

  const { error: otpError } = await admin.auth.signInWithOtp({
    email: inv.email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: `${siteUrl()}/auth/confirm`,
    },
  });

  if (otpError) {
    await logAuthEvent({
      organization_id: inv.organization_id,
      actor_id: profile!.id,
      target_email: inv.email,
      event: "admin_invite_resend_failed",
      payload: { error: otpError.message },
    });
    return { error: `No pudimos reenviar el email: ${otpError.message}` };
  }

  await logAuthEvent({
    organization_id: inv.organization_id,
    actor_id: profile!.id,
    target_email: inv.email,
    event: "admin_invite_resent",
    payload: {},
  });

  revalidatePath("/super-admin");
  return { success: true };
}

export async function switchViewAs(viewAs: string | null, orgId?: string | null) {
  const profile = await getCurrentProfile();
  requireSuperAdmin(profile);

  const supabase = await createClient();

  // Para super_admin: organization_id se gestiona junto con view_as.
  // - viewAs !== null → necesita organization_id (pasado o el ya existente)
  // - viewAs === null → limpiar organization_id también (vuelve al estado global)
  const patch: { view_as: string | null; organization_id?: string | null } = {
    view_as: viewAs,
  };
  if (viewAs === null) {
    patch.organization_id = null;
  } else if (orgId !== undefined) {
    patch.organization_id = orgId;
  }

  await supabase
    .from("profiles")
    .update(patch)
    .eq("id", profile!.id);

  revalidatePath("/");
  return { success: true };
}
