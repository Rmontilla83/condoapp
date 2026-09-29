import { NextResponse, type NextRequest } from "next/server";
import { casetaPorToken, COOKIE_CASETA, DURACION_COOKIE_S } from "@/lib/caseta";

// GET /caseta/[token]
//
// El enlace que la administración le da a la garita. Si el token es de una caseta
// activa, deja la cookie y manda a /caseta; el token no queda en la barra de
// direcciones ni en el historial de la pantalla que el vigilante usa todo el día.
export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const caseta = await casetaPorToken(token);
  const destino = new URL(caseta ? "/caseta" : "/caseta?enlace=invalido", request.url);
  const res = NextResponse.redirect(destino);
  if (caseta) {
    res.cookies.set(COOKIE_CASETA, token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: DURACION_COOKIE_S,
    });
  }
  return res;
}
