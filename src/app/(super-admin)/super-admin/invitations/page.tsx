import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "Outfit, sans-serif" }}>
          Invitaciones de admin
        </h1>
        <p className="text-muted-foreground">Estado de invitaciones y log de eventos.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invitaciones</CardTitle>
          <CardDescription>
            {(adminInvites ?? []).length} total ·{" "}
            {(adminInvites ?? []).filter((i) => !i.accepted_at).length} pendientes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InvitationsTable
            invitations={(adminInvites ?? []).map((i) => ({
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Eventos recientes</CardTitle>
          <CardDescription>Últimos 50 eventos de autenticación.</CardDescription>
        </CardHeader>
        <CardContent>
          {(events ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Sin eventos.</p>
          ) : (
            <div className="divide-y">
              {(events ?? []).map((e) => (
                <div key={e.id} className="flex items-center justify-between py-2 text-sm">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={e.event.includes("failed") ? "destructive" : "outline"}>
                        {e.event}
                      </Badge>
                      <span className="text-muted-foreground text-xs truncate">
                        {e.target_email ?? "—"}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground ml-3">
                    {new Date(e.created_at).toLocaleString("es", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
