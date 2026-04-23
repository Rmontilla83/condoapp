"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
    // Intentar resolver invitación pendiente — el trigger debería haberlo hecho
    // en signup, pero ejecutamos la RPC de nuevo como defensa por si se perdió.
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
      <div className="flex min-h-screen items-center justify-center bg-[#FAFBFC] p-4">
        <p className="text-muted-foreground">Verificando acceso...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAFBFC] p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#0F172A]">
            <svg
              viewBox="0 0 24 24"
              className="h-6 w-6 text-[#2DD4BF]"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "Outfit, sans-serif" }}>
            Bienvenido a Atryum
          </h1>
          <p className="mt-1 text-muted-foreground text-sm">{userEmail}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>¿Cómo vas a acceder?</CardTitle>
            <CardDescription>
              El administrador de tu condominio te invitó por email o te dio un código. Elige la opción que aplique.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={() => router.push("/join")}
              className="w-full justify-start h-auto py-3"
              size="lg"
            >
              <div className="flex flex-col items-start">
                <span className="font-semibold">Tengo un código de acceso</span>
                <span className="text-xs opacity-80">Ej: ABC1-2026-X7K2</span>
              </div>
            </Button>

            <Button
              onClick={retryInvitations}
              variant="outline"
              className="w-full justify-start h-auto py-3"
              size="lg"
              disabled={retrying}
            >
              <div className="flex flex-col items-start">
                <span className="font-semibold">
                  {retrying ? "Buscando..." : "Fui invitado por email"}
                </span>
                <span className="text-xs opacity-80">
                  Revisa si hay una invitación pendiente para {userEmail}
                </span>
              </div>
            </Button>

            {errorMsg && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                {errorMsg} Pide al administrador que te genere un código o te reenvíe la invitación.
              </div>
            )}

            <p className="text-xs text-muted-foreground text-center pt-2">
              Si nada aplica, contacta al administrador de tu condominio para que te invite.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
