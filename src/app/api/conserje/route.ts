import { NextResponse, type NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { getCurrentProfile } from "@/lib/queries";
import { armarContexto, LIMITE_DIARIO, preguntasDeHoy, responder } from "@/lib/conserje/conserje";

// POST /api/conserje
//
// Recibe el historial de la conversación (solo texto, lo guarda el navegador) y
// devuelve la respuesta del conserje. Quién pregunta sale de la sesión, nunca
// del cuerpo: el cuerpo no trae ids de nada.
//
// El historial lo manda el cliente y por lo tanto es manipulable: alguien puede
// fabricar turnos "assistant". No importa para la privacidad — los datos solo
// salen de las herramientas, y las herramientas están atadas a la sesión — pero
// sí se acota el tamaño para que no se use como proxy barato a la API.
//
// Sin ANTHROPIC_API_KEY responde en modo demo (reglas, sin IA): ver demo.ts.

export const maxDuration = 60;

const Cuerpo = z.object({
  mensajes: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(2000),
      }),
    )
    .min(1)
    .max(20)
    .refine((m) => m[0].role === "user" && m[m.length - 1].role === "user", {
      message: "La conversación empieza y termina con el residente",
    })
    .refine((m) => m.every((t, i) => i === 0 || t.role !== m[i - 1].role), {
      message: "Los turnos se alternan",
    }),
});

export async function POST(request: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (!profile.organization_id) {
    return NextResponse.json({ error: "Sin condominio asignado" }, { status: 403 });
  }
  let cuerpo: z.infer<typeof Cuerpo>;
  try {
    const parsed = Cuerpo.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Mensaje inválido" }, { status: 400 });
    }
    cuerpo = parsed.data;
  } catch {
    return NextResponse.json({ error: "Mensaje inválido" }, { status: 400 });
  }

  if ((await preguntasDeHoy(profile.id)) >= LIMITE_DIARIO) {
    return NextResponse.json(
      { error: `Llegaste al límite de ${LIMITE_DIARIO} preguntas por día. Vuelve a intentarlo mañana.` },
      { status: 429 },
    );
  }

  try {
    const ctx = await armarContexto({ id: profile.id, organization_id: profile.organization_id });
    const { texto, modo } = await responder(ctx, profile.full_name ?? "", cuerpo.mensajes);
    return NextResponse.json({ respuesta: texto, modo });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) {
      return NextResponse.json(
        { error: "El conserje está atendiendo a mucha gente. Intenta en un minuto." },
        { status: 503 },
      );
    }
    if (e instanceof Anthropic.APIError) {
      console.error("[conserje] API", e.status, e.message);
    } else {
      console.error("[conserje]", e instanceof Error ? e.message : e);
    }
    return NextResponse.json(
      { error: "El conserje no pudo responder ahora. Intenta de nuevo en un momento." },
      { status: 500 },
    );
  }
}
