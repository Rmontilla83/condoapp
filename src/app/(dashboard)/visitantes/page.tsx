import { getCurrentProfile, getEffectiveRole, getOrganization } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { NewPassDialog } from "./new-pass-dialog";
import { PassList, type PassWithUnit } from "./pass-list";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Organization } from "@/types/database";

export default async function VisitantesPage() {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return null;

  const effectiveRole = getEffectiveRole(profile);
  const isAdmin = effectiveRole === "admin" || effectiveRole === "super_admin";

  const supabase = await createClient();

  const orgRaw = await getOrganization(profile.organization_id);
  const org = orgRaw as Organization | null;
  const orgName = org?.name ?? "el condominio";

  // Mis pases (residente o admin viendo los suyos propios)
  const { data: mineData } = await supabase
    .from("access_passes")
    .select("*, units:unit_id(unit_number)")
    .eq("created_by", profile.id)
    .order("created_at", { ascending: false })
    .limit(20);
  const minePasses = (mineData ?? []) as PassWithUnit[];

  // Si admin, también pases del condo
  let condoPasses: PassWithUnit[] = [];
  if (isAdmin) {
    const { data: condoData } = await supabase
      .from("access_passes")
      .select("*, units:unit_id(unit_number)")
      .eq("organization_id", profile.organization_id)
      .order("created_at", { ascending: false })
      .limit(50);
    condoPasses = (condoData ?? []) as PassWithUnit[];
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="font-meta-loose text-cyan-ink">ACCESO · VISITANTES</span>
          <h1 className="mt-4 font-display text-[clamp(1.75rem,3.5vw,2.5rem)] leading-[1.1] tracking-[-0.03em] text-marine-deep">
            Genera <em className="font-editorial text-cyan">QR</em> de acceso
          </h1>
        </div>
        <NewPassDialog orgName={orgName} />
      </div>

      {/* How it works — copy honesto del flujo real */}
      <div className="rounded-2xl bg-marine-deep text-frost p-6 md:p-7">
        <p className="font-meta text-ember">CÓMO FUNCIONA</p>
        <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            { step: "01", title: "Registra", desc: "Ingresa nombre y cédula de tu visitante." },
            { step: "02", title: "Comparte", desc: "Envía el QR por WhatsApp a tu visitante." },
            { step: "03", title: "Acceso", desc: "El vigilante revisa el QR en pantalla del visitante y permite el acceso." },
          ].map((s) => (
            <div key={s.step} className="flex items-start gap-3">
              <span className="font-meta text-ember shrink-0">{s.step}</span>
              <div>
                <p className="font-display text-[17px] leading-tight text-frost">{s.title}</p>
                <p className="mt-1.5 text-[13px] text-frost/60 leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Lista de pases — admin tiene tabs, residente solo ve los suyos */}
      {isAdmin ? (
        <Tabs defaultValue="mine">
          <TabsList>
            <TabsTrigger value="mine">Mis pases</TabsTrigger>
            <TabsTrigger value="condo">Pases del condo</TabsTrigger>
          </TabsList>
          <TabsContent value="mine" className="mt-4">
            <p className="font-meta text-mute mb-4">
              {minePasses.length} PASE{minePasses.length !== 1 ? "S" : ""} GENERADO{minePasses.length !== 1 ? "S" : ""} POR TI
            </p>
            <PassList passes={minePasses} orgName={orgName} />
          </TabsContent>
          <TabsContent value="condo" className="mt-4">
            <p className="font-meta text-mute mb-4">
              {condoPasses.length} PASE{condoPasses.length !== 1 ? "S" : ""} EN TODO EL CONDOMINIO · ÚLTIMOS 50
            </p>
            <PassList passes={condoPasses} orgName={orgName} showUnit hideShareButton />
          </TabsContent>
        </Tabs>
      ) : (
        <div>
          <p className="font-meta text-mute mb-4">
            {minePasses.length} PASE{minePasses.length !== 1 ? "S" : ""} RECIENTE{minePasses.length !== 1 ? "S" : ""}
          </p>
          <PassList passes={minePasses} orgName={orgName} />
        </div>
      )}
    </div>
  );
}
