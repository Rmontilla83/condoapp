"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { resendAdminInvite } from "../actions";

interface Row {
  id: string;
  email: string;
  accepted_at: string | null;
  created_at: string;
  org_name: string;
}

export function InvitationsTable({ invitations }: { invitations: Row[] }) {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: "ok" | "error"; msg: string; id?: string } | null>(
    null
  );

  function resend(id: string) {
    startTransition(async () => {
      const res = await resendAdminInvite(id);
      if (res.error) setFeedback({ type: "error", msg: res.error, id });
      else setFeedback({ type: "ok", msg: "Reenviado", id });
      setTimeout(() => setFeedback(null), 4000);
    });
  }

  if (invitations.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-4">Sin invitaciones.</p>;
  }

  return (
    <div className="divide-y">
      {invitations.map((i) => {
        const accepted = !!i.accepted_at;
        const rowFeedback = feedback?.id === i.id ? feedback : null;
        return (
          <div key={i.id} className="flex items-center gap-3 py-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold truncate">{i.email}</span>
                <Badge variant={accepted ? "default" : "secondary"}>
                  {accepted ? "Aceptada" : "Pendiente"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {i.org_name} · {new Date(i.created_at).toLocaleDateString("es")}
                {accepted && ` · aceptada ${new Date(i.accepted_at!).toLocaleDateString("es")}`}
              </p>
              {rowFeedback && (
                <p
                  className={`text-xs mt-1 ${
                    rowFeedback.type === "ok" ? "text-emerald-600" : "text-destructive"
                  }`}
                >
                  {rowFeedback.msg}
                </p>
              )}
            </div>
            {!accepted && (
              <Button
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() => resend(i.id)}
              >
                {pending ? "..." : "Reenviar"}
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}
