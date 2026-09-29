"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/queries";
import { requireAdmin } from "@/lib/permissions";

type Resultado = { error: string } | { success: true; id?: string };

export async function crearGrupo(fd: FormData): Promise<Resultado> {
  const profile = await getCurrentProfile();
  const guard = requireAdmin(profile);
  if (guard) return guard;
  const nombre = String(fd.get("name") ?? "").trim().slice(0, 60);
  if (nombre.length < 2) return { error: "Ponle nombre al grupo: «Marina», «Estacionamiento techado»…" };
  const { data, error } = await createAdminClient()
    .from("charge_groups")
    .insert({ organization_id: profile!.organization_id!, name: nombre, description: String(fd.get("description") ?? "").trim().slice(0, 200) || null })
    .select("id")
    .single();
  if (error) return { error: error.code === "23505" ? "Ya existe un grupo con ese nombre" : error.message };
  revalidatePath("/admin/grupos");
  return { success: true, id: data.id as string };
}

/**
 * Reemplaza los miembros del grupo. `miembros` llega como JSON {unit_id: peso};
 * las unidades se validan contra el condominio del admin.
 */
export async function guardarMiembros(groupId: string, miembrosJson: string): Promise<Resultado> {
  const profile = await getCurrentProfile();
  const guard = requireAdmin(profile);
  if (guard) return guard;
  const orgId = profile!.organization_id!;

  let miembros: Record<string, number>;
  try {
    miembros = JSON.parse(miembrosJson);
  } catch {
    return { error: "Formato inválido" };
  }
  const filas = Object.entries(miembros)
    .map(([unit_id, w]) => ({ unit_id, weight: Number(w) }))
    .filter((m) => Number.isFinite(m.weight) && m.weight > 0);
  if (filas.length === 0) return { error: "El grupo necesita al menos una unidad con peso mayor que cero" };

  const db = createAdminClient();
  const { data: grupo } = await db.from("charge_groups").select("id").eq("id", groupId).eq("organization_id", orgId).maybeSingle();
  if (!grupo) return { error: "Ese grupo no existe" };
  const { data: validas } = await db
    .from("units")
    .select("id")
    .eq("organization_id", orgId)
    .in("id", filas.map((f) => f.unit_id));
  const ok = new Set((validas ?? []).map((u) => u.id as string));
  if (ok.size !== filas.length) return { error: "Hay unidades que no son de este condominio" };

  const { error: delError } = await db.from("charge_group_members").delete().eq("group_id", groupId);
  if (delError) return { error: delError.message };
  const { error } = await db.from("charge_group_members").insert(filas.map((f) => ({ group_id: groupId, ...f })));
  if (error) return { error: error.message };
  revalidatePath("/admin/grupos");
  revalidatePath("/admin");
  return { success: true };
}

export async function archivarGrupo(groupId: string): Promise<Resultado> {
  const profile = await getCurrentProfile();
  const guard = requireAdmin(profile);
  if (guard) return guard;
  const { error } = await createAdminClient()
    .from("charge_groups")
    .update({ active: false })
    .eq("id", groupId)
    .eq("organization_id", profile!.organization_id!);
  if (error) return { error: error.message };
  revalidatePath("/admin/grupos");
  return { success: true };
}
