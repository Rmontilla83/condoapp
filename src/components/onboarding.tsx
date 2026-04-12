"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function Onboarding({ userEmail }: { userEmail: string }) {
  const [mode, setMode] = useState<"choose" | "create" | "join">("choose");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);
    const name = form.get("name") as string;
    const address = form.get("address") as string;
    const city = form.get("city") as string;

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Create org
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .insert({ name, address, city })
      .select("id")
      .single();

    if (orgError || !org) {
      setError(orgError?.message ?? "Error al crear la organizacion");
      setLoading(false);
      return;
    }

    // Assign user as admin of this org
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ organization_id: org.id, role: "admin" })
      .eq("id", user.id);

    if (profileError) {
      setError(profileError.message);
      setLoading(false);
      return;
    }

    router.refresh();
  }

  async function handleJoin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);
    const code = (form.get("code") as string).trim();

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Try to find org by ID (simplified — in production this would be an invite code)
    const { data: org } = await supabase
      .from("organizations")
      .select("id, name")
      .eq("id", code)
      .single();

    if (!org) {
      setError("Codigo de condominio no encontrado. Verifica con tu administrador.");
      setLoading(false);
      return;
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .update({ organization_id: org.id })
      .eq("id", user.id);

    if (profileError) {
      setError(profileError.message);
      setLoading(false);
      return;
    }

    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-lg">C</div>
          <h1 className="text-2xl font-bold">Bienvenido a CondoApp</h1>
          <p className="mt-1 text-muted-foreground">{userEmail}</p>
        </div>

        {mode === "choose" && (
          <Card>
            <CardHeader>
              <CardTitle>Configura tu cuenta</CardTitle>
              <CardDescription>
                Para empezar, crea un nuevo condominio o unete a uno existente.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full" size="lg" onClick={() => setMode("create")}>
                Crear nuevo condominio
              </Button>
              <Button className="w-full" size="lg" variant="outline" onClick={() => setMode("join")}>
                Unirme a un condominio
              </Button>
            </CardContent>
          </Card>
        )}

        {mode === "create" && (
          <Card>
            <CardHeader>
              <CardTitle>Crear condominio</CardTitle>
              <CardDescription>Seras el administrador de este condominio.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre del condominio</Label>
                  <Input id="name" name="name" placeholder="Ej: Residencias Los Robles" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Direccion</Label>
                  <Input id="address" name="address" placeholder="Av. Principal, Edif. Los Robles" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">Ciudad</Label>
                  <Input id="city" name="city" placeholder="Caracas" required />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => { setMode("choose"); setError(""); }} disabled={loading}>
                    Atras
                  </Button>
                  <Button type="submit" className="flex-1" disabled={loading}>
                    {loading ? "Creando..." : "Crear condominio"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {mode === "join" && (
          <Card>
            <CardHeader>
              <CardTitle>Unirme a condominio</CardTitle>
              <CardDescription>Ingresa el codigo que te dio tu administrador.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleJoin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Codigo del condominio</Label>
                  <Input id="code" name="code" placeholder="Codigo proporcionado por el admin" required />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => { setMode("choose"); setError(""); }} disabled={loading}>
                    Atras
                  </Button>
                  <Button type="submit" className="flex-1" disabled={loading}>
                    {loading ? "Uniendome..." : "Unirme"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
