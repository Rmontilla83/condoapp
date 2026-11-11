"use client";

import { useState, useTransition } from "react";
import { cambiarFuncion } from "./actions";

export function SelectorFuncion({ profileId, actual, opciones }: { profileId: string; actual: string; opciones: { valor: string; nombre: string }[] }) {
  const [valor, setValor] = useState(actual);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  return (
    <div>
      <select
        value={valor}
        disabled={pending}
        aria-label="Función"
        onChange={(e) => {
          const nueva = e.target.value;
          const antes = valor;
          setValor(nueva);
          setError("");
          start(async () => {
            const r = await cambiarFuncion(profileId, nueva);
            if ("error" in r) {
              setValor(antes);
              setError(r.error);
            } else window.location.reload();
          });
        }}
        className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm disabled:opacity-50"
      >
        {opciones.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.nombre}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-[12px] text-destructive">{error}</p>}
    </div>
  );
}
