"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { grantAccess } from "./actions";

export function GrantAccessButton({ passId }: { passId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [granted, setGranted] = useState(false);
  const [error, setError] = useState("");

  async function handleGrant() {
    setLoading(true);
    setError("");
    const res = await grantAccess(passId);
    if (res.error) {
      setError(res.error);
    } else {
      setGranted(true);
      router.refresh();
    }
    setLoading(false);
  }

  if (granted) {
    return (
      <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-center">
        <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
          <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <p className="text-sm font-bold text-emerald-700">Acceso registrado</p>
        <p className="text-xs text-emerald-600 mt-0.5">El propietario fue notificado</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Button
        onClick={handleGrant}
        disabled={loading}
        className="w-full py-6 text-base font-bold bg-emerald-600 hover:bg-emerald-700"
        size="lg"
      >
        {loading ? (
          "Registrando..."
        ) : (
          <>
            <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
            Permitir acceso
          </>
        )}
      </Button>
      {error && <p className="text-sm text-destructive text-center">{error}</p>}
    </div>
  );
}
