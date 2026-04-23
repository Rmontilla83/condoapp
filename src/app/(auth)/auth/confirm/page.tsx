"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AtryumLogo, AtryumSymbol } from "@/components/brand/atryum-logo";

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
      // intencional: un solo intento por render
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-bone">
      <header className="px-6 py-6 md:px-10 md:py-8">
        <AtryumLogo variant="horizontal" tone="ink" className="h-6" />
      </header>

      <main className="flex-1 flex items-center justify-center px-5 pb-12">
        <div className="w-full max-w-sm">
          <div className="bg-card rounded-2xl border border-border p-8 text-center">
            <AtryumSymbol tone="ink" className="h-10 w-10 mx-auto mb-5" />

            <h1 className="font-display text-[24px] leading-tight tracking-[-0.03em] text-ink">
              {status === "success" ? (
                <>Acceso <em className="font-editorial text-steel">confirmado</em></>
              ) : status === "error" ? (
                "No pudimos entrar"
              ) : (
                <>Confirma tu <em className="font-editorial text-steel">acceso</em></>
              )}
            </h1>

            <div className="mt-6">
              {status === "ready" && (
                <>
                  <p className="text-[14px] text-mute mb-6 leading-relaxed">
                    Toca el botón para acceder a tu condominio.
                  </p>
                  <Button
                    onClick={handleConfirm}
                    size="lg"
                    className="w-full h-11 text-[14px] font-medium"
                    disabled={processingRef.current}
                  >
                    Acceder a Atryum
                  </Button>
                </>
              )}

              {status === "loading" && (
                <div className="py-4">
                  <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-steel border-t-transparent" />
                  <p className="text-[13px] text-mute mt-4">Verificando...</p>
                </div>
              )}

              {status === "success" && (
                <div className="py-3">
                  <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-steel/10">
                    <svg className="h-5 w-5 text-steel" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </div>
                  <p className="text-[13px] text-mute">Redirigiendo al dashboard...</p>
                </div>
              )}

              {status === "error" && (
                <>
                  <p className="text-[13px] text-destructive mb-5">{errorMsg}</p>
                  <Button
                    onClick={() => router.push("/login")}
                    variant="outline"
                    className="w-full h-11"
                  >
                    Ir al login
                  </Button>
                </>
              )}
            </div>
          </div>

          <p className="mt-6 text-center font-editorial text-mute text-[14px]">
            Un átrium dentro de cada A.
          </p>
        </div>
      </main>
    </div>
  );
}
