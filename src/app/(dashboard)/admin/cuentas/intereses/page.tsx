import { redirect } from "next/navigation";
import { getCurrentProfile, getOrganization } from "@/lib/queries";
import { isAdminRole } from "@/lib/permissions";
import { todayInTimeZone } from "@/lib/utils";
import { Encabezado, Pestanas, PESTANAS_CUENTAS } from "@/components/contabilidad/ui";
import { Intereses } from "./intereses";

export default async function InteresesPage() {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return null;
  if (!isAdminRole(profile)) redirect("/dashboard");
  const org = await getOrganization(profile.organization_id);
  const hoy = todayInTimeZone((org?.timezone as string) || undefined);

  // Período sugerido: el mes anterior completo.
  const [y, m] = hoy.split("-").map(Number);
  const ini = new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 10);
  const fin = new Date(Date.UTC(y, m - 1, 0)).toISOString().slice(0, 10);
  const vence = new Date(Date.parse(`${hoy}T12:00:00Z`) + 15 * 86_400_000).toISOString().slice(0, 10);

  return (
    <div className="space-y-8">
      <Encabezado
        eyebrow="CONTABILIDAD"
        titulo="Intereses de mora"
        descripcion="Interés simple sobre lo vencido de cada recibo, por los días de atraso dentro del período. Se revisa antes de emitir y se emite como un recibo aparte, con su número."
      />
      <Pestanas items={PESTANAS_CUENTAS} actual="/admin/cuentas/intereses" />
      <Intereses
        tasaInicial={org?.late_fee_pct == null ? null : Number(org.late_fee_pct)}
        actaInicial={(org?.late_fee_acta as string) ?? ""}
        desde={ini}
        hasta={fin}
        vence={vence}
        hoy={hoy}
      />
    </div>
  );
}
