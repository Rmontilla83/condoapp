"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cancelReservation } from "./actions";

export function CancelButton({ id }: { id: string }) {
  const [loading, setLoading] = useState(false);

  async function handleCancel() {
    if (!confirm("Cancelar esta reserva?")) return;
    setLoading(true);
    await cancelReservation(id);
    setLoading(false);
  }

  return (
    <Button size="sm" variant="outline" onClick={handleCancel} disabled={loading} className="text-xs text-red-600 border-red-200 hover:bg-red-50">
      {loading ? "..." : "Cancelar"}
    </Button>
  );
}
