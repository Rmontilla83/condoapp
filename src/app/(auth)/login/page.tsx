"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <svg className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3H21m-3.75 3H21" />
            </svg>
          </div>
          <CardTitle className="text-2xl">Atryum</CardTitle>
          <CardDescription className="text-base">
            {stage === "email"
              ? "Ingresa tu correo para recibir tu código de acceso."
              : `Enviamos un código de 6 dígitos a ${email}.`}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {stage === "email" && (
            <>
              <form onSubmit={handleRequest} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Correo electrónico</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="tu@correo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                    autoComplete="email"
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Enviando..." : "Enviar código"}
                </Button>
              </form>
              <p className="mt-6 text-center text-xs text-muted-foreground">
                Te enviaremos un código seguro. Sin contraseñas.
              </p>
            </>
          )}

          {(stage === "otp" || stage === "verifying") && (
            <>
              <form onSubmit={handleVerify} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="otp">Código de 6 dígitos</Label>
                  <Input
                    ref={otpInputRef}
                    id="otp"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="one-time-code"
                    maxLength={6}
                    placeholder="123456"
                    value={token}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/\D/g, "").slice(0, 6);
                      setToken(clean);
                    }}
                    className="text-center text-2xl tracking-[0.5em] font-mono"
                    required
                    disabled={loading}
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" className="w-full" disabled={loading || token.length !== 6}>
                  {stage === "verifying" ? "Verificando..." : "Verificar código"}
                </Button>
              </form>

              <div className="mt-6 space-y-2 text-center text-xs text-muted-foreground">
                <p>
                  También puedes hacer clic en el enlace del correo si lo abres en este mismo dispositivo.
                </p>
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={cooldown > 0 || loading}
                    className="underline underline-offset-2 hover:text-foreground disabled:opacity-50 disabled:no-underline"
                  >
                    {cooldown > 0 ? `Reenviar en ${cooldown}s` : "Reenviar código"}
                  </button>
                  <span aria-hidden="true">·</span>
                  <button
                    type="button"
                    onClick={resetToEmail}
                    disabled={loading}
                    className="underline underline-offset-2 hover:text-foreground disabled:opacity-50"
                  >
                    Usar otro correo
                  </button>
                </div>
              </div>
            </>
          )}

          {stage === "success" && (
            <div className="py-4 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <p className="text-sm text-muted-foreground">Redirigiendo al dashboard...</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
