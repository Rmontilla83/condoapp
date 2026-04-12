import { getCurrentProfile, getUserUnitIds, getOrganization } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "Outfit, sans-serif" }}>
          Mi perfil
        </h1>
        <p className="text-muted-foreground">Gestiona tu informacion personal</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Datos personales</CardTitle>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
    </div>
  );
}
