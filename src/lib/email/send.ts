import { Resend } from "resend";

/**
 * Envío de correo transaccional.
 *
 * Hasta ahora la app NO enviaba ningún correo fuera del magic link de Supabase
 * Auth: todo el ciclo operativo dependía de que el residente se acordara de
 * entrar a mirar. Ahí es donde el condominio vuelve al grupo de WhatsApp, que
 * es justo lo que Atryum vende que resuelve.
 *
 * Reglas de esta capa:
 *  1. **Nunca tumba la acción que la llamó.** Un fallo de correo no puede hacer
 *     que un pago no se apruebe. Todo error se registra y se sigue.
 *  2. **Degrada sin romper si no hay API key.** El código puede desplegarse
 *     antes de que exista `RESEND_API_KEY`; simplemente no envía.
 *  3. **Nunca envía a una dirección vacía**, y deduplica destinatarios.
 */

const FROM = "Atryum <hola@atryum.net>";

/** Cliente perezoso: sin key, no se construye y el módulo no explota al importarse. */
let cliente: Resend | null = null;
function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (!cliente) cliente = new Resend(key);
  return cliente;
}

export function emailHabilitado(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export interface EnvioResultado {
  enviados: number;
  omitidos: number;
  error?: string;
}

/**
 * Manda un correo a uno o varios destinatarios.
 *
 * Usa `to` individual por destinatario y no una lista, para que nadie vea el
 * correo de sus vecinos.
 */
export async function enviarEmail(params: {
  para: Array<string | null | undefined>;
  asunto: string;
  html: string;
  /** Para el log: qué evento lo disparó. */
  evento: string;
}): Promise<EnvioResultado> {
  const destinatarios = [
    ...new Set(
      params.para
        .filter((e): e is string => Boolean(e && e.includes("@")))
        .map((e) => e.trim().toLowerCase()),
    ),
  ];

  if (destinatarios.length === 0) {
    return { enviados: 0, omitidos: 0 };
  }

  const resend = getResend();
  if (!resend) {
    console.warn(
      `[email] ${params.evento}: RESEND_API_KEY no está configurada, se omiten ${destinatarios.length} envío(s).`,
    );
    return { enviados: 0, omitidos: destinatarios.length };
  }

  try {
    // Un envío por destinatario: nadie ve la dirección de sus vecinos.
    // sendBatch acepta hasta 100 por llamada.
    const lotes: (typeof destinatarios)[] = [];
    for (let i = 0; i < destinatarios.length; i += 100) {
      lotes.push(destinatarios.slice(i, i + 100));
    }

    let enviados = 0;
    let fallidos = 0;
    let ultimoError: string | undefined;
    for (const [i, lote] of lotes.entries()) {
      if (i > 0) await new Promise((r) => setTimeout(r, 600));
      const { error } = await resend.batch.send(
        lote.map((to) => ({
          from: FROM,
          to,
          subject: params.asunto,
          html: params.html,
        })),
      );
      if (error) {
        console.error(`[email] ${params.evento}: falló un lote de ${lote.length}:`, error.message);
        fallidos += lote.length;
        ultimoError = error.message;
        continue;
      }
      enviados += lote.length;
    }

    return { enviados, omitidos: fallidos, error: ultimoError };
  } catch (e) {
    // Bajo ninguna circunstancia el correo tumba la operación de negocio.
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[email] ${params.evento}: excepción:`, msg);
    return { enviados: 0, omitidos: destinatarios.length, error: msg };
  }
}

/**
 * Manda N mensajes DISTINTOS (uno por destinatario) en el menor número de
 * llamadas posible.
 *
 * Emitir las cuotas de un condominio de 40 unidades con `enviarEmail` en un for
 * hacía 40 llamadas HTTP secuenciales dentro de una server action: suficiente
 * para agotar el tiempo de una función serverless, y para chocar contra el
 * límite de peticiones de Resend. `batch.send` acepta hasta 100 mensajes
 * distintos por llamada.
 */
export async function enviarLote(
  mensajes: Array<{ para: string; asunto: string; html: string }>,
  evento: string,
): Promise<EnvioResultado> {
  const validos = mensajes.filter((m) => m.para && m.para.includes("@"));
  if (validos.length === 0) return { enviados: 0, omitidos: 0 };

  const resend = getResend();
  if (!resend) {
    console.warn(
      `[email] ${evento}: RESEND_API_KEY no está configurada, se omiten ${validos.length} envío(s).`,
    );
    return { enviados: 0, omitidos: validos.length };
  }

  let enviados = 0;
  let fallidos = 0;
  let ultimoError: string | undefined;
  try {
    for (let i = 0; i < validos.length; i += 100) {
      // Resend limita a 2 peticiones por segundo. Con más de un lote hay que
      // espaciarlas o el segundo vuelve con 429.
      if (i > 0) await new Promise((r) => setTimeout(r, 600));
      const lote = validos.slice(i, i + 100);
      const { error } = await resend.batch.send(
        lote.map((m) => ({
          from: FROM,
          to: m.para,
          subject: m.asunto,
          html: m.html,
        })),
      );
      if (error) {
        // `continue`, no `return`: que el lote 2 falle no puede dejar sin el
        // comunicado urgente a las 150 personas del lote 3.
        console.error(`[email] ${evento}: falló un lote de ${lote.length}:`, error.message);
        ultimoError = error.message;
        fallidos += lote.length;
        continue;
      }
      enviados += lote.length;
    }
    return { enviados, omitidos: fallidos, error: ultimoError };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[email] ${evento}: excepción:`, msg);
    return { enviados, omitidos: validos.length - enviados, error: msg };
  }
}
