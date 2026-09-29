import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/queries";
import { isAdminRole } from "@/lib/permissions";
import { nombreDeOrg } from "@/lib/email/recipients";
import { esCorreoProvisional } from "@/lib/contactos";
import { propietariosDeOrg } from "./datos";
import { Contactos } from "./contactos";

export default async function ContactosPage() {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return null;
  if (!isAdminRole(profile)) redirect("/dashboard");

  const [propietarios, condominio] = await Promise.all([
    propietariosDeOrg(profile.organization_id),
    nombreDeOrg(profile.organization_id),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <span className="font-meta-loose text-cyan-ink">ADMINISTRACIÓN</span>
        <h1 className="mt-4 font-display text-[clamp(1.75rem,3.5vw,2.5rem)] leading-[1.1] tracking-[-0.03em] text-marine-deep">
          Contactos de propietarios
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] text-mute">
          Carga los correos y teléfonos reales desde la planilla de la junta y, cuando estén listos, invita a
          los propietarios a entrar. Cargar la planilla no envía nada; las invitaciones salen solo cuando tú
          lo decidas.
        </p>
      </div>
      <Contactos
        condominio={condominio}
        propietarios={propietarios.map((p) => ({
          ...p,
          correo: esCorreoProvisional(p.correo) ? "" : p.correo,
        }))}
      />
    </div>
  );
}
