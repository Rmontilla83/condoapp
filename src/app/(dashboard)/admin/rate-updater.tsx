"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function RateUpdater({
  currentRate,
  effectiveDate,
}: {
  currentRate: number;
  effectiveDate: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [rate, setRate] = useState(currentRate);
  const [date, setDate] = useState(effectiveDate);
  const [synced, setSynced] = useState(false);
  const [error, setError] = useState("");

  async function handleSync() {
    setLoading(true);
    setSynced(false);
    setError("");
    try {
      const res = await fetch("/api/bcv-rate", { cache: "no-store" });
      const data = await res.json();
      if (res.ok && data.rate) {
        setRate(data.rate);
        setDate(data.date);
        setSynced(true);
        setTimeout(() => setSynced(false), 3000);
        window.location.reload();
      } else {
        setError(data.error ?? "No pudimos sincronizar la tasa");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      setError(msg);
    }
    setLoading(false);
  }

  return (
    <div className="rounded-2xl bg-card border border-border p-5 flex flex-col justify-between gap-4">
      <div>
        <p className="font-meta text-mute">TASA BCV</p>
        <p className="mt-3 font-display text-[28px] leading-none tracking-[-0.02em] text-ink">
          Bs {rate.toFixed(2)}
        </p>
        <p className="mt-2 font-meta text-mute">
          POR DÓLAR · {date || "—"}
        </p>
        {error && (
          <p className="mt-2 text-[12px] text-destructive">{error}</p>
        )}
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={handleSync}
        disabled={loading}
        className="justify-center"
      >
        {loading
          ? "Sincronizando..."
          : synced
          ? "✓ Actualizada"
          : "Sincronizar BCV"}
      </Button>
    </div>
  );
}
