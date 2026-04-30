"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/queries";
import { isAdminRole, canTenantAct } from "@/lib/permissions";
import { getVoterAliquot } from "@/lib/decisions";
import { revalidatePath } from "next/cache";
import type { DecisionKind } from "@/types/database";

const VALID_KINDS: DecisionKind[] = ["quick_poll", "formal_assembly"];

export async function createDecision(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return { error: "Sin organización" };
  if (!isAdminRole(profile)) return { error: "Solo administradores" };

  const kindRaw = formData.get("kind") as string;
  const kind: DecisionKind = VALID_KINDS.includes(kindRaw as DecisionKind)
    ? (kindRaw as DecisionKind)
    : "quick_poll";

  const title = (formData.get("title") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || null;
  if (!title) return { error: "Título requerido" };

  const questionsRaw = formData.get("questions") as string;
  let questions: Array<{ question: string; options: string[] }>;
  try {
    questions = JSON.parse(questionsRaw);
  } catch {
    return { error: "Preguntas inválidas (JSON)" };
  }
  if (!Array.isArray(questions) || questions.length === 0) {
    return { error: "Al menos 1 pregunta requerida" };
  }
  if (kind === "quick_poll" && questions.length !== 1) {
    return { error: "Una encuesta rápida tiene exactamente 1 pregunta" };
  }
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    if (!q.question?.trim()) return { error: `Pregunta ${i + 1}: texto requerido` };
    if (!Array.isArray(q.options) || q.options.length < 2) {
      return { error: `Pregunta ${i + 1}: necesita al menos 2 opciones` };
    }
  }

  const weighted_by_aliquot = formData.get("weighted_by_aliquot") === "true";
  const quorumRaw = formData.get("quorum_pct") as string;
  const quorum_pct = kind === "formal_assembly" && quorumRaw
    ? Math.min(Math.max(parseFloat(quorumRaw), 0), 100)
    : null;

  const scheduledAtRaw = (formData.get("scheduled_at") as string)?.trim();
  const closesAtRaw = (formData.get("closes_at") as string)?.trim();
  const scheduled_at = kind === "formal_assembly" && scheduledAtRaw ? scheduledAtRaw : null;
  const closes_at = closesAtRaw || null;

  // Si closes_at <= now, autostatus closed
  let status: "draft" | "open" | "closed" = "open";
  if (closes_at && new Date(closes_at) <= new Date()) {
    status = "closed";
  }

  const supabase = createAdminClient();

  const { data: decision, error: dErr } = await supabase
    .from("decisions")
    .insert({
      organization_id: profile.organization_id,
      created_by: profile.id,
      kind,
      title,
      description,
      status,
      weighted_by_aliquot,
      quorum_pct,
      scheduled_at,
      closes_at,
    })
    .select("id")
    .single();

  if (dErr || !decision) return { error: dErr?.message ?? "Error creando decisión" };

  const questionRows = questions.map((q, i) => ({
    decision_id: decision.id as string,
    question: q.question.trim(),
    options: q.options.map((o) => o.trim()).filter(Boolean),
    position: i,
  }));

  const { error: qErr } = await supabase.from("decision_questions").insert(questionRows);
  if (qErr) {
    // Rollback manual: delete decision
    await supabase.from("decisions").delete().eq("id", decision.id);
    return { error: `Error creando preguntas: ${qErr.message}` };
  }

  revalidatePath("/decisiones");
  revalidatePath("/dashboard");
  return { success: true, decisionId: decision.id };
}

export async function voteDecision(questionId: string, option: string, decisionId: string) {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return { error: "No autenticado" };

  const gate = await canTenantAct(profile, "tenant_can_vote");
  if (!gate.allowed) return { error: gate.reason ?? "No puedes votar" };

  const supabase = await createClient();

  // Validar que la decisión está abierta y no ha cerrado
  const { data: decision } = await supabase
    .from("decisions")
    .select("id, status, closes_at, weighted_by_aliquot, organization_id")
    .eq("id", decisionId)
    .single();

  if (!decision) return { error: "Decisión no encontrada" };
  if (decision.status !== "open") return { error: "Decisión cerrada" };
  if (decision.closes_at && new Date(decision.closes_at) <= new Date()) {
    return { error: "Decisión vencida" };
  }

  // Computar weight
  let weight = 1.0;
  if (decision.weighted_by_aliquot) {
    weight = await getVoterAliquot(profile.id, decision.organization_id as string);
    // Si el user es tenant (sin owner active) en este org, weight=0 pero el voto se registra
  }

  const { error } = await supabase.from("decision_responses").insert({
    question_id: questionId,
    voter_id: profile.id,
    selected_option: option,
    weight,
  });

  if (error) {
    if (error.code === "23505") return { error: "Ya votaste esta pregunta. Tu voto es final." };
    return { error: error.message };
  }

  revalidatePath("/decisiones");
  revalidatePath(`/decisiones/${decisionId}`);
  revalidatePath("/dashboard");
  return { success: true };
}

export async function closeDecision(decisionId: string) {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return { error: "No autenticado" };
  if (!isAdminRole(profile)) return { error: "Solo administradores" };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("decisions")
    .update({ status: "closed" })
    .eq("id", decisionId)
    .eq("organization_id", profile.organization_id);

  if (error) return { error: error.message };

  revalidatePath("/decisiones");
  revalidatePath(`/decisiones/${decisionId}`);
  return { success: true };
}

export async function cancelDecision(decisionId: string) {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return { error: "No autenticado" };
  if (!isAdminRole(profile)) return { error: "Solo administradores" };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("decisions")
    .update({ status: "cancelled" })
    .eq("id", decisionId)
    .eq("organization_id", profile.organization_id);

  if (error) return { error: error.message };

  revalidatePath("/decisiones");
  revalidatePath(`/decisiones/${decisionId}`);
  return { success: true };
}
