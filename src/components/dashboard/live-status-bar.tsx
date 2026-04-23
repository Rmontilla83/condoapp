"use client";

import { useEffect, useState } from "react";

interface LiveStatusBarProps {
  initialRate: number | null;
  initialDate: string | null;
}

// Venezuela: UTC-4, sin DST. Usamos Intl con timezone "America/Caracas"
// que siempre devuelve la hora correcta sin depender del offset local.
function getVenezuelaTime(): string {
  return new Intl.DateTimeFormat("es-VE", {
    timeZone: "America/Caracas",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

function formatBsRate(rate: number | null): string {
  if (!rate || rate <= 0) return "—";
  return `Bs ${rate.toFixed(2)}`;
}

export function LiveStatusBar({ initialRate, initialDate }: LiveStatusBarProps) {
  const [time, setTime] = useState(() => getVenezuelaTime());
  const [rate, setRate] = useState<number | null>(initialRate);
  const [rateDate, setRateDate] = useState<string | null>(initialDate);

  // Reloj: actualiza cada 30s para mantener los minutos al día sin
  // ser agresivo. El Intl.DateTimeFormat recalcula al cambiar el estado.
  useEffect(() => {
    const tick = () => setTime(getVenezuelaTime());
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  // Tasa BCV: fetch al mount + cada 15 min. El endpoint ya cachea 15min
  // con revalidate, pero el polling asegura que el UI refleje cambios.
  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      try {
        const res = await fetch("/api/bcv-rate", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        if (typeof data.rate === "number") setRate(data.rate);
        if (typeof data.date === "string") setRateDate(data.date);
      } catch {
        // silencioso — si falla, mantenemos la tasa previa
      }
    }

    // Primer refresh solo si no tenemos tasa inicial
    if (!initialRate) refresh();

    const id = setInterval(refresh, 15 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [initialRate]);

  const isToday = rateDate === new Date().toISOString().split("T")[0];

  return (
    <div className="flex items-center gap-4 font-meta text-bone/80">
      <div className="flex items-center gap-2">
        <span className="text-sand">VE</span>
        <span className="text-bone">{time}</span>
      </div>
      <span className="text-bone/30" aria-hidden="true">·</span>
      <div className="flex items-center gap-2">
        <span className="text-sand">BCV</span>
        <span className="text-bone">{formatBsRate(rate)}</span>
        {rate !== null && !isToday && rateDate && (
          <span className="text-bone/40" title={`Última actualización: ${rateDate}`}>
            ({rateDate.slice(5)})
          </span>
        )}
      </div>
    </div>
  );
}
