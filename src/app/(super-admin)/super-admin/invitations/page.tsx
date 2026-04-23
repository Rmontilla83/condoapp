import { createClient } from "@/lib/supabase/server";
import { InvitationsTable } from "./invitations-table";

export default async function InvitationsPage() {
  const supabase = await createClient();

  const { data: adminInvites } = await supabase
    .from("admin_invitations")
    .select("id, email, accepted_at, created_at, organization_id, organizations(name)")
    .order("created_at", { ascending: false });

  const { data: events } = await supabase
    .from("auth_events")
    .select("id, event, target_email, payload, created_at, organization_id")
    .order("created_at", { ascending: false })
    .limit(50);

  const allInvites = adminInvites ?? [];
  const pendingCount = allInvites.filter((i) => !i.accepted_at).length;
  const allEvents = events ?? [];

  return (
    <div className="mx-auto max-w-5xl px-5 md:px-8 py-10 space-y-8">
      <div>
        <span className="font-meta-loose text-steel">INVITACIONES · ADMIN</span>
        <h1 className="mt-4 font-display text-[clamp(1.75rem,3.5vw,2.5rem)] leading-[1.1] tracking-[-0.03em] text-ink">
          Estado de <em className="font-editorial text-steel">invitaciones</em>
        </h1>
        <p className="mt-3 text-[15px] text-mute">
          {allInvites.length} total · {pendingCount} pendiente{pendingCount !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="rounded-2xl bg-card border border-border p-6">
        <p className="font-meta text-mute mb-5">INVITACIONES</p>
        <InvitationsTable
          invitations={allInvites.map((i) => ({
            id: i.id,
            email: i.email,
            accepted_at: i.accepted_at,
            created_at: i.created_at,
            org_name:
              (Array.isArray(i.organizations)
                ? (i.organizations[0] as { name?: string } | undefined)?.name
                : (i.organizations as { name?: string } | null)?.name) ?? "—",
          }))}
        />
      </div>

      <div className="rounded-2xl bg-card border border-border p-6">
        <p className="font-meta text-mute mb-5">EVENTOS RECIENTES · ÚLTIMOS 50</p>
        {allEvents.length === 0 ? (
          <p className="py-6 text-center text-[13px] text-mute">Sin eventos.</p>
        ) : (
          <ul className="space-y-0">
            {allEvents.map((e) => {
              const isFailed = e.event.includes("failed");
              return (
                <li
                  key={e.id}
                  className="flex items-center justify-between gap-3 py-2.5 border-b border-border last:border-0"
                >
                  <div className="min-w-0 flex-1 flex items-center gap-3">
                    <span
                      className={`font-meta px-2 py-0.5 rounded-md shrink-0 ${
                        isFailed
                          ? "bg-destructive/10 text-destructive"
                          : "bg-ink/5 text-ink"
                      }`}
                    >
                      {e.event.toUpperCase()}
                    </span>
                    <span className="text-[13px] text-mute truncate">
                      {e.target_email ?? "—"}
                    </span>
                  </div>
                  <span className="font-meta text-mute shrink-0">
                    {new Date(e.created_at)
                      .toLocaleString("es", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                      .toUpperCase()}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
