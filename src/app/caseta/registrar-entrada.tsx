"use client";

import { useState, useTransition } from "react";
import { grantAccessFromStation } from "@/app/verificar/[code]/actions";

export function RegistrarEntrada({ passId }: { passId: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [hecho, setHecho] = useState(false);

  if (hecho) {
    return <p className="mt-3 rounded-xl bg-emerald-50 px-4 py-3 text-center text-[15px] font-semibold text-emerald-700">Entrada registrada</p>;
  }

  return (
    <div className="mt-3 space-y-1.5">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setError("");
            const r = await grantAccessFromStation(passId);
            if ("error" in r && r.error) setError(r.error);
            else setHecho(true);
          })
        }
        className="h-12 w-full rounded-xl bg-emerald-600 text-[15px] font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Registrando…" : "Registrar entrada"}
      </button>
      {error && <p className="text-center text-[13px] text-destructive">{error}</p>}
    </div>
  );
}
