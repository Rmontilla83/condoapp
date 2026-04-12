"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function Onboarding({ userEmail }: { userEmail: string }) {
  const [step, setStep] = useState<"code" | "unit">("code");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [orgData, setOrgData] = useState<{ id: string; name: string } | null>(null);
  const [units, setUnits] = useState<{ id: string; unit_number: string; type: string }[]>([]);
  const [checkingInvite, setCheckingInvite] = useState(true);
  const router = useRouter();

  // Check if user has a pending admin invitation
  useEffect(() => {
    async function checkInvite() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check admin invitations
      const { data: invite } = await supabase
        .from("admin_invitations")
        .select("organization_id, organizations(name)")
        .eq("email", user.email!)
        .is("accepted_at", null)
        .limit(1)
        .single();

      if (invite) {
        // Auto-accept admin invitation
        const orgName = Array.isArray(invite.organizations) ? invite.organizations[0]?.name : (invite.organizations as any)?.name;

        await supabase.from("profiles").update({
          organization_id: invite.organization_id,
          role: "admin",
        }).eq("id", user.id);

        await supabase.from("admin_invitations").update({
          accepted_at: new Date().toISOString(),
        }).eq("organization_id", invite.organization_id).eq("email", user.email!);

        router.refresh();
        return;
      }

      setCheckingInvite(false);
    }
    checkInvite();
  }, [router]);

  async function handleCodeSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);
    const code = (form.get("code") as string).trim().toUpperCase();

    if (!code) { setError("Ingresa el codigo"); setLoading(false); return; }

    const supabase = createClient();

    const { data: org } = await supabase
      .from("organizations")
      .select("id, name")
      .eq("invite_code", code)
      .eq("is_active", true)
      .single();

    if (!org) {
      setError("Codigo no valido. Verifica con tu administrador.");
      setLoading(false);
      return;
    }

    // Get available units
    const { data: orgUnits } = await supabase
      .from("units")
      .select("id, unit_number, type")
      .eq("organization_id", org.id)
      .order("unit_number");

    setOrgData(org);
    setUnits(orgUnits ?? []);
    setStep("unit");
    setLoading(false);
  }

  async function handleUnitSelect(unitId: string) {
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !orgData) return;

    // Join the organization
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ organization_id: orgData.id, role: "resident" })
      .eq("id", user.id);

    if (profileError) { setError(profileError.message); setLoading(false); return; }

    // Link to unit
    if (unitId !== "none") {
      await supabase.from("unit_residents").insert({
        unit_id: unitId,
        profile_id: user.id,
        is_owner: false,
      });
    }

    router.refresh();
  }

  if (checkingInvite) {
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
            <svg viewBox="0 0 24 24" className="h-6 w-6 text-[#2DD4BF]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "Outfit, sans-serif" }}>Bienvenido a CondoApp</h1>
          <p className="mt-1 text-muted-foreground text-sm">{userEmail}</p>
        </div>

        {step === "code" && (
          <Card>
            <CardHeader>
              <CardTitle>Unirse a un condominio</CardTitle>
              <CardDescription>
                Ingresa el codigo que te dio tu administrador o junta de condominio.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCodeSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Codigo de invitacion</Label>
                  <Input
                    id="code"
                    name="code"
                    placeholder="Ej: ABC1-2026"
                    className="text-center text-lg font-mono font-bold tracking-widest uppercase"
                    maxLength={12}
                    autoFocus
                    required
                  />
                </div>
                {error && <p className="text-sm text-destructive text-center">{error}</p>}
                <Button type="submit" className="w-full" size="lg" disabled={loading}>
                  {loading ? "Verificando..." : "Continuar"}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  No tienes codigo? Pidelo al administrador de tu condominio.
                </p>
              </form>
            </CardContent>
          </Card>
        )}

        {step === "unit" && orgData && (
          <Card>
            <CardHeader>
              <CardTitle>{orgData.name}</CardTitle>
              <CardDescription>Selecciona tu unidad (apartamento, casa o local)</CardDescription>
            </CardHeader>
            <CardContent>
              {error && <p className="text-sm text-destructive text-center mb-3">{error}</p>}
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {units.map((unit) => (
                  <button
                    key={unit.id}
                    onClick={() => handleUnitSelect(unit.id)}
                    disabled={loading}
                    className="w-full text-left rounded-xl border p-3 hover:border-primary hover:bg-primary/5 transition-colors disabled:opacity-50 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-semibold">Apto {unit.unit_number}</p>
                      <p className="text-xs text-muted-foreground capitalize">{unit.type}</p>
                    </div>
                    <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </button>
                ))}
                <button
                  onClick={() => handleUnitSelect("none")}
                  disabled={loading}
                  className="w-full text-center text-sm text-muted-foreground py-2 hover:text-foreground transition-colors"
                >
                  No encuentro mi unidad / seleccionar despues
                </button>
              </div>
              <Button variant="ghost" className="w-full mt-3" onClick={() => { setStep("code"); setError(""); }}>
                ← Cambiar codigo
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
