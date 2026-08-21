/**
 * Plantillas de correo.
 *
 * HTML con estilos en línea y tabla de una columna: es lo único que renderiza
 * igual en Gmail, Outlook y el cliente del iPhone. Sin imágenes externas —
 * muchos clientes las bloquean por defecto y el correo llegaría descabezado.
 *
 * Paleta Atryum V3: marine #1E4D8F, marine-deep #0F2E5A, cyan #2FB4E6,
 * ember #E8732C. Para texto sobre fondo claro se usan las variantes oscuras
 * (#17738F / #B4530F), por el mismo motivo de contraste que en la app.
 */

function portalUrl(): string {
  return (
    process.env.NEXT_PUBLIC_PORTAL_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "https://portal.atryum.net"
  );
}

function escapar(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

interface LayoutParams {
  condominio: string;
  /** Etiqueta pequeña arriba del título. */
  eyebrow: string;
  titulo: string;
  /** Párrafos del cuerpo. Se escapan. */
  parrafos: string[];
  /** Bloque destacado opcional (monto, motivo del rechazo, etc.). */
  destacado?: { etiqueta: string; valor: string; tono?: "neutro" | "alerta" };
  cta?: { texto: string; href: string };
  /** Cierre en letra chica. */
  pie?: string;
}

export function layout({
  condominio,
  eyebrow,
  titulo,
  parrafos,
  destacado,
  cta,
  pie,
}: LayoutParams): string {
  const colorDestacado = destacado?.tono === "alerta" ? "#B4530F" : "#0F2E5A";
  const bordeDestacado = destacado?.tono === "alerta" ? "#E8732C" : "#D6DEE9";
  const fondoDestacado = destacado?.tono === "alerta" ? "#FDF1E8" : "#F4F7FB";

  return `<!doctype html>
<html lang="es">
<body style="margin:0;padding:0;background:#F4F7FB;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F7FB;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border:1px solid #D6DEE9;border-radius:14px;overflow:hidden;">

        <tr><td style="padding:22px 28px 0;">
          <p style="margin:0;font:700 13px/1 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;letter-spacing:.16em;color:#1E4D8F;">ATRYUM</p>
          <p style="margin:6px 0 0;font:400 13px/1.4 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#5D6E86;">${escapar(condominio)}</p>
        </td></tr>

        <tr><td style="padding:22px 28px 0;">
          <p style="margin:0;font:700 11px/1.4 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#17738F;">${escapar(eyebrow)}</p>
          <h1 style="margin:10px 0 0;font:700 23px/1.25 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;letter-spacing:-.02em;color:#0F2E5A;">${escapar(titulo)}</h1>
        </td></tr>

        <tr><td style="padding:16px 28px 0;">
          ${parrafos
            .map(
              (p) =>
                `<p style="margin:0 0 12px;font:400 15px/1.6 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#2C3E57;">${escapar(p)}</p>`,
            )
            .join("")}
        </td></tr>

        ${
          destacado
            ? `<tr><td style="padding:6px 28px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${fondoDestacado};border:1px solid ${bordeDestacado};border-radius:10px;">
            <tr><td style="padding:14px 16px;">
              <p style="margin:0;font:700 11px/1.4 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#5D6E86;">${escapar(destacado.etiqueta)}</p>
              <p style="margin:6px 0 0;font:700 19px/1.35 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:${colorDestacado};">${escapar(destacado.valor)}</p>
            </td></tr>
          </table>
        </td></tr>`
            : ""
        }

        ${
          cta
            ? `<tr><td style="padding:22px 28px 0;">
          <a href="${escapar(cta.href)}" style="display:inline-block;background:#1E4D8F;color:#FFFFFF;text-decoration:none;padding:12px 22px;border-radius:9px;font:600 15px/1 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">${escapar(cta.texto)}</a>
        </td></tr>`
            : ""
        }

        <tr><td style="padding:24px 28px 26px;">
          ${
            pie
              ? `<p style="margin:0 0 12px;font:400 13px/1.55 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#5D6E86;">${escapar(pie)}</p>`
              : ""
          }
          <p style="margin:0;padding-top:14px;border-top:1px solid #EAEEF4;font:400 12px/1.5 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#5D6E86;">
            Este correo lo envía Atryum, la plataforma que usa ${escapar(condominio)} para su administración.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/* ═══════════════════════════════════════════════════════════════════
   Los cuatro eventos
   ═══════════════════════════════════════════════════════════════════ */

export function pagoAprobado(p: {
  condominio: string;
  concepto: string;
  monto: string;
  unidad: string;
}) {
  return {
    asunto: `Tu pago de ${p.concepto} fue aprobado`,
    html: layout({
      condominio: p.condominio,
      eyebrow: "Pago aprobado",
      titulo: "Listo, tu pago quedó registrado",
      parrafos: [
        `La administración confirmó el pago de ${p.concepto} correspondiente al ${p.unidad}.`,
        "Ya puedes descargar tu constancia desde la app, por si la necesitas más adelante.",
      ],
      destacado: { etiqueta: "Monto aprobado", valor: p.monto },
      cta: { texto: "Ver mis pagos", href: `${portalUrl()}/pagos` },
    }),
  };
}

export function pagoRechazado(p: {
  condominio: string;
  concepto: string;
  monto: string;
  motivo: string;
}) {
  return {
    asunto: `Tu comprobante de ${p.concepto} necesita una corrección`,
    html: layout({
      condominio: p.condominio,
      eyebrow: "Comprobante rechazado",
      titulo: "Necesitamos que revises algo de tu pago",
      parrafos: [
        `La administración revisó el comprobante que subiste para ${p.concepto} y no pudo darlo por confirmado todavía.`,
        "No es nada grave: la cuota vuelve a quedar pendiente y puedes volver a registrarla desde la app corrigiendo lo que aparece abajo.",
      ],
      destacado: { etiqueta: "Qué hay que corregir", valor: p.motivo, tono: "alerta" },
      cta: { texto: "Volver a registrar el pago", href: `${portalUrl()}/pagos` },
      pie: `Monto del comprobante: ${p.monto}. Si crees que hay un error, habla con la administración de ${p.condominio}.`,
    }),
  };
}

export function comunicadoUrgente(p: {
  condominio: string;
  titulo: string;
  contenido: string;
}) {
  const resumen =
    p.contenido.length > 400 ? `${p.contenido.slice(0, 400).trimEnd()}…` : p.contenido;
  return {
    asunto: `Urgente · ${p.titulo}`,
    html: layout({
      condominio: p.condominio,
      eyebrow: "Comunicado urgente",
      titulo: p.titulo,
      parrafos: [resumen],
      cta: { texto: "Leer el comunicado completo", href: `${portalUrl()}/comunicados` },
      pie: "Solo te escribimos por correo cuando el condominio marca un comunicado como urgente.",
    }),
  };
}

export function mantenimientoActualizado(p: {
  condominio: string;
  titulo: string;
  estado: string;
}) {
  return {
    asunto: `Tu reporte "${p.titulo}" pasó a ${p.estado.toLowerCase()}`,
    html: layout({
      condominio: p.condominio,
      eyebrow: "Mantenimiento",
      titulo: "Tu reporte avanzó",
      parrafos: [
        `El reporte que hiciste ("${p.titulo}") cambió de estado.`,
        "Puedes ver el detalle y el historial completo desde la app.",
      ],
      destacado: { etiqueta: "Nuevo estado", valor: p.estado },
      cta: { texto: "Ver el reporte", href: `${portalUrl()}/mantenimiento` },
    }),
  };
}

export function cuotaEmitida(p: {
  condominio: string;
  concepto: string;
  monto: string;
  vencimiento: string;
  /** Equivalente en bolívares a la tasa del día, si el condominio la maneja. */
  equivalenteBs?: string | null;
}) {
  return {
    // El monto y el vencimiento van en el ASUNTO: mucha gente decide si abre un
    // correo por el asunto, y esos son los dos datos que importan.
    asunto: `Nueva cuota: ${p.concepto} · ${p.monto} · vence ${p.vencimiento}`,
    html: layout({
      condominio: p.condominio,
      eyebrow: "Nueva cuota",
      titulo: p.concepto,
      parrafos: [
        `${p.condominio} emitió una nueva cuota para tu unidad.`,
        "En la app tienes los datos bancarios y el monto exacto para transferir, y ahí mismo registras el pago.",
      ],
      destacado: {
        etiqueta: `Monto · vence el ${p.vencimiento}`,
        valor: p.equivalenteBs ? `${p.monto}  ·  ${p.equivalenteBs}` : p.monto,
      },
      cta: { texto: "Ver y pagar", href: `${portalUrl()}/pagos` },
    }),
  };
}
