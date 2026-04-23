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
const LAST_EMAIL_KEY = "atryum:lastEmail";

export default function LoginPage() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("email");
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [error, setError] = useState(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      return params.get("error") ? decodeURIComponent(params.get("error")!) : "";
    }
    return "";
  });
  const [cooldown, setCooldown] = useState(0);
  const otpInputRef = useRef<HTMLInputElement>(null);
  const emailInOtpRef = useRef<HTMLInputElement>(null);

  // Precargar último email usado
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem(LAST_EMAIL_KEY);
    if (saved) setEmail(saved);
  }, []);

  useEffect(() => {
    if (stage === "otp") {
      // Si ya hay email, focus al OTP. Si no, al email.
      if (email) {
        otpInputRef.current?.focus();
      } else {
        emailInOtpRef.current?.focus();
      }
    }
  }, [stage, email]);

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
    if (!email) return;
    setLoading(true);
    setError("");

    const sendError = await sendCode(email);

    if (sendError) {
      setError("No pudimos enviar el código. Intenta de nuevo en unos minutos.");
      setLoading(false);
      return;
    }

    localStorage.setItem(LAST_EMAIL_KEY, email);
    setStage("otp");
    setCodeSent(true);
    setCooldown(RESEND_COOLDOWN_SECONDS);
    setLoading(false);
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!email || token.length < 6) return;

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
      setError("Código inválido o expirado. Revisa los dígitos o solicita uno nuevo.");
      setStage("otp");
      setLoading(false);
      return;
    }

    localStorage.setItem(LAST_EMAIL_KEY, email);
    setStage("success");
    router.push("/dashboard");
  }

  async function handleResend() {
    if (cooldown > 0 || loading || !email) return;
    setLoading(true);
    setError("");
    const sendError = await sendCode(email);
    if (sendError) {
      setError("No pudimos reenviar el código. Intenta de nuevo en unos minutos.");
    } else {
      setCodeSent(true);
      setCooldown(RESEND_COOLDOWN_SECONDS);
    }
    setLoading(false);
  }

  function resetToEmail() {
    setStage("email");
    setToken("");
    setError("");
    setCooldown(0);
    setCodeSent(false);
  }

  function jumpToOtp() {
    setStage("otp");
    setError("");
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
              {stage === "success" ? (
                <>
                  Acceso <em className="font-editorial text-steel">confirmado</em>.
                </>
              ) : stage === "otp" || stage === "verifying" ? (
                <>
                  Pega tu <em className="font-editorial text-steel">código</em>.
                </>
              ) : (
                <>
                  Entra a tu{" "}
                  <em className="font-editorial text-steel">condominio</em>.
                </>
              )}
            </h1>
            <p className="mt-3 text-[15px] text-mute leading-relaxed">
              {stage === "email"
                ? "Te enviamos un código por correo. Sin contraseñas, sin complicaciones."
                : codeSent
                ? `Enviamos un código a ${email}.`
                : "Si ya pediste un código, pégalo aquí."}
            </p>
          </div>

          <div className="bg-card rounded-2xl border border-border p-6 md:p-7">
            {stage === "email" && (
              <>
                <form onSubmit={handleRequest} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="font-meta text-mute">
                      CORREO ELECTRÓNICO
                    </Label>
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
                  {error && <p className="text-[13px] text-destructive">{error}</p>}
                  <Button type="submit" className="w-full h-11" disabled={loading || !email}>
                    {loading ? "Enviando..." : "Enviar código"}
                  </Button>
                </form>

                <div className="mt-5 pt-5 border-t border-border text-center">
                  <button
                    type="button"
                    onClick={jumpToOtp}
                    className="font-meta text-steel hover:text-ink transition-colors"
                  >
                    YA TENGO UN CÓDIGO →
                  </button>
                </div>
              </>
            )}

            {(stage === "otp" || stage === "verifying") && (
              <>
                <form onSubmit={handleVerify} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="email-otp" className="font-meta text-mute">
                      CORREO
                    </Label>
                    <Input
                      ref={emailInOtpRef}
                      id="email-otp"
                      type="email"
                      placeholder="tu@correo.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      disabled={loading}
                      className="h-11 text-[15px]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="otp" className="font-meta text-mute">
                      CÓDIGO DEL CORREO
                    </Label>
                    <Input
                      ref={otpInputRef}
                      id="otp"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      autoComplete="one-time-code"
                      maxLength={10}
                      placeholder="········"
                      value={token}
                      onChange={(e) => {
                        const clean = e.target.value.replace(/\D/g, "").slice(0, 10);
                        setToken(clean);
                      }}
                      className="h-14 text-center text-[26px] tracking-[0.35em] font-mono font-medium"
                      required
                      disabled={loading}
                    />
                  </div>
                  {error && <p className="text-[13px] text-destructive">{error}</p>}
                  <Button
                    type="submit"
                    className="w-full h-11"
                    disabled={loading || !email || token.length < 6}
                  >
                    {stage === "verifying" ? "Verificando..." : "Verificar y entrar"}
                  </Button>
                </form>

                <div className="mt-6 pt-5 border-t border-border space-y-3 text-center">
                  <p className="text-[12px] text-mute leading-relaxed">
                    {codeSent
                      ? "También puedes hacer clic en el enlace del correo si lo abres en este mismo dispositivo."
                      : "Si aún no tienes código, pide uno nuevo."}
                  </p>
                  <div className="flex items-center justify-center gap-4 font-meta flex-wrap">
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={cooldown > 0 || loading || !email}
                      className="text-steel hover:text-ink transition-colors disabled:opacity-40"
                    >
                      {cooldown > 0
                        ? `REENVIAR · ${cooldown}s`
                        : codeSent
                        ? "REENVIAR CÓDIGO"
                        : "ENVIAR CÓDIGO"}
                    </button>
                    <span className="text-mute/40" aria-hidden="true">·</span>
                    <button
                      type="button"
                      onClick={resetToEmail}
                      disabled={loading}
                      className="text-steel hover:text-ink transition-colors disabled:opacity-40"
                    >
                      VOLVER
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
