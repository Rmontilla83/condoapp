import { getCurrentProfile } from "@/lib/queries";
import { modoDelConserje } from "@/lib/conserje/conserje";
import { Chat } from "./chat";

export default async function ConserjePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return null;

  const primerNombre = (profile.full_name ?? "").trim().split(/\s+/)[0] ?? "";

  return (
    <div className="space-y-6">
      <div>
        <span className="font-meta-loose text-cyan-ink">CONSERJE</span>
        <h1 className="mt-4 font-display text-[clamp(1.75rem,3.5vw,2.5rem)] leading-[1.1] tracking-[-0.03em] text-marine-deep">
          Pregúntale al <em className="font-editorial">conserje</em>
        </h1>
        <p className="mt-3 text-[15px] text-mute max-w-xl">
          Cuánto debes, cómo pagar, si un área está libre o cómo contactar a la administración.
          Solo ve la información de tus unidades.
        </p>
      </div>
      <Chat
        primerNombre={primerNombre}
        modo={modoDelConserje()}
        preguntaInicial={typeof q === "string" ? q.slice(0, 200) : undefined}
      />
    </div>
  );
}
