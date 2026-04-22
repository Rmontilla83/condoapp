import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, getEffectiveRole } from "@/lib/queries";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { OrgPoliciesForm } from "./org-policies-form";

export default async function AdminSettingsPage() {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return null;
  const effectiveRole = getEffectiveRole(profile);
  if (effectiveRole !== "admin" && effectiveRole !== "super_admin") {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const { data: org } = await supabase
    .from("organizations")
    .select("id, name, tenant_can_vote, tenant_can_see_delinquents, tenant_can_reserve")
    .eq("id", profile.organization_id)
    .single();

  if (!org) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "Outfit, sans-serif" }}>
          Configuración del condominio
        </h1>
        <p className="text-muted-foreground">{org.name}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Políticas para inquilinos</CardTitle>
          <CardDescription>
            Decide qué pueden hacer los inquilinos de tu condominio. Cada condominio tiene sus
            reglas; ajusta según corresponda a la ley local y al reglamento interno.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OrgPoliciesForm
            initial={{
              tenant_can_vote: org.tenant_can_vote,
              tenant_can_see_delinquents: org.tenant_can_see_delinquents,
              tenant_can_reserve: org.tenant_can_reserve,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
