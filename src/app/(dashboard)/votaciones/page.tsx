import { getCurrentProfile, getEffectiveRole } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { NewPollDialog } from "./new-poll-dialog";
import { PollCard } from "./poll-card";

export default async function VotacionesPage() {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return null;

  const effectiveRole = getEffectiveRole(profile);
  const isAdmin = effectiveRole === "admin" || effectiveRole === "super_admin";
  const supabase = await createClient();

  const { data } = await supabase
    .from("polls")
    .select("*, poll_votes(selected_option, voter_id)")
    .eq("organization_id", profile.organization_id)
    .order("created_at", { ascending: false });

  const polls = data ?? [];
  const openPolls = polls.filter((p) => p.is_open);
  const closedPolls = polls.filter((p) => !p.is_open);

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="font-meta-loose text-steel">VOTACIONES</span>
          <h1 className="mt-4 font-display text-[clamp(1.75rem,3.5vw,2.5rem)] leading-[1.1] tracking-[-0.03em] text-ink">
            Decisiones de tu <em className="font-editorial text-steel">comunidad</em>
          </h1>
        </div>
        {isAdmin && <NewPollDialog />}
      </div>

      {polls.length === 0 ? (
        <div className="rounded-2xl bg-card border border-border py-16 text-center">
          <p className="text-[14px] text-mute">No hay encuestas activas.</p>
          {isAdmin && (
            <p className="mt-2 font-meta text-mute">
              CREA UNA ENCUESTA PARA QUE LOS RESIDENTES VOTEN
            </p>
          )}
        </div>
      ) : (
        <>
          {openPolls.length > 0 && (
            <div>
              <p className="font-meta text-mute mb-4">ABIERTAS · {openPolls.length}</p>
              <div className="space-y-4">
                {openPolls.map((poll) => (
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  <PollCard key={poll.id} poll={poll as any} userId={profile.id} isAdmin={isAdmin} />
                ))}
              </div>
            </div>
          )}

          {closedPolls.length > 0 && (
            <div>
              <p className="font-meta text-mute mb-4">CERRADAS · {closedPolls.length}</p>
              <div className="space-y-4">
                {closedPolls.map((poll) => (
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  <PollCard key={poll.id} poll={poll as any} userId={profile.id} isAdmin={isAdmin} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
