import { redirect } from "next/navigation";
import { getCurrentProfile, getOrgMaintenance } from "@/lib/queries";
import { isAdminRole } from "@/lib/permissions";
import { signStorageRefRows } from "@/lib/storage";
import { Encabezado } from "@/components/contabilidad/ui";
import { RequestManager } from "../request-manager";

/**
 * Los reportes de avería de todo el condominio, para atenderlos: asignar
 * responsable y cambiar el estado. Es la misma lista del panel, en su propia
 * pantalla, para que «Mantenimiento» en el menú de la administración lleve a
 * gestionar y no a la vista del vecino («Reportar un problema»).
 */
export default async function MantenimientoAdminPage() {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return null;
  if (!isAdminRole(profile)) redirect("/mantenimiento");

  const solicitudes = await getOrgMaintenance(profile.organization_id);
  const fotos = await signStorageRefRows(solicitudes.map((m) => m.photo_urls as string[] | null));
  const firmadas = solicitudes.map((m, i) => ({ ...m, photo_urls: fotos[i] }));
  const abiertas = solicitudes.filter((m) => m.status !== "resolved" && m.status !== "cancelled").length;
  const nuevas = solicitudes.filter((m) => m.status === "new").length;

  return (
    <div className="space-y-8">
      <Encabezado
        eyebrow="CONDOMINIO"
        titulo="Mantenimiento"
        descripcion={
          solicitudes.length === 0
            ? "Aquí aparecen los reportes de avería de los vecinos."
            : `${abiertas} abierto${abiertas !== 1 ? "s" : ""}, ${nuevas} sin atender. Toca un reporte para asignar responsable o cambiar su estado.`
        }
      />
      <div className="rounded-2xl border border-border bg-card p-6">
        <RequestManager requests={firmadas} />
      </div>
    </div>
  );
}
