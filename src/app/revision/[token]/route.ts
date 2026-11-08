import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_REVISION, DURACION_COOKIE_S, revisionPorToken } from "@/lib/revision";

// GET /revision/[token]
//
// El enlace privado de la revisión. Si está activo, deja la cookie y manda a
// /revision: el token no se queda en la barra de direcciones. Una vista previa
// de WhatsApp puede abrirlo sin consecuencias, porque aquí no se gasta nada.
export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const revision = await revisionPorToken(token);
  const res = NextResponse.redirect(new URL(revision ? "/revision" : "/revision?enlace=invalido", request.url));
  if (revision) {
    res.cookies.set(COOKIE_REVISION, token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/revision",
      maxAge: DURACION_COOKIE_S,
    });
  }
  return res;
}
