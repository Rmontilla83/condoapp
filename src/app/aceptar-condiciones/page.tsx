import { redirect } from "next/navigation";
import { getCurrentProfile, getOrganization } from "@/lib/queries";
import { AceptarCondiciones } from "@/components/legal/aceptar-condiciones";
import { VERSION_CONDICIONES } from "@/lib/legal";

/** A esta pantalla redirige el layout del panel a quien no ha aceptado la versión vigente. */
export default async function AceptarCondicionesPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!profile.organization_id || profile.role === "super_admin" || profile.terms_version === VERSION_CONDICIONES) {
    redirect("/dashboard");
  }
  const org = await getOrganization(profile.organization_id);
  return <AceptarCondiciones condominio={(org?.name as string) ?? null} />;
}
