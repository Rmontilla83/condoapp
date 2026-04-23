"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ConfirmPage() {
  const [status, setStatus] = useState<"ready" | "loading" | "success" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const router = useRouter();
  const processingRef = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token_hash = params.get("token_hash");
    const code = params.get("code");

    if (token_hash || code) {
      setStatus("ready");
      return;
    }

    // Sin parámetros — verificar si ya hay sesión activa
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        router.push("/dashboard");
      } else {
        setStatus("error");
        setErrorMsg("Link inválido. Solicita un nuevo enlace desde la página de login.");
      }
    });
  }, [router]);

  async function handleConfirm() {
    if (processingRef.current) return;
    processingRef.current = true;
    setStatus("loading");

    const params = new URLSearchParams(window.location.search);
    const token_hash = params.get("token_hash");
    const type = params.get("type");
    const code = params.get("code");

    const supabase = createClient();

    const goToDashboard = () => {
      setStatus("success");
      setTimeout(() => router.push("/dashboard"), 400);
    };

    // Si después de un error hay sesión activa, es éxito real (token ya se consumió).
    const sessionIsAlive = async () => {
      const { data } = await supabase.auth.getSession();
      return !!data.session;
    };

    try {
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          if (await sessionIsAlive()) return goToDashboard();
          setStatus("error");
          setErrorMsg("Enlace expirado. Solicita uno nuevo desde la página de login.");
          return;
        }
        return goToDashboard();
      }

      if (token_hash) {
        const otpType =
          type === "signup" ? "signup" : type === "email" ? "email" : "magiclink";
        const { error } = await supabase.auth.verifyOtp({
          token_hash,
          type: otpType as "magiclink" | "signup" | "email",
        });
        if (error) {
          if (await sessionIsAlive()) return goToDashboard();
          setStatus("error");
          setErrorMsg("Enlace expirado. Solicita uno nuevo desde la página de login.");
          return;
        }
        return goToDashboard();
      }

      setStatus("error");
      setErrorMsg("No se pudo verificar el enlace.");
    } finally {
      // No resetear processingRef — un solo intento por render
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFBFC] p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-[#0F172A]">
            <svg
              viewBox="0 0 24 24"
              className="h-7 w-7 text-[#2DD4BF]"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <CardTitle style={{ fontFamily: "Outfit, sans-serif" }}>
            {status === "success"
              ? "Acceso confirmado"
              : status === "error"
                ? "Error"
                : "Confirma tu acceso"}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          {status === "ready" && (
            <>
              <p className="text-sm text-muted-foreground mb-6">
                Toca el botón para acceder a tu condominio.
              </p>
              <Button
                onClick={handleConfirm}
                size="lg"
                className="w-full text-base font-semibold"
                disabled={processingRef.current}
              >
                Acceder a Atryum
              </Button>
            </>
          )}

          {status === "loading" && (
            <div className="py-4">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="text-sm text-muted-foreground mt-3">Verificando...</p>
            </div>
          )}

          {status === "success" && (
            <div className="py-4">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                <svg
                  className="h-6 w-6 text-emerald-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2.5}
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <p className="text-sm text-muted-foreground">Redirigiendo al dashboard...</p>
            </div>
          )}

          {status === "error" && (
            <>
              <p className="text-sm text-destructive mb-4">{errorMsg}</p>
              <Button
                onClick={() => router.push("/login")}
                variant="outline"
                className="w-full"
              >
                Ir al login
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
