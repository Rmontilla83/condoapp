"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { revisionActual } from "@/lib/revision";

type Resultado = { error: string } | { success: true };

const SIN_ENLACE = "Este enlace ya no está activo.";

function notaValida(nota: string): string | null {
  const limpia = nota.trim();
  return limpia.length >= 5 ? limpia.slice(0, 1000) : null;
}

function nombreValido(nombre: string): string | null {
  const limpio = nombre.trim();
  return limpio.length >= 2 ? limpio.slice(0, 80) : null;
}

async function registrar(orgId: string, event: string, payload: Record<string, unknown>) {
  await createAdminClient().from("auth_events").insert({ organization_id: orgId, event, payload });
}

export async function aclararDato(id: string, nombre: string, nota: string): Promise<Resultado> {
  const revision = await revisionActual();
  if (!revision) return { error: SIN_ENLACE };
  const quien = nombreValido(nombre);
  if (!quien) return { error: "Escribe tu nombre." };
  const aclaracion = notaValida(nota);
  if (!aclaracion) return { error: "Escribe qué se aclaró." };

  const { data, error } = await createAdminClient()
    .from("verificacion_carga")
    .update({
      aclaracion,
      aclarado_nombre: quien,
      aclarado_en: new Date().toISOString(),
      actualizado_en: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("organization_id", revision.organizationId)
    .is("aclarado_en", null)
    .neq("estado", "verde")
    .select("id, unit_id, campo");
  if (error) return { error: error.message };
  if (!data?.length) return { error: "Este dato ya no está pendiente." };

  await registrar(revision.organizationId, "verificacion_aclarada", {
    id,
    unit_id: data[0].unit_id,
    campo: data[0].campo,
    nombre: quien,
    nota: aclaracion,
  });
  revalidatePath("/revision");
  return { success: true };
}

/** Aclara de una vez todas las unidades que comparten una misma causa. */
export async function aclararHallazgo(titulo: string, nombre: string, nota: string): Promise<Resultado> {
  const revision = await revisionActual();
  if (!revision) return { error: SIN_ENLACE };
  const quien = nombreValido(nombre);
  if (!quien) return { error: "Escribe tu nombre." };
  const aclaracion = notaValida(nota);
  if (!aclaracion) return { error: "Escribe qué se aclaró." };

  const { data, error } = await createAdminClient()
    .from("verificacion_carga")
    .update({
      aclaracion,
      aclarado_nombre: quien,
      aclarado_en: new Date().toISOString(),
      actualizado_en: new Date().toISOString(),
    })
    .eq("organization_id", revision.organizationId)
    .eq("hallazgo", titulo)
    .is("aclarado_en", null)
    .neq("estado", "verde")
    .select("id");
  if (error) return { error: error.message };
  if (!data?.length) return { error: "No quedan datos pendientes en este hallazgo." };

  await registrar(revision.organizationId, "verificacion_hallazgo_aclarado", {
    hallazgo: titulo,
    filas: data.length,
    nombre: quien,
    nota: aclaracion,
  });
  revalidatePath("/revision");
  return { success: true };
}

export async function reabrirDato(id: string): Promise<Resultado> {
  const revision = await revisionActual();
  if (!revision) return { error: SIN_ENLACE };

  const { data, error } = await createAdminClient()
    .from("verificacion_carga")
    .update({ aclaracion: null, aclarado_nombre: null, aclarado_en: null, actualizado_en: new Date().toISOString() })
    .eq("id", id)
    .eq("organization_id", revision.organizationId)
    .not("aclarado_en", "is", null)
    .select("id, unit_id, campo");
  if (error) return { error: error.message };
  if (!data?.length) return { error: "Este dato no estaba aclarado." };

  await registrar(revision.organizationId, "verificacion_reabierta", { id, unit_id: data[0].unit_id, campo: data[0].campo });
  revalidatePath("/revision");
  return { success: true };
}
