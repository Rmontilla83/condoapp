import { getCurrentProfile, getUserUnitIds, getOrganization } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "./profile-form";

export default async function PerfilPage() {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  let orgName = "";
  let unitNumber = "";

  if (profile.organization_id) {
    const org = await getOrganization(profile.organization_id);
    orgName = org?.name ?? "";

    const unitIds = await getUserUnitIds(profile.id);
    if (unitIds.length > 0) {
      const supabase = await createClient();
      const { data: unit } = await supabase
        .from("units")
        .select("unit_number")
        .eq("id", unitIds[0])
        .single();
      unitNumber = unit?.unit_number ?? "";
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <span className="font-meta-loose text-cyan">MI PERFIL</span>
        <h1 className="mt-4 font-display text-[clamp(1.75rem,3.5vw,2.5rem)] leading-[1.1] tracking-[-0.03em] text-marine-deep">
          Tu <em className="font-editorial text-cyan">información</em> personal
        </h1>
      </div>

      <div className="rounded-2xl bg-card border border-border p-6 md:p-7">
        <p className="font-meta text-mute mb-5">DATOS PERSONALES</p>
        <ProfileForm
          profile={{
            full_name: profile.full_name,
            email: profile.email,
            phone: profile.phone,
            role: profile.role,
            organization_id: profile.organization_id,
          }}
          orgName={orgName}
          unitNumber={unitNumber}
        />
      </div>
    </div>
  );
}
