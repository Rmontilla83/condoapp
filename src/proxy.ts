import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const LANDING_APEX = "atryum.net";
const LANDING_WWW = "www.atryum.net";
const PORTAL_HOST = "portal.atryum.net";

export async function proxy(request: NextRequest) {
  const hostname = (request.headers.get("host") ?? "").toLowerCase();
  const { pathname, search } = request.nextUrl;

  // Preview deployments (*.vercel.app): comportarse como portal — landing en /
  // sin auth, resto pasa por updateSession. Sin esto el proxy fallthrough
  // intentaba updateSession en TODA la request y rompía el deploy preview
  // entero (atryum.net / portal.atryum.net no existen en preview).
  if (hostname.endsWith(".vercel.app")) {
    if (pathname === "/") return NextResponse.next();
    return await updateSession(request);
  }

  if (hostname === LANDING_WWW) {
    const url = request.nextUrl.clone();
    url.host = LANDING_APEX;
    url.protocol = "https:";
    url.port = "";
    return NextResponse.redirect(url, 301);
  }

  if (hostname === LANDING_APEX) {
    if (pathname === "/") {
      return NextResponse.next();
    }
    return NextResponse.redirect(
      new URL(`https://${PORTAL_HOST}${pathname}${search}`),
      302,
    );
  }

  if (hostname === PORTAL_HOST) {
    if (pathname === "/") {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    return await updateSession(request);
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|robots\\.txt|sitemap\\.xml|manifest\\.json|sw\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
