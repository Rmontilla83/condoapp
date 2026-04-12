import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin, hash } = new URL(request.url);
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as "email" | "magiclink" | "signup" | null;
  const next = searchParams.get("next") ?? "/dashboard";
  const error_param = searchParams.get("error");

  // If Supabase returned an error
  if (error_param) {
    return NextResponse.redirect(`${origin}/login?error=${error_param}`);
  }

  const response = NextResponse.redirect(`${origin}${next}`);

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

  // Handle PKCE flow (code parameter)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(`${origin}/login?error=auth`);
    }
    return response;
  }

  // Handle token hash flow (magic link with token_hash)
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type === "email" ? "email" : "magiclink",
    });
    if (error) {
      return NextResponse.redirect(`${origin}/login?error=auth`);
    }
    return response;
  }

  // No code or token_hash — redirect to login
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
