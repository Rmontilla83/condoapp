"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/queries";
import { isAdminRole, canTenantAct } from "@/lib/permissions";
import { revalidatePath } from "next/cache";

export async function createPoll(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return { error: "No tienes organización" };
  if (!isAdminRole(profile)) {
    return { error: "Solo administradores pueden crear encuestas" };
  }

  const question = (formData.get("question") as string)?.trim();
  const optionsRaw = (formData.get("options") as string)?.trim();

  if (!question || !optionsRaw) return { error: "Completa todos los campos" };

  const options = optionsRaw
    .split("\n")
    .map((o) => o.trim())
    .filter(Boolean);

  if (options.length < 2) return { error: "Necesitas al menos 2 opciones" };

  const supabase = createAdminClient();
  const { error } = await supabase.from("polls").insert({
    organization_id: profile.organization_id,
    created_by: profile.id,
    question,
    options: JSON.stringify(options),
  });

  if (error) return { error: error.message };

  revalidatePath("/votaciones");
  return { success: true };
}

export async function votePoll(pollId: string, option: string) {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "No autenticado" };

  // Policy V2: inquilinos solo pueden votar si el condominio lo permite.
  // Owners y admins siempre pueden.
  const gate = await canTenantAct(profile, "tenant_can_vote");
  if (!gate.allowed) {
    return { error: gate.reason ?? "No puedes votar en este condominio." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("poll_votes").insert({
    poll_id: pollId,
    voter_id: profile.id,
    selected_option: option,
  });

  if (error) {
    if (error.code === "23505") return { error: "Ya votaste en esta encuesta" };
    return { error: error.message };
  }

  revalidatePath("/votaciones");
  return { success: true };
}

export async function closePoll(pollId: string) {
  const profile = await getCurrentProfile();
  if (!profile || !isAdminRole(profile)) {
    return { error: "No autorizado" };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("polls")
    .update({ is_open: false })
    .eq("id", pollId);

  if (error) return { error: error.message };

  revalidatePath("/votaciones");
  return { success: true };
}
