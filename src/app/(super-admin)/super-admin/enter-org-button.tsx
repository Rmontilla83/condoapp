"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { switchViewAs } from "./actions";

export function EnterOrgButton({ orgId }: { orgId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function enter(as: "admin" | "resident") {
    setLoading(true);
    await switchViewAs(as, orgId);
    router.push("/dashboard");
  }

  return (
    <div className="flex gap-2 mt-2">
      <Button
        size="sm"
        variant="secondary"
        className="flex-1"
        disabled={loading}
        onClick={() => enter("admin")}
      >
        {loading ? "..." : "Entrar como admin"}
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="flex-1"
        disabled={loading}
        onClick={() => enter("resident")}
      >
        Como residente
      </Button>
    </div>
  );
}
