"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
    router.refresh();
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
            Canjear código de acceso
          </h1>
          {userEmail && <p className="mt-1 text-muted-foreground text-sm">{userEmail}</p>}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Ingresa tu código</CardTitle>
            <CardDescription>
              El administrador o propietario te lo envió por WhatsApp o te lo entregó impreso.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">Código</Label>
                <Input
                  id="code"
                  name="code"
                  placeholder="Ej: ABC1-2026-X7K2"
                  className="text-center text-lg font-mono font-bold tracking-widest uppercase"
                  maxLength={24}
                  autoFocus
                  required
                />
              </div>
              {error && <p className="text-sm text-destructive text-center">{error}</p>}
              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? "Verificando..." : "Canjear y acceder"}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                ¿No tienes código? Pídele al administrador que te lo genere o invite por email.
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
