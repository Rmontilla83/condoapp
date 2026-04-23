import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, getEffectiveRole } from "@/lib/queries";
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
    <div className="space-y-8">
      <div>
        <span className="font-meta-loose text-steel">CONFIGURACIÓN</span>
        <h1 className="mt-4 font-display text-[clamp(1.75rem,3.5vw,2.5rem)] leading-[1.1] tracking-[-0.03em] text-ink">
          <em className="font-editorial">{org.name}</em>
        </h1>
        <p className="mt-3 text-[15px] text-mute">
          Políticas de tu condominio.
        </p>
      </div>

      <div className="rounded-2xl bg-card border border-border p-6 md:p-7">
        <p className="font-meta text-mute mb-2">POLÍTICAS PARA INQUILINOS</p>
        <p className="text-[14px] text-ink/80 leading-relaxed mb-6">
          Decide qué pueden hacer los inquilinos de tu condominio. Cada condominio tiene sus
          reglas; ajusta según corresponda a la ley local y al reglamento interno.
        </p>
        <OrgPoliciesForm
          initial={{
            tenant_can_vote: org.tenant_can_vote,
            tenant_can_see_delinquents: org.tenant_can_see_delinquents,
            tenant_can_reserve: org.tenant_can_reserve,
          }}
        />
      </div>
    </div>
  );
}
