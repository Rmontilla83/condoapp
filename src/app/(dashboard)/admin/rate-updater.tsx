"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function RateUpdater({ currentRate, effectiveDate }: { currentRate: number; effectiveDate: string }) {
  const [loading, setLoading] = useState(false);
  const [rate, setRate] = useState(currentRate);
  const [date, setDate] = useState(effectiveDate);
  const [synced, setSynced] = useState(false);

  async function handleSync() {
    setLoading(true);
    setSynced(false);
    try {
      const res = await fetch("/api/bcv-rate");
      const data = await res.json();
      if (data.rate) {
        setRate(data.rate);
        setDate(data.date);
        setSynced(true);
        setTimeout(() => setSynced(false), 3000);
        // Refresh page to show new rate
        window.location.reload();
      }
    } catch {
      // silent fail
    }
    setLoading(false);
  }

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tasa BCV</p>
          <p className="text-2xl font-extrabold text-primary mt-0.5" style={{ fontFamily: "Outfit, sans-serif" }}>
            Bs {rate.toFixed(2)}
          </p>
          <p className="text-[10px] text-muted-foreground">por dolar — {date}</p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={handleSync}
          disabled={loading}
          className="shrink-0"
        >
          {loading ? (
            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
            </svg>
          ) : synced ? (
            <>
              <svg className="h-4 w-4 mr-1 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              Actualizada
            </>
          ) : (
            <>
              <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
              </svg>
              Sincronizar BCV
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
