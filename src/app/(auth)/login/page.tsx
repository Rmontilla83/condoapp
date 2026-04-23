"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AtryumLogo } from "@/components/brand/atryum-logo";

type Stage = "email" | "otp" | "verifying" | "success";

const RESEND_COOLDOWN_SECONDS = 45;

export default function LoginPage() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("email");
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      return params.get("error") ? decodeURIComponent(params.get("error")!) : "";
    }
    return "";
  });
  const [cooldown, setCooldown] = useState(0);
  const otpInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (stage === "otp") {
      otpInputRef.current?.focus();
    }
  }, [stage]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function sendCode(targetEmail: string) {
    const supabase = createClient();
    const { error: sendError } = await supabase.auth.signInWithOtp({
      email: targetEmail,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
      },
    });
    return sendError;
  }

  async function handleRequest(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const sendError = await sendCode(email);

    if (sendError) {
      setError("No pudimos enviar el código. Intenta de nuevo en unos minutos.");
      setLoading(false);
      return;
    }

    setStage("otp");
    setCooldown(RESEND_COOLDOWN_SECONDS);
    setLoading(false);
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (token.length !== 6) return;

    setLoading(true);
    setError("");
    setStage("verifying");

    const supabase = createClient();
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "email",
    });

    if (verifyError) {
      setError("Código inválido o expirado. Revisa los 6 dígitos o solicita uno nuevo.");
      setStage("otp");
      setLoading(false);
      return;
    }

    setStage("success");
    router.push("/dashboard");
  }

  async function handleResend() {
    if (cooldown > 0 || loading) return;
    setLoading(true);
    setError("");
    const sendError = await sendCode(email);
    if (sendError) {
      setError("No pudimos reenviar el código. Intenta de nuevo en unos minutos.");
    } else {
      setCooldown(RESEND_COOLDOWN_SECONDS);
    }
    setLoading(false);
  }

  function resetToEmail() {
    setStage("email");
    setToken("");
    setError("");
    setCooldown(0);
  }

  return (
    <div className="min-h-screen flex flex-col bg-bone">
      <header className="px-6 py-6 md:px-10 md:py-8">
        <AtryumLogo variant="horizontal" tone="ink" className="h-6" />
      </header>

      <main className="flex-1 flex items-center justify-center px-5 pb-12">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <span className="font-meta-loose text-steel">ACCESO · ATRYUM</span>
            <h1 className="mt-5 font-display text-[clamp(1.75rem,4vw,2.5rem)] leading-[1.1] tracking-[-0.03em] text-ink">
              {stage === "email" ? (
                <>
                  Entra a tu{" "}
                  <em className="font-editorial text-steel">condominio</em>.
                </>
              ) : stage === "success" ? (
                <>
                  Acceso <em className="font-editorial text-steel">confirmado</em>.
                </>
              ) : (
                <>
                  Revisa tu <em className="font-editorial text-steel">correo</em>.
                </>
              )}
            </h1>
            <p className="mt-3 text-[15px] text-mute leading-relaxed">
              {stage === "email"
                ? "Te enviamos un código de 6 dígitos. Sin contraseñas, sin complicaciones."
                : `Enviamos un código de 6 dígitos a ${email}.`}
            </p>
          </div>

          <div className="bg-card rounded-2xl border border-border p-6 md:p-7">
            {stage === "email" && (
              <form onSubmit={handleRequest} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="font-meta text-mute">CORREO ELECTRÓNICO</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="tu@correo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                    autoComplete="email"
                    className="h-11 text-[15px]"
                  />
                </div>
                {error && (
                  <p className="text-[13px] text-destructive">{error}</p>
                )}
                <Button type="submit" className="w-full h-11" disabled={loading}>
                  {loading ? "Enviando..." : "Enviar código"}
                </Button>
                <p className="text-center font-meta text-mute">
                  SIN CONTRASEÑA · CÓDIGO EXPIRA EN 1 HORA
                </p>
              </form>
            )}

            {(stage === "otp" || stage === "verifying") && (
              <>
                <form onSubmit={handleVerify} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="otp" className="font-meta text-mute">CÓDIGO DE 6 DÍGITOS</Label>
                    <Input
                      ref={otpInputRef}
                      id="otp"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      autoComplete="one-time-code"
                      maxLength={6}
                      placeholder="······"
                      value={token}
                      onChange={(e) => {
                        const clean = e.target.value.replace(/\D/g, "").slice(0, 6);
                        setToken(clean);
                      }}
                      className="h-14 text-center text-[28px] tracking-[0.5em] font-mono font-medium"
                      required
                      disabled={loading}
                    />
                  </div>
                  {error && (
                    <p className="text-[13px] text-destructive">{error}</p>
                  )}
                  <Button
                    type="submit"
                    className="w-full h-11"
                    disabled={loading || token.length !== 6}
                  >
                    {stage === "verifying" ? "Verificando..." : "Verificar código"}
                  </Button>
                </form>

                <div className="mt-6 pt-5 border-t border-border space-y-3 text-center">
                  <p className="text-[12px] text-mute leading-relaxed">
                    También puedes hacer clic en el enlace del correo si lo abres en este mismo dispositivo.
                  </p>
                  <div className="flex items-center justify-center gap-4 font-meta">
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={cooldown > 0 || loading}
                      className="text-steel hover:text-ink transition-colors disabled:opacity-40"
                    >
                      {cooldown > 0 ? `REENVIAR · ${cooldown}s` : "REENVIAR CÓDIGO"}
                    </button>
                    <span className="text-mute/40" aria-hidden="true">·</span>
                    <button
                      type="button"
                      onClick={resetToEmail}
                      disabled={loading}
                      className="text-steel hover:text-ink transition-colors disabled:opacity-40"
                    >
                      OTRO CORREO
                    </button>
                  </div>
                </div>
              </>
            )}

            {stage === "success" && (
              <div className="py-6 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-steel/10">
                  <svg className="h-6 w-6 text-steel" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>
                <p className="text-[14px] text-mute">Redirigiendo al dashboard...</p>
              </div>
            )}
          </div>

          <p className="mt-8 text-center font-editorial text-mute text-[15px]">
            Un átrium dentro de cada A.
          </p>
        </div>
      </main>
    </div>
  );
}
