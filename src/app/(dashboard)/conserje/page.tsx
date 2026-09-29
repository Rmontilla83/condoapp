import { getCurrentProfile } from "@/lib/queries";
import { modoDelConserje } from "@/lib/conserje/conserje";
import { Chat } from "./chat";
import { CaraConserje, NOMBRE_CONSERJE } from "@/components/conserje/cara";
import { createClient } from "@/lib/supabase/server";

export default async function ConserjePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return null;

  const primerNombre = (profile.full_name ?? "").trim().split(/\s+/)[0] ?? "";
  const { data: org } = await (await createClient())
    .from("organizations")
    .select("name")
    .eq("id", profile.organization_id)
    .maybeSingle();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <CaraConserje tam={72} className="shrink-0" />
        <div>
          <h1 className="font-display text-[clamp(1.75rem,3.5vw,2.5rem)] leading-[1.1] tracking-[-0.03em] text-marine-deep">
            Pregúntale a {NOMBRE_CONSERJE}
          </h1>
          <p className="mt-2 text-[15px] text-mute max-w-xl">
            El conserje del edificio: cuánto debes, cómo pagar, qué áreas están libres, técnicos de
            confianza, y si algo se dañó, lo reporta por ti. Solo ve la información de tus unidades.
          </p>
        </div>
      </div>
      <Chat
        primerNombre={primerNombre}
        modo={modoDelConserje()}
        preguntaInicial={typeof q === "string" ? q.slice(0, 200) : undefined}
        condominio={(org?.name as string) ?? undefined}
      />
    </div>
  );
}
