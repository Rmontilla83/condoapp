import { getCurrentProfile } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { NewPollDialog } from "./new-poll-dialog";
import { PollCard } from "./poll-card";

export default async function VotacionesPage() {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return null;

  const isAdmin = profile.role === "admin" || profile.role === "super_admin";
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "Outfit, sans-serif" }}>
            Votaciones
          </h1>
          <p className="text-muted-foreground">Encuestas y decisiones de tu comunidad</p>
        </div>
        {isAdmin && <NewPollDialog />}
      </div>

      {polls.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
            </svg>
          </div>
          <p className="text-muted-foreground">No hay encuestas activas</p>
          {isAdmin && <p className="text-xs text-muted-foreground mt-1">Crea una encuesta para que los residentes voten</p>}
        </div>
      ) : (
        <>
          {openPolls.length > 0 && (
            <div className="space-y-4">
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Abiertas</p>
              {openPolls.map((poll) => (
                <PollCard key={poll.id} poll={poll as any} userId={profile.id} isAdmin={isAdmin} />
              ))}
            </div>
          )}

          {closedPolls.length > 0 && (
            <div className="space-y-4">
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Cerradas</p>
              {closedPolls.map((poll) => (
                <PollCard key={poll.id} poll={poll as any} userId={profile.id} isAdmin={isAdmin} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
