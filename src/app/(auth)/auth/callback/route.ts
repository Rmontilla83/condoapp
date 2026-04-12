import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const token_hash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const next = url.searchParams.get("next") ?? "/dashboard";
  const error_param = url.searchParams.get("error");
  const error_description = url.searchParams.get("error_description");

  // If Supabase returned an error directly
  if (error_param) {
    const msg = encodeURIComponent(error_description || error_param);
    return NextResponse.redirect(`${url.origin}/login?error=${msg}`);
  }

  // No auth parameters at all
  if (!code && !token_hash) {
    return NextResponse.redirect(`${url.origin}/login?error=${encodeURIComponent("No se recibieron parametros de autenticacion. Solicita un nuevo enlace.")}`);
  }

  const response = NextResponse.redirect(`${url.origin}${next}`);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Try PKCE flow first (code parameter)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return response;
    // If code exchange fails, show specific error
    return NextResponse.redirect(`${url.origin}/login?error=${encodeURIComponent("Enlace expirado o ya utilizado. Solicita uno nuevo.")}`);
  }

  // Try token hash flow (magic link with token_hash)
  if (token_hash) {
    const otpType = type === "signup" ? "signup" : type === "email" ? "email" : "magiclink";
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: otpType,
    });
    if (!error) return response;
    return NextResponse.redirect(`${url.origin}/login?error=${encodeURIComponent("Enlace expirado o ya utilizado. Solicita uno nuevo.")}`);
  }

  return NextResponse.redirect(`${url.origin}/login?error=${encodeURIComponent("Error de autenticacion. Solicita un nuevo enlace.")}`);
}
