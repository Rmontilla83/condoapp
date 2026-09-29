"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/queries";
import { requireAdmin } from "@/lib/permissions";
import { CATEGORIAS_SERVICIO } from "@/lib/servicios";

type Resultado = { error: string } | { success: true };

const CATEGORIAS = new Set<string>(CATEGORIAS_SERVICIO.map((c) => c.id));

export async function agregarServicio(formData: FormData): Promise<Resultado> {
  const profile = await getCurrentProfile();
  const guard = requireAdmin(profile);
  if (guard) return guard;

  const texto = (k: string, max: number) => {
    const v = formData.get(k);
    const t = typeof v === "string" ? v.trim() : "";
    return t ? t.slice(0, max) : null;
  };
  const category = String(formData.get("category") ?? "");
  const name = texto("name", 80);
  const phone = texto("phone", 40);
  const whatsapp = texto("whatsapp", 40);

  if (!CATEGORIAS.has(category)) return { error: "Elige una categoría" };
  if (!name || name.length < 2) return { error: "Escribe el nombre del proveedor" };
  if (!phone && !whatsapp) return { error: "Hace falta al menos un teléfono o un WhatsApp" };

  const { error } = await createAdminClient().from("service_providers").insert({
    organization_id: profile!.organization_id!,
    category,
    name,
    phone,
    whatsapp,
    notes: texto("notes", 300),
    recommended_by: texto("recommended_by", 80),
    created_by: profile!.id,
  });
  if (error) return { error: error.message };
  revalidatePath("/servicios");
  return { success: true };
}

export async function retirarServicio(id: string): Promise<Resultado> {
  const profile = await getCurrentProfile();
  const guard = requireAdmin(profile);
  if (guard) return guard;

  const { error } = await createAdminClient()
    .from("service_providers")
    .update({ active: false })
    .eq("id", id)
    .eq("organization_id", profile!.organization_id!);
  if (error) return { error: error.message };
  revalidatePath("/servicios");
  return { success: true };
}
