"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/queries";
import { revalidatePath } from "next/cache";

function requireSuperAdmin(profile: { role: string } | null) {
  if (!profile || profile.role !== "super_admin") {
    throw new Error("No autorizado");
  }
}

export async function createOrganization(formData: FormData) {
  const profile = await getCurrentProfile();
  requireSuperAdmin(profile);

  const name = (formData.get("name") as string)?.trim();
  const address = (formData.get("address") as string)?.trim();
  const city = (formData.get("city") as string)?.trim();

  if (!name || !address || !city) return { error: "Completa todos los campos" };

  // Generate invite code: 4 random chars + year
  const code = Math.random().toString(36).substring(2, 6).toUpperCase() + "-" + new Date().getFullYear();

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

export async function inviteAdmin(formData: FormData) {
  const profile = await getCurrentProfile();
  requireSuperAdmin(profile);

  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const orgId = formData.get("org_id") as string;

  if (!email || !orgId) return { error: "Email y condominio requeridos" };

  const supabase = await createClient();

  // Create invitation record
  const { error: invError } = await supabase.from("admin_invitations").insert({
    organization_id: orgId,
    email,
    invited_by: profile!.id,
  });

  if (invError) {
    if (invError.code === "23505") return { error: "Ya existe una invitacion para este email" };
    return { error: invError.message };
  }

  // If user already exists, upgrade to admin
  const { data: existingUser } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email)
    .single();

  if (existingUser) {
    await supabase
      .from("profiles")
      .update({ organization_id: orgId, role: "admin" })
      .eq("id", existingUser.id);

    await supabase
      .from("admin_invitations")
      .update({ accepted_at: new Date().toISOString() })
      .eq("organization_id", orgId)
      .eq("email", email);
  }

  revalidatePath("/super-admin");
  return { success: true, alreadyRegistered: !!existingUser };
}

export async function switchViewAs(viewAs: string | null) {
  const profile = await getCurrentProfile();
  requireSuperAdmin(profile);

  const supabase = await createClient();
  await supabase
    .from("profiles")
    .update({ view_as: viewAs })
    .eq("id", profile!.id);

  revalidatePath("/");
  return { success: true };
}
