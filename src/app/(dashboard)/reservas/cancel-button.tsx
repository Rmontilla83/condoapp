"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cancelReservation } from "./actions";

export function CancelButton({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleCancel() {
    if (!confirm("¿Cancelar esta reserva?")) return;
    setLoading(true);
    await cancelReservation(id);
    setLoading(false);
    router.refresh();
  }

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleCancel}
      disabled={loading}
      className="text-xs text-destructive border-destructive/30 hover:bg-destructive/5"
    >
      {loading ? "..." : "Cancelar"}
    </Button>
  );
}
