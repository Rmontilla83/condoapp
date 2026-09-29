"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { casetaActual } from "@/lib/caseta";
import { notificar, perfilesDeUnidad } from "@/lib/notificaciones";

type Resultado = { error: string } | { success: true };

const texto = (fd: FormData, k: string, max: number) => {
  const v = fd.get(k);
  const t = typeof v === "string" ? v.trim() : "";
  return t ? t.slice(0, max) : null;
};

/**
 * La garita registra un paquete para una unidad. Solo desde una caseta: la
 * cookie es la credencial, igual que para las entradas.
 */
export async function registrarPaquete(fd: FormData): Promise<Resultado> {
  const caseta = await casetaActual();
  if (!caseta) return { error: "Este dispositivo no es una caseta." };

  const unitId = String(fd.get("unit_id") ?? "");
  const descripcion = texto(fd, "description", 120);
  if (!unitId) return { error: "Elige la unidad" };
  if (!descripcion || descripcion.length < 2) return { error: "Describe el paquete: «Caja de Amazon», «Sobre»…" };

  const db = createAdminClient();
  const { data: unidad } = await db
    .from("units")
    .select("id, unit_number, block")
    .eq("id", unitId)
    .eq("organization_id", caseta.organization_id)
    .maybeSingle();
  if (!unidad) return { error: "Esa unidad no es de este condominio" };

  const { data: paquete, error } = await db
    .from("packages")
    .insert({
      organization_id: caseta.organization_id,
      unit_id: unitId,
      description: descripcion,
      carrier: texto(fd, "carrier", 60),
      recipient_name: texto(fd, "recipient_name", 80),
      received_station_id: caseta.id,
    })
    .select("id")
    .single();
  if (error || !paquete) return { error: error?.message ?? "No se pudo registrar" };

  await notificar(caseta.organization_id, await perfilesDeUnidad(unitId), {
    tipo: "paquete_recibido",
    titulo: `Tienes un paquete en la garita: ${descripcion}`,
    cuerpo: `Llegó para el Apto ${unidad.unit_number}${unidad.block ? ` · ${unidad.block}` : ""}. Retíralo en ${caseta.name}.`,
    enlace: "/dashboard",
    claveUnica: `paquete:${paquete.id}`,
  });

  revalidatePath("/caseta");
  return { success: true };
}

/** La garita entrega el paquete y anota quién lo retiró. */
export async function entregarPaquete(fd: FormData): Promise<Resultado> {
  const caseta = await casetaActual();
  if (!caseta) return { error: "Este dispositivo no es una caseta." };

  const id = String(fd.get("id") ?? "");
  const quien = texto(fd, "delivered_to", 80);
  if (!quien) return { error: "Anota quién lo retira" };

  const db = createAdminClient();
  // Las condiciones van en el UPDATE: dos entregas a la vez no pisan la primera.
  const { data, error } = await db
    .from("packages")
    .update({
      status: "delivered",
      delivered_at: new Date().toISOString(),
      delivered_to: quien,
      delivered_station_id: caseta.id,
    })
    .eq("id", id)
    .eq("organization_id", caseta.organization_id)
    .eq("status", "waiting")
    .select("id, unit_id, description");
  if (error) return { error: error.message };
  if (!data?.length) return { error: "Ese paquete ya fue entregado." };

  const p = data[0];
  await notificar(caseta.organization_id, await perfilesDeUnidad(p.unit_id as string), {
    tipo: "paquete_entregado",
    titulo: `Retiraron tu paquete: ${p.description as string}`,
    cuerpo: `Lo retiró ${quien}.`,
    claveUnica: `paquete-entregado:${p.id as string}`,
    correo: false,
  });

  revalidatePath("/caseta");
  return { success: true };
}
