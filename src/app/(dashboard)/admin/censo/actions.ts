"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/queries";
import { funcionDe, puede, sinPermiso } from "@/lib/permissions";
import { registrarEvento } from "@/lib/historial";

type Resultado = { error: string } | { success: true; hechas?: number };

function refrescar() {
  revalidatePath("/admin/censo");
  revalidatePath("/documentos");
}

async function unidadDe(orgId: string, unitId: string) {
  const { data } = await createAdminClient().from("units").select("id, unit_number, block").eq("id", unitId).eq("organization_id", orgId).maybeSingle();
  return data ? { id: data.id as string, nombre: `${data.block ? `${data.block} ` : ""}${data.unit_number}` } : null;
}

/**
 * Tres pasos, de tres manos (pedido de la Junta de Costa de Plata, 2026-11-09):
 *
 *   1. recibir   quien carga marca «sin entregar» o «entrega parcial».
 *   2. validar   la administradora declara que está completa y la validó.
 *   3. aprobar   la Junta la aprueba: recién ahí queda en verde.
 *
 * Marcar el paso 1 sobre una unidad ya validada o aprobada la devuelve: borra
 * la validación y la aprobación, y queda en el historial.
 */
export async function marcarRecepcion(unitId: string, estado: "rojo" | "naranja", nota: string): Promise<Resultado> {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return { error: "No autenticado" };
  if (!puede(profile, "cargar")) return { error: sinPermiso(profile) };
  const orgId = profile.organization_id;
  if (estado !== "rojo" && estado !== "naranja") return { error: "Estado inválido." };
  const unidad = await unidadDe(orgId, unitId);
  if (!unidad) return { error: "Esa unidad no es de este condominio." };

  const db = createAdminClient();
  const { data: previa } = await db.from("unit_documentacion").select("estado").eq("unit_id", unitId).maybeSingle();
  // Deshacer una validación o una aprobación no es de quien solo carga.
  if ((previa?.estado === "validada" || previa?.estado === "verde") && !puede(profile, "administrar")) {
    return { error: "Esa unidad ya fue validada. Devolverla le corresponde a la administradora." };
  }
  const { error } = await db.from("unit_documentacion").upsert({
    unit_id: unitId,
    organization_id: orgId,
    estado,
    nota: nota.trim().slice(0, 300) || null,
    actualizado_por: profile.id,
    actualizado_en: new Date().toISOString(),
    validado_por: null,
    validado_en: null,
    aprobado_por: null,
    aprobado_en: null,
  });
  if (error) return { error: error.message };
  await registrarEvento({
    orgId,
    actorId: profile.id,
    evento: "census_updated",
    datos: { unidad: unidad.nombre, estado: estado === "rojo" ? "Sin entregar" : "Entrega parcial", nota: nota.trim().slice(0, 300) || null },
  });
  refrescar();
  return { success: true };
}

export async function validarDocumentacion(unitId: string, nota: string): Promise<Resultado> {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return { error: "No autenticado" };
  if (!puede(profile, "administrar")) return { error: "Validar la documentación le corresponde a la administradora." };
  const orgId = profile.organization_id;
  const unidad = await unidadDe(orgId, unitId);
  if (!unidad) return { error: "Esa unidad no es de este condominio." };

  const db = createAdminClient();
  const { data: previa } = await db.from("unit_documentacion").select("estado, nota").eq("unit_id", unitId).maybeSingle();
  if (previa?.estado === "verde") return { error: "Esa unidad ya está aprobada por la Junta." };
  const ahora = new Date().toISOString();
  const { error } = await db.from("unit_documentacion").upsert({
    unit_id: unitId,
    organization_id: orgId,
    estado: "validada",
    nota: nota.trim().slice(0, 300) || (previa?.nota as string) || null,
    actualizado_por: profile.id,
    actualizado_en: ahora,
    validado_por: profile.id,
    validado_en: ahora,
    aprobado_por: null,
    aprobado_en: null,
  });
  if (error) return { error: error.message };
  await registrarEvento({ orgId, actorId: profile.id, evento: "census_validated", datos: { unidad: unidad.nombre, nota: nota.trim().slice(0, 300) || null } });
  refrescar();
  return { success: true };
}

/** Aprueba una unidad, o todas las que están validadas si no se indica cuál. */
export async function aprobarDocumentacion(unitId: string | null): Promise<Resultado> {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return { error: "No autenticado" };
  if (!puede(profile, "aprobar_junta")) return { error: "Aprobar la documentación le corresponde a la Junta de Condominio." };
  const orgId = profile.organization_id;
  const db = createAdminClient();

  let q = db.from("unit_documentacion").select("unit_id, validado_por, units(unit_number, block)").eq("organization_id", orgId).eq("estado", "validada");
  if (unitId) q = q.eq("unit_id", unitId);
  const { data: validadas } = await q;
  // Quien validó no aprueba, salvo la administración completa.
  const completa = funcionDe(profile) === "completa";
  const aprobables = (validadas ?? []).filter((v) => completa || v.validado_por !== profile.id);
  if (aprobables.length === 0) {
    return { error: unitId ? "Esa unidad no está validada por la administradora, o la validaste tú." : "No hay unidades validadas pendientes de aprobar." };
  }
  const ahora = new Date().toISOString();
  const { error } = await db
    .from("unit_documentacion")
    .update({ estado: "verde", aprobado_por: profile.id, aprobado_en: ahora, actualizado_por: profile.id, actualizado_en: ahora })
    .eq("organization_id", orgId)
    .eq("estado", "validada")
    .in(
      "unit_id",
      aprobables.map((v) => v.unit_id as string),
    );
  if (error) return { error: error.message };
  const nombres = aprobables.map((v) => {
    const u = (Array.isArray(v.units) ? v.units[0] : v.units) as { unit_number?: string; block?: string | null } | null;
    return `${u?.block ? `${u.block} ` : ""}${u?.unit_number ?? ""}`.trim();
  });
  await registrarEvento({
    orgId,
    actorId: profile.id,
    evento: "census_approved",
    datos: { unidades: nombres.length, detalle: nombres.slice(0, 60).join(", ") },
  });
  refrescar();
  return { success: true, hechas: aprobables.length };
}

/** Quién ve el avance del censo. Lo decide la Junta. */
export async function guardarVisibilidadCenso(valor: string): Promise<Resultado> {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return { error: "No autenticado" };
  if (!puede(profile, "aprobar_junta")) return { error: "Quién ve el censo lo decide la Junta de Condominio." };
  if (!["administracion", "propio", "todos"].includes(valor)) return { error: "Opción inválida." };
  const { error } = await createAdminClient().from("organizations").update({ censo_visible: valor }).eq("id", profile.organization_id);
  if (error) return { error: error.message };
  await registrarEvento({ orgId: profile.organization_id, actorId: profile.id, evento: "census_visibility_updated", datos: { visible: valor } });
  refrescar();
  return { success: true };
}
