"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AtryumLogo } from "@/components/brand/atryum-logo";

export default function JoinPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace("/login");
        return;
      }
      setUserEmail(data.user.email ?? null);
    });
  }, [router]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);
    const rawCode = (form.get("code") as string) ?? "";
    const code = rawCode.trim().toUpperCase();

    if (!code) {
      setError("Ingresa tu código de acceso");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { data, error: rpcError } = await supabase.rpc("redeem_access_code", {
      p_code: code,
    });

    if (rpcError) {
      setError(rpcError.message);
      setLoading(false);
      return;
    }

    const result = data as { ok: boolean; error?: string };
    if (!result?.ok) {
      const errorMap: Record<string, string> = {
        code_not_found: "Código no válido. Verifica con tu administrador.",
        code_already_used: "Este código ya fue canjeado.",
        code_revoked: "Este código fue cancelado. Pide uno nuevo.",
        code_expired: "Este código expiró. Pide uno nuevo.",
        not_authenticated: "Inicia sesión primero.",
      };
      setError(errorMap[result?.error ?? ""] ?? "No pudimos validar el código.");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    window.location.reload();
  }

  return (
    <div className="min-h-screen flex flex-col bg-frost">
      <header className="px-6 py-6 md:px-10 md:py-8">
        <AtryumLogo variant="horizontal" tone="color" className="text-[22px]" />
      </header>

      <main className="flex-1 flex items-center justify-center px-5 pb-12">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <span className="font-meta-loose text-cyan">CÓDIGO DE ACCESO</span>
            <h1 className="mt-5 font-display text-[clamp(1.75rem,4vw,2.5rem)] leading-[1.1] tracking-[-0.03em] text-marine-deep">
              Canjea tu <em className="font-editorial text-cyan">código</em>.
            </h1>
            <p className="mt-3 text-[15px] text-mute leading-relaxed">
              Tu administrador o propietario te lo envió por WhatsApp o te lo entregó impreso.
            </p>
            {userEmail && (
              <p className="mt-4 font-meta text-mute">
                SESIÓN · {userEmail.toUpperCase()}
              </p>
            )}
          </div>

          <div className="bg-card rounded-2xl border border-border p-6 md:p-7">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="code" className="font-meta text-mute">CÓDIGO</Label>
                <Input
                  id="code"
                  name="code"
                  placeholder="ABC1-2026-X7K2"
                  className="h-12 text-center text-[18px] font-mono font-medium tracking-[0.2em] uppercase"
                  maxLength={24}
                  autoFocus
                  required
                />
              </div>
              {error && <p className="text-[13px] text-destructive text-center">{error}</p>}
              <Button type="submit" className="w-full h-11" disabled={loading}>
                {loading ? "Verificando..." : "Canjear y acceder"}
              </Button>
              <p className="text-center font-meta text-mute">
                ¿SIN CÓDIGO? PÍDELE A TU ADMIN QUE TE INVITE POR EMAIL
              </p>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
