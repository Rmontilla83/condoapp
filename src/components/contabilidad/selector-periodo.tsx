"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";

/** Período de un informe: atajos (este mes, mes anterior, este año) o fechas libres. */
export function SelectorPeriodo({ desde, hasta, hoy }: { desde: string; hasta: string; hoy: string }) {
  const router = useRouter();
  const ruta = usePathname();
  const actuales = useSearchParams();
  const [d, setD] = useState(desde);
  const [h, setH] = useState(hasta);
  const [y, m] = hoy.split("-").map(Number);
  const iso = (dt: Date) => dt.toISOString().slice(0, 10);
  const atajos = [
    { t: "Este mes", d: iso(new Date(Date.UTC(y, m - 1, 1))), h: hoy },
    { t: "Mes anterior", d: iso(new Date(Date.UTC(y, m - 2, 1))), h: iso(new Date(Date.UTC(y, m - 1, 0))) },
    { t: "Este año", d: `${y}-01-01`, h: hoy },
  ];
  // Conserva los demás parámetros (moneda, cuenta…).
  const ir = (a: string, b: string) => {
    const q = new URLSearchParams(actuales.toString());
    q.set("desde", a);
    q.set("hasta", b);
    router.push(`${ruta}?${q.toString()}`);
  };

  return (
    <div className="flex flex-wrap items-end gap-2">
      {atajos.map((a) => (
        <button
          key={a.t}
          type="button"
          onClick={() => ir(a.d, a.h)}
          className={`h-9 rounded-full px-3.5 text-[13px] ${a.d === desde && a.h === hasta ? "bg-marine-deep text-frost" : "border border-border text-marine-deep"}`}
        >
          {a.t}
        </button>
      ))}
      <span className="mx-1 hidden h-6 w-px bg-border sm:block" />
      <input type="date" value={d} max={hoy} onChange={(e) => setD(e.target.value)} className="h-9 rounded-lg border border-border bg-background px-2 text-[13px]" aria-label="Desde" />
      <input type="date" value={h} max={hoy} onChange={(e) => setH(e.target.value)} className="h-9 rounded-lg border border-border bg-background px-2 text-[13px]" aria-label="Hasta" />
      <button type="button" onClick={() => d <= h && ir(d, h)} className="h-9 rounded-lg bg-marine-deep px-3.5 text-[13px] font-medium text-frost">
        Ver
      </button>
    </div>
  );
}
