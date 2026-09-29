"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/queries";
import { requireAdmin } from "@/lib/permissions";
import {
  claveUnidad,
  correoValido,
  esCorreoProvisional,
  leerPlanilla,
  normalizarTelefono,
} from "@/lib/contactos";
import { enviarLote } from "@/lib/email/send";
import { bienvenidaPropietario } from "@/lib/email/templates";
import { nombreDeOrg } from "@/lib/email/recipients";
import { propietariosDeOrg } from "./datos";

export interface ResultadoFila {
  linea: number;
  unidad: string;
  propietario: string;
  estado: "cambia" | "igual" | "error";
  cambios: string[];
  detalle?: string;
}

type Resumen = { error: string } | { filas: ResultadoFila[]; aplicado: boolean };

/**
 * Cruza la planilla con los propietarios cargados. Con `aplicar = false` solo
 * dice qué pasaría; con `true` lo escribe. No envía ningún correo: la
 * invitación es un paso aparte, cuando la administración decida.
 *
 * El correo solo se cambia si la persona nunca entró (o si el que tiene es el
 * provisional de la carga): cambiarle el correo a alguien que ya usa la app
 * lo dejaría sin acceso.
 */
export async function procesarPlanilla(texto: string, aplicar: boolean): Promise<Resumen> {
  const profile = await getCurrentProfile();
  const guard = requireAdmin(profile);
  if (guard) return guard;
  const orgId = profile!.organization_id!;

  const { filas, error } = leerPlanilla(texto);
  if (error) return { error };

  const propietarios = await propietariosDeOrg(orgId);
  const porUnidad = new Map<string, typeof propietarios>();
  const porClaveCorta = new Map<string, typeof propietarios | null>();
  for (const p of propietarios) {
    const k = claveUnidad(p.torre, p.unidad);
    porUnidad.set(k, [...(porUnidad.get(k) ?? []), p]);
    // Sin columna de torre: «A-1-1» o «A 1-1» → «A11». Si dos unidades
    // colapsan a la misma clave, queda ambigua y se pide la torre.
    const corta = k.replace(/[|-]/g, "");
    const previa = porClaveCorta.get(corta);
    porClaveCorta.set(corta, previa === undefined ? [p] : previa && previa[0].unitId === p.unitId ? [...previa, p] : null);
  }

  // Estado vivo por persona: una misma persona puede tener varias unidades y
  // venir en varias filas.
  const persona = new Map(
    propietarios.map((p) => [p.profileId, { nombre: p.nombre, correo: p.correo, telefono: p.telefono, entro: p.entro }]),
  );
  const correoDe = new Map(propietarios.map((p) => [p.correo, p.profileId]));

  const db = createAdminClient();
  // Correos de la planilla que ya usa alguien que no es propietario aquí
  // (otro condominio, un admin): se detectan antes de tocar Auth.
  const correos = [...new Set(filas.map((f) => f.correo).filter((c) => c && correoValido(c)))];
  const ajenos = new Map<string, string>();
  for (let i = 0; i < correos.length; i += 200) {
    const { data } = await db.from("profiles").select("id, email, full_name").in("email", correos.slice(i, i + 200));
    for (const p of data ?? []) ajenos.set((p.email as string).toLowerCase(), p.id as string);
  }

  const resultados: ResultadoFila[] = [];
  for (const f of filas) {
    const etiqueta = [f.torre, f.unidad].filter(Boolean).join(" · ") || "(sin unidad)";
    const base = { linea: f.linea, unidad: etiqueta, propietario: f.nombre, cambios: [] as string[] };
    const candidatos = f.torre
      ? porUnidad.get(claveUnidad(f.torre, f.unidad))
      : porUnidad.get(claveUnidad("", f.unidad)) ?? porClaveCorta.get(claveUnidad("", f.unidad).replace(/[|-]/g, "")) ?? undefined;
    if (!f.unidad || !candidatos?.length) {
      resultados.push({ ...base, estado: "error", detalle: f.torre || !f.unidad ? "No encontré esa unidad" : "Falta la torre" });
      continue;
    }
    // Varios propietarios en la unidad: el que coincide por nombre, o el primero.
    const normal = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
    const dueño = candidatos.find((c) => f.nombre && normal(c.nombre) === normal(f.nombre)) ?? candidatos[0];
    const actual = persona.get(dueño.profileId)!;
    base.unidad = `${dueño.torre ? `${dueño.torre} · ` : ""}${dueño.unidad}`;
    base.propietario = actual.nombre;

    const cambios: string[] = [];
    const patch: { email?: string; phone?: string; full_name?: string } = {};
    let detalle: string | undefined;

    if (f.correo && f.correo !== actual.correo) {
      const dueñoDelCorreo = correoDe.get(f.correo) ?? ajenos.get(f.correo);
      if (!correoValido(f.correo)) detalle = `Correo inválido: ${f.correo}`;
      else if (esCorreoProvisional(f.correo)) detalle = "Ese correo es de prueba";
      else if (dueñoDelCorreo && dueñoDelCorreo !== dueño.profileId) detalle = `${f.correo} ya lo usa otra cuenta`;
      else if (actual.entro && !esCorreoProvisional(actual.correo))
        detalle = `Ya entra con ${actual.correo}; ese correo se cambia desde su unidad`;
      else {
        patch.email = f.correo;
        cambios.push(`correo → ${f.correo}`);
      }
    }
    if (f.telefono) {
      const tel = normalizarTelefono(f.telefono);
      if (!tel) detalle = detalle ?? `Teléfono inválido: ${f.telefono}`;
      else if (tel !== actual.telefono) {
        patch.phone = tel;
        cambios.push(`teléfono → ${tel}`);
      }
    }
    if (f.nombre && f.nombre.trim().length >= 3 && normal(f.nombre) !== normal(actual.nombre)) {
      patch.full_name = f.nombre.trim().slice(0, 120);
      cambios.push(`nombre → ${patch.full_name}`);
    }

    if (cambios.length === 0) {
      resultados.push({ ...base, estado: detalle ? "error" : "igual", detalle });
      continue;
    }

    if (aplicar) {
      if (patch.email) {
        // email_confirm: el correo lo entregó la junta; así no sale ningún
        // correo de confirmación de Supabase.
        const { error: authError } = await db.auth.admin.updateUserById(dueño.profileId, {
          email: patch.email,
          email_confirm: true,
        });
        if (authError) {
          resultados.push({ ...base, estado: "error", cambios, detalle: `No se pudo cambiar el correo: ${authError.message}` });
          continue;
        }
      }
      const { error: perfilError } = await db.from("profiles").update(patch).eq("id", dueño.profileId);
      if (perfilError) {
        resultados.push({ ...base, estado: "error", cambios, detalle: perfilError.message });
        continue;
      }
    }

    // Lo que sigue en la planilla ve a la persona ya actualizada.
    if (patch.email) {
      correoDe.delete(actual.correo);
      correoDe.set(patch.email, dueño.profileId);
      actual.correo = patch.email;
    }
    if (patch.phone) actual.telefono = patch.phone;
    if (patch.full_name) actual.nombre = patch.full_name;
    resultados.push({ ...base, estado: detalle ? "error" : "cambia", cambios, detalle });
  }

  if (aplicar) {
    await db.from("auth_events").insert({
      organization_id: orgId,
      actor_id: profile!.id,
      event: "owner_contacts_imported",
      payload: {
        filas: filas.length,
        cambiadas: resultados.filter((r) => r.cambios.length > 0 && r.estado !== "error").length,
      },
    });
    revalidatePath("/admin/contactos");
    revalidatePath("/admin");
  }
  return { filas: resultados, aplicado: aplicar };
}

/**
 * Correo de bienvenida a los propietarios con correo real que todavía no
 * entraron. Sin `profileIds` va a todos los pendientes que nunca se invitaron.
 */
export async function invitarPropietarios(profileIds?: string[]): Promise<{ error: string } | { enviados: number; omitidos: number }> {
  const profile = await getCurrentProfile();
  const guard = requireAdmin(profile);
  if (guard) return guard;
  const orgId = profile!.organization_id!;

  const propietarios = await propietariosDeOrg(orgId);
  const elegidos = propietarios.filter(
    (p) =>
      !p.entro &&
      !esCorreoProvisional(p.correo) &&
      (profileIds ? profileIds.includes(p.profileId) : !p.invitadoEl),
  );
  // Una persona con dos unidades recibe un solo correo.
  const porPersona = new Map<string, { correo: string; nombre: string; unidades: string[] }>();
  for (const p of elegidos) {
    const actual = porPersona.get(p.profileId) ?? { correo: p.correo, nombre: p.nombre, unidades: [] };
    actual.unidades.push(`${p.torre ? `${p.torre} · ` : ""}${p.unidad}`);
    porPersona.set(p.profileId, actual);
  }
  if (porPersona.size === 0) return { enviados: 0, omitidos: 0 };

  const condominio = await nombreDeOrg(orgId);
  const mensajes = [...porPersona.values()].map((p) => {
    const m = bienvenidaPropietario({
      condominio,
      nombre: p.nombre || null,
      correo: p.correo,
      unidades: p.unidades.length === 1 ? `Apto ${p.unidades[0]}` : `${p.unidades.length} unidades`,
    });
    return { para: p.correo, asunto: m.asunto, html: m.html };
  });
  const r = await enviarLote(mensajes, "bienvenida_propietario");
  if (r.enviados > 0) {
    await createAdminClient()
      .from("auth_events")
      .insert(
        mensajes.map((m) => ({
          organization_id: orgId,
          actor_id: profile!.id,
          target_email: m.para,
          event: "portal_invite_sent",
          payload: {},
        })),
      );
  }
  revalidatePath("/admin/contactos");
  if (r.enviados === 0 && r.omitidos > 0) return { error: "El envío de correos no está configurado (falta RESEND_API_KEY)." };
  return { enviados: r.enviados, omitidos: r.omitidos };
}
