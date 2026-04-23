"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { AtryumLogo } from "@/components/brand/atryum-logo";

// Onboarding simple para usuarios logueados sin organization_id.
// NO pedimos invite_code ni selector de unidad (eso es inseguro).
// Dos caminos: canjear código físico o volver a pedir invitación al admin.
// Si hay admin_invitations o unit_invitations pendientes, el trigger/RPC
// las resuelve automáticamente — este componente solo aparece si nada
// de eso aplicó (por ej. el usuario se logueó por su cuenta sin invite).

export function Onboarding({ userEmail }: { userEmail: string }) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    async function tryResolve() {
      const [adminRes, unitRes] = await Promise.all([
        supabase.rpc("accept_admin_invitation"),
        supabase.rpc("accept_unit_invitation"),
      ]);

      const adminOk = (adminRes.data as { ok?: boolean } | null)?.ok === true;
      const unitOk = (unitRes.data as { ok?: boolean } | null)?.ok === true;

      if (adminOk || unitOk) {
        router.refresh();
        return;
      }

      setChecking(false);
    }

    tryResolve();
  }, [router]);

  async function retryInvitations() {
    setRetrying(true);
    setErrorMsg(null);
    const supabase = createClient();
    const [adminRes, unitRes] = await Promise.all([
      supabase.rpc("accept_admin_invitation"),
      supabase.rpc("accept_unit_invitation"),
    ]);

    const adminOk = (adminRes.data as { ok?: boolean } | null)?.ok === true;
    const unitOk = (unitRes.data as { ok?: boolean } | null)?.ok === true;

    if (adminOk || unitOk) {
      router.refresh();
      return;
    }

    setErrorMsg("No encontramos una invitación pendiente para tu email.");
    setRetrying(false);
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-frost">
        <p className="font-meta text-mute">VERIFICANDO ACCESO...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-frost">
      <header className="px-6 py-6 md:px-10 md:py-8">
        <AtryumLogo variant="horizontal" tone="marine-deep" className="h-6" />
      </header>

      <main className="flex-1 flex items-center justify-center px-5 pb-12">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <span className="font-meta-loose text-cyan">PRIMER ACCESO</span>
            <h1 className="mt-5 font-display text-[clamp(1.75rem,4vw,2.5rem)] leading-[1.1] tracking-[-0.03em] text-marine-deep">
              Bienvenido a <em className="font-editorial text-cyan">Atryum</em>.
            </h1>
            <p className="mt-3 text-[15px] text-mute leading-relaxed">
              El administrador de tu condominio te invitó por email o te dio un código.
              Elige la opción que aplique.
            </p>
            <p className="mt-4 font-meta text-mute">
              SESIÓN · {userEmail.toUpperCase()}
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => router.push("/join")}
              className="group w-full rounded-2xl bg-card border border-border p-5 text-left hover:border-marine/40 transition-colors btn-press"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[15px] font-medium text-marine-deep">Tengo un código</p>
                  <p className="mt-1 font-meta text-mute">EJ: ABC1-2026-X7K2</p>
                </div>
                <svg className="h-4 w-4 text-mute group-hover:text-marine-deep transition-colors" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </div>
            </button>

            <button
              onClick={retryInvitations}
              disabled={retrying}
              className="group w-full rounded-2xl bg-card border border-border p-5 text-left hover:border-marine/40 transition-colors btn-press disabled:opacity-60"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[15px] font-medium text-marine-deep">
                    {retrying ? "Buscando..." : "Fui invitado por email"}
                  </p>
                  <p className="mt-1 font-meta text-mute">
                    REVISAR INVITACIONES PENDIENTES
                  </p>
                </div>
                <svg className="h-4 w-4 text-mute group-hover:text-marine-deep transition-colors" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </div>
            </button>

            {errorMsg && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
                <p className="text-[13px] text-destructive">
                  {errorMsg} Pide al administrador que te genere un código o te reenvíe la invitación.
                </p>
              </div>
            )}
          </div>

          <div className="mt-8 pt-6 border-t border-border text-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                const supabase = createClient();
                await supabase.auth.signOut();
                router.push("/login");
              }}
              className="text-[13px] text-mute hover:text-marine-deep"
            >
              Cerrar sesión
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
