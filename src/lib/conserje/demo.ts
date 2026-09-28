import { todayInTimeZone } from "@/lib/utils";
import { consultasDelConserje, type ConserjeContexto } from "./consultas";
import type { Turno } from "./conserje";

/**
 * Modo demo del conserje: responde SIN la API de Anthropic.
 *
 * Reconoce la intención por palabras clave y contesta con las mismas consultas
 * que usa Claude (consultas.ts), así que los datos son reales y el filtro de
 * privacidad es el mismo. Lo que no tiene es comprensión: una pregunta rara cae
 * en el menú de ayuda. Sirve para mostrar el producto antes de tener la clave,
 * y como respaldo si la API falla.
 */

const norm = (s: string) =>
  s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[¿?¡!.,;:]/g, " ");

const usd = (n: number) =>
  `$${n.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const bs = (n: number) =>
  `Bs ${n.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function fechaLarga(iso: string) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("es-VE", {
    weekday: "long", day: "numeric", month: "long", timeZone: "UTC",
  });
}

/** "el caney", "la parrillera", "la playa". */
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function conArticulo(nombre: string) {
  const n = nombre.toLowerCase();
  return `${/a$/.test(n) ? "la" : "el"} ${n}`;
}

const DIAS = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto",
  "septiembre", "octubre", "noviembre", "diciembre"];

/** "hoy", "mañana", "el sábado", "el 5", "5/10", "5 de octubre" → AAAA-MM-DD. */
export function interpretarFecha(texto: string, hoyIso: string): string | null {
  const t = norm(texto);
  const hoy = new Date(`${hoyIso}T12:00:00Z`);
  const mas = (d: number) => new Date(hoy.getTime() + d * 86_400_000).toISOString().slice(0, 10);

  if (/\bpasado manana\b/.test(t)) return mas(2);
  if (/\bmanana\b/.test(t)) return mas(1);
  if (/\bhoy\b|\besta noche\b|\besta tarde\b/.test(t)) return mas(0);

  const dia = DIAS.findIndex((d) => new RegExp(`\\b${d}\\b`).test(t));
  if (dia >= 0) {
    let delta = (dia - hoy.getUTCDay() + 7) % 7;
    if (delta === 0 || /\bproximo\b|\bque viene\b/.test(t)) delta = delta === 0 ? 7 : delta;
    return mas(delta);
  }

  const conMes = t.match(/\b(\d{1,2}) de (\w+)/);
  if (conMes) {
    const m = MESES.indexOf(conMes[2]);
    if (m >= 0) return armar(Number(conMes[1]), m, hoy);
  }
  const barra = t.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
  if (barra) return armar(Number(barra[1]), Number(barra[2]) - 1, hoy);
  const soloDia = t.match(/\b(?:el|para el|dia)\s+(\d{1,2})\b/);
  if (soloDia) {
    const d = Number(soloDia[1]);
    const m = d >= hoy.getUTCDate() ? hoy.getUTCMonth() : hoy.getUTCMonth() + 1;
    return armar(d, m, hoy);
  }
  return null;
}

function armar(dia: number, mes: number, hoy: Date): string | null {
  let anio = hoy.getUTCFullYear();
  if (mes < hoy.getUTCMonth()) anio += 1;
  const f = new Date(Date.UTC(anio, mes, dia, 12));
  if (f.getUTCDate() !== dia) return null;
  return f.toISOString().slice(0, 10);
}

type Intencion =
  | "privacidad" | "saludo" | "gracias" | "disponibilidad" | "saldo_favor" | "revision"
  | "historial" | "deuda" | "pagar" | "areas" | "contacto" | "normas" | "comunicados"
  | "alicuota" | "tasa" | "mantenimiento";

const REGLAS: [Intencion, RegExp][] = [
  ["privacidad", /\b(vecino|vecina|morosos|quien(es)? debe|cuanto debe (el|la)|deuda de(l| la| otro)|otro apartamento)\b/],
  ["saldo_favor", /\b(saldo a favor|a mi favor|credito|abono|pague de mas)\b/],
  ["revision", /\b(aprob\w*|en revision|comprobante|ya report\w*|lo recibieron)\b/],
  ["historial", /\b(historial|ultimo pago|pagos anteriores|cuando pague|rechaz\w*)\b/],
  ["deuda", /\b(debo|deuda|pendiente\w*|cuanto (pago|tengo que pagar|es la cuota|sale)|estado de cuenta|vence|vencimiento|al dia|recibo|cuota|mensualidad|condominio de este mes)\b/],
  ["pagar", /\b(como pago|pagar|transferencia|transferir|pago movil|zelle|cuenta bancaria|datos bancarios|banco|a que cuenta)\b/],
  ["disponibilidad", /\b(libre|disponible|ocupad\w*|hay cupo|puedo reservar|esta tomad\w*)\b/],
  ["areas", /\b(area\w*|parriller\w*|caney|playa|piscina|salon|reserv\w*|gimnasio|cancha)\b/],
  ["contacto", /\b(telefono|contacto|contactar|administracion|administrador\w*|correo|email|oficina|llamar|whatsapp|horario de atencion)\b/],
  ["normas", /\b(norma\w*|regla\w*|reglamento|basura|mascota\w*|perro\w*|ruido|mudanza|estacionamiento|marina|lancha|muelle|puesto)\b/],
  ["comunicados", /\b(comunicado\w*|aviso\w*|noticia\w*|asamblea\w*|anuncio\w*|corte de (agua|luz)|novedad\w*)\b/],
  ["alicuota", /\b(alicuota|porcentaje|mi unidad|mi apartamento|metros|por que pago)\b/],
  ["tasa", /\b(tasa|dolar|bcv|cambio|bolivares)\b/],
  ["mantenimiento", /\b(mantenimiento|averia|dano|danad\w*|fuga|reparar|arreglar|ascensor|filtracion|reportar un problema|mi solicitud)\b/],
  ["saludo", /^\s*(hola|buen(os|as)( dias| tardes| noches)?|hey|saludos|que tal)\b/],
  ["gracias", /\b(gracias|muchas gracias|perfecto|listo|excelente)\b/],
];

function detectar(texto: string): Intencion[] {
  const t = norm(texto);
  const encontradas = REGLAS.filter(([, re]) => re.test(t)).map(([i]) => i);
  // "¿Está libre la parrillera?" es disponibilidad, no la lista de áreas.
  if (encontradas.includes("disponibilidad")) return ["disponibilidad"];
  if (encontradas.includes("privacidad")) return ["privacidad"];
  // "¿Puedo llevar el perro a la playa?" es una norma, no la lista de áreas.
  if (encontradas.includes("normas") && encontradas.includes("areas")) {
    return encontradas.filter((i) => i !== "areas").slice(0, 2);
  }
  if (encontradas.includes("saldo_favor")) return ["saldo_favor"];
  // "Cuánto debo" ya trae el saldo a favor; no repetirlo.
  if (encontradas.includes("deuda")) return encontradas.filter((i) => i !== "saldo_favor" && i !== "saludo").slice(0, 2);
  return encontradas.filter((i) => i !== "saludo" || encontradas.length === 1).slice(0, 2);
}

const MENU = `Puedo ayudarte con:
• Cuánto debes y cuándo vence
• Cómo y dónde pagar
• Si tu pago ya fue aprobado
• Áreas comunes y si están libres una fecha
• Contacto de la administración y normas del edificio
• Comunicados recientes
• Tu alícuota y tus solicitudes de mantenimiento`;

export async function responderDemo(
  ctx: ConserjeContexto,
  nombre: string,
  historial: Turno[],
): Promise<{ texto: string }> {
  const q = consultasDelConserje(ctx);
  const ultima = historial[historial.length - 1]?.content ?? "";
  let intenciones = detectar(ultima);

  // Seguimiento corto: "¿y el sábado?" después de preguntar por un área.
  const hoy = todayInTimeZone(ctx.timezone);
  if (intenciones.length === 0 && interpretarFecha(ultima, hoy)) {
    const previa = [...historial].reverse().slice(1).find((t) => t.role === "user");
    if (previa && /area|parriller|caney|playa|piscina|salon|libre|disponible/.test(norm(previa.content))) {
      intenciones = ["disponibilidad"];
    }
  }

  if (intenciones.length === 0) {
    return { texto: `No estoy seguro de haberte entendido. ${MENU}` };
  }

  const partes: string[] = [];
  for (const i of intenciones) partes.push(await responderIntencion(i, q, ctx, nombre, ultima, historial, hoy));
  return { texto: partes.filter(Boolean).join("\n\n") };
}

async function responderIntencion(
  i: Intencion,
  q: ReturnType<typeof consultasDelConserje>,
  ctx: ConserjeContexto,
  nombre: string,
  texto: string,
  historial: Turno[],
  hoy: string,
): Promise<string> {
  const primerNombre = nombre.trim().split(/\s+/)[0] ?? "";

  switch (i) {
    case "saludo":
      return `¡Hola${primerNombre ? `, ${primerNombre}` : ""}! Soy el conserje virtual. ${MENU}`;

    case "gracias":
      return "¡A la orden! Si necesitas algo más, aquí estoy.";

    case "privacidad":
      return "Solo puedo consultar la información de tus propias unidades. La deuda o los datos de otros vecinos no los puedo compartir.";

    case "saldo_favor": {
      const e = await q.estadoDeCuenta();
      if (e.sin_acceso) return "No tengo acceso a las cuotas de tu unidad.";
      const lineas = [
        e.saldo_a_favor_usd > 0
          ? `Tienes ${usd(e.saldo_a_favor_usd)} de saldo a favor. Se descuenta solo de tus próximas cuotas.`
          : "No tienes saldo a favor disponible en este momento.",
      ];
      const aplicados = e.movimientos_de_saldo.filter((m) => m.tipo === "aplicado a una cuota");
      if (aplicados.length) {
        lineas.push("Últimos usos de tu saldo:");
        for (const m of aplicados.slice(0, 3)) {
          lineas.push(`• ${usd(Math.abs(m.monto))} a ${m.detalle ?? "una cuota"} (${new Date(m.fecha).toLocaleDateString("es-VE")})`);
        }
      }
      return lineas.join("\n");
    }

    case "deuda":
    case "revision": {
      const e = await q.estadoDeCuenta();
      if (e.sin_acceso) return `No puedo mostrarte las cuotas: ${e.motivo.charAt(0).toLowerCase()}${e.motivo.slice(1)}`;

      const lineas: string[] = [];
      if (i === "revision") {
        if (e.pagos_en_revision.length === 0) {
          lineas.push("No tienes comprobantes esperando revisión.");
        } else {
          const tot = e.pagos_en_revision.reduce((s, p) => s + p.monto, 0);
          lineas.push(
            `Tienes ${e.pagos_en_revision.length} comprobante${e.pagos_en_revision.length !== 1 ? "s" : ""} en revisión por ${usd(tot)}. La administración lo revisa y te llega la respuesta en la app.`,
          );
        }
        return lineas.join("\n");
      }

      if (e.cuotas.length === 0) {
        lineas.push("¡Estás al día! No tienes cuotas pendientes.");
      } else {
        const porPagar = e.cuotas.filter((c) => !c.comprobante_en_revision);
        const vencidas = porPagar.filter((c) => c.vencida);
        lineas.push(
          `Tienes ${porPagar.length} cuota${porPagar.length !== 1 ? "s" : ""} por pagar: ${usd(e.por_pagar_usd)}` +
            (e.por_pagar_bs ? ` (${bs(e.por_pagar_bs)} a la tasa BCV de hoy).` : "."),
        );
        for (const c of porPagar.slice(0, 6)) {
          lineas.push(
            `• ${c.concepto}${ctx.unidades.length > 1 ? ` (${c.unidad})` : ""}: ${usd(c.monto)} — ${c.vencida ? "vencida el" : "vence el"} ${fechaLarga(c.vence)}`,
          );
        }
        if (vencidas.length) lineas.push(`Ojo: ${vencidas.length} ya ${vencidas.length === 1 ? "está vencida" : "están vencidas"}.`);
        const enRev = e.cuotas.length - porPagar.length;
        if (enRev) lineas.push(`Además, ${enRev} cuota${enRev !== 1 ? "s tienen" : " tiene"} un comprobante en revisión.`);
      }
      if (e.saldo_a_favor_usd > 0) {
        lineas.push(`Tienes ${usd(e.saldo_a_favor_usd)} de saldo a favor: se descuenta solo de tus próximas cuotas.`);
      }
      return lineas.join("\n");
    }

    case "historial": {
      const h = await q.historialDePagos();
      if (h.sin_acceso) return "No tengo acceso a las cuotas de tu unidad.";
      if (h.pagos.length === 0) return "Todavía no hay pagos registrados en tu historial.";
      const lineas = ["Tus últimos pagos:"];
      for (const p of h.pagos.slice(0, 5)) {
        lineas.push(
          `• ${new Date(p.fecha).toLocaleDateString("es-VE")} · ${p.concepto} · ${usd(p.monto)} · ${p.metodo} · ${p.estado}`,
        );
      }
      return lineas.join("\n");
    }

    case "pagar": {
      const p = await q.comoPagar();
      if (p.cuentas.length === 0) {
        return "La administración todavía no cargó sus cuentas bancarias en la app. Escríbeles para pedírselas.";
      }
      const lineas = ["Puedes pagar a cualquiera de estas cuentas:"];
      for (const c of p.cuentas) {
        const tipo = c.tipo === "mobile_payment" ? "Pago móvil" : c.tipo === "zelle" ? "Zelle" : "Transferencia";
        const dato = c.tipo === "mobile_payment" ? `${c.telefono_o_dato_extra ?? ""} · ${c.rif_o_cedula ?? ""}` : c.numero;
        lineas.push(`• ${tipo} — ${c.banco}: ${dato} (${c.titular}${c.tipo !== "mobile_payment" && c.rif_o_cedula ? `, ${c.rif_o_cedula}` : ""})`);
      }
      lineas.push(p.como_reportar_en_la_app);
      return lineas.join("\n");
    }

    case "disponibilidad": {
      const fecha =
        interpretarFecha(texto, hoy) ??
        interpretarFecha(
          [...historial].reverse().find((t) => t.role === "user" && interpretarFecha(t.content, hoy))?.content ?? "",
          hoy,
        );
      const areas = await q.areasComunes();
      const nombres = areas.areas.map((a) => a.name as string);
      const t = norm(texto + " " + ([...historial].reverse().slice(1).find((x) => x.role === "user")?.content ?? ""));
      const area = nombres.find((n) => t.includes(norm(n).split(" ").pop() ?? norm(n)));
      if (!area) {
        return nombres.length
          ? `¿Qué área te interesa? Tenemos: ${nombres.join(", ")}.`
          : "El condominio todavía no tiene áreas comunes cargadas en la app.";
      }
      if (!fecha) return `¿Para qué día quieres ${conArticulo(area)}? Puedes decirme "el sábado" o "15 de octubre".`;
      const d = await q.disponibilidad(area, fecha);
      if (!d.encontrada) return "No encontré esa área.";
      if (d.bloques_ocupados.length === 0) {
        return `${cap(conArticulo(d.area))} está libre todo el ${fechaLarga(fecha)}. Puedes reservarlo en la sección Reservas.`;
      }
      return `${cap(conArticulo(d.area))} el ${fechaLarga(fecha)} está ocupado de ${d.bloques_ocupados
        .map((b) => `${b.desde} a ${b.hasta}`)
        .join(", ")}. El resto del día está libre; se reserva en la sección Reservas.`;
    }

    case "areas": {
      const a = await q.areasComunes();
      if (a.areas.length === 0) return "El condominio todavía no tiene áreas comunes cargadas en la app.";
      const lineas = ["Áreas comunes del condominio:"];
      for (const x of a.areas) {
        const pol: string[] = [];
        if (x.capacity) pol.push(`hasta ${x.capacity} personas`);
        if (x.max_duration_hours) pol.push(`máx. ${x.max_duration_hours} h por reserva`);
        if (x.min_advance_hours) pol.push(`reservar con ${x.min_advance_hours} h de anticipación`);
        lineas.push(`• ${x.name}${pol.length ? ` (${pol.join(", ")})` : ""}${x.rules ? `. ${x.rules}` : ""}`);
      }
      lineas.push("Para saber si están libres, pregúntame por ejemplo: «¿está libre el caney el sábado?»");
      return lineas.join("\n");
    }

    case "contacto": {
      const c = await q.condominio();
      const datos = [
        c.telefono && `Teléfono: ${c.telefono}`,
        c.correo && `Correo: ${c.correo}`,
        c.horario && `Horario: ${c.horario}`,
      ].filter(Boolean);
      if (datos.length === 0) return "La administración todavía no cargó sus datos de contacto en la app.";
      return `Administración de ${c.condominio}:\n${datos.map((d) => `• ${d}`).join("\n")}`;
    }

    case "normas": {
      const c = await q.condominio();
      if (!c.notas_de_la_junta) return "La junta todavía no cargó normas en la app. Consulta con la administración.";
      const t = norm(texto);
      const parrafos = c.notas_de_la_junta.split(/\n+/).map((p) => p.trim()).filter(Boolean);
      const claves = t.split(/\s+/).filter((w) => w.length > 4);
      const relevantes = parrafos.filter((p) => claves.some((k) => norm(p).includes(k)));
      return `Según las normas de la junta:\n${(relevantes.length ? relevantes : parrafos).slice(0, 5).map((p) => `• ${p.replace(/^[-•]\s*/, "")}`).join("\n")}`;
    }

    case "comunicados": {
      const c = await q.comunicados();
      if (c.comunicados.length === 0) return "No hay comunicados recientes.";
      const lineas = ["Últimos comunicados:"];
      for (const a of c.comunicados.slice(0, 3)) {
        lineas.push(`• ${a.titulo} (${new Date(a.publicado).toLocaleDateString("es-VE")}): ${a.contenido.slice(0, 220)}${a.contenido.length > 220 ? "…" : ""}`);
      }
      return lineas.join("\n");
    }

    case "alicuota": {
      const u = await q.miUnidad();
      if (u.unidades.length === 0) return "No estás vinculado a ninguna unidad.";
      const lineas = u.unidades.map(
        (x) =>
          `• ${x.unidad}: alícuota ${x.alicuota_pct === null ? "sin cargar" : `${x.alicuota_pct.toLocaleString("es-VE", { maximumFractionDigits: 5 })} %`} (eres ${x.tu_rol})`,
      );
      return `${lineas.join("\n")}\nLa alícuota es tu porcentaje del gasto común, según el documento de condominio: la cuota del mes es ese porcentaje del gasto total.`;
    }

    case "tasa": {
      const t = await q.tasaBcv();
      return t
        ? `La tasa BCV del ${fechaLarga(t.fecha)} es ${bs(t.bs_por_usd)} por dólar.`
        : "Todavía no hay tasa BCV registrada.";
    }

    case "mantenimiento": {
      const m = await q.misSolicitudes();
      const lineas = ["Para reportar un problema, entra en la sección Mantenimiento: título, descripción y fotos."];
      if (m.solicitudes.length) {
        lineas.push("Tus solicitudes:");
        for (const s of m.solicitudes.slice(0, 4)) lineas.push(`• ${s.titulo}: ${s.estado}`);
      }
      return lineas.join("\n");
    }
  }
}
