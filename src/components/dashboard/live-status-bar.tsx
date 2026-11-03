"use client";

import { bs, hora12 } from "@/lib/format";
import { todayInTimeZone } from "@/lib/utils";
import { useEffect, useState } from "react";

interface LiveStatusBarProps {
  initialRate: number | null;
  initialDate: string | null;
}

// Venezuela: UTC-4, sin DST. Usamos Intl con timezone "America/Caracas"
// que siempre devuelve la hora correcta sin depender del offset local.
function getVenezuelaTime(): string {
  return hora12(new Date());
}

function formatBsRate(rate: number | null): string {
  if (!rate || rate <= 0) return "—";
  return bs(rate);
}

export function LiveStatusBar({ initialRate, initialDate }: LiveStatusBarProps) {
  const [time, setTime] = useState(() => getVenezuelaTime());
  const [rate, setRate] = useState<number | null>(initialRate);
  const [rateDate, setRateDate] = useState<string | null>(initialDate);
  // Se calcula al montar: en el servidor y en el navegador puede dar otro día.
  const [hoy, setHoy] = useState<string | null>(null);

  // Reloj: actualiza cada 30s para mantener los minutos al día sin
  // ser agresivo. El Intl.DateTimeFormat recalcula al cambiar el estado.
  useEffect(() => {
    const tick = () => {
      setTime(getVenezuelaTime());
      setHoy(todayInTimeZone());
    };
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

  const isToday = hoy === null || rateDate === hoy;

  return (
    <div className="flex items-center gap-4 font-meta text-frost/80">
      <div className="flex items-center gap-2">
        <span className="text-ember">VE</span>
        {/* El servidor y el navegador pueden estar en minutos distintos. El efecto de arriba lo corrige al montar. */}
        <span className="text-frost" suppressHydrationWarning>{time}</span>
      </div>
      <span className="text-frost/30" aria-hidden="true">·</span>
      <div className="flex items-center gap-2">
        <span className="text-ember">BCV</span>
        <span className="text-frost">{formatBsRate(rate)}</span>
        {rate !== null && !isToday && rateDate && (
          <span className="text-frost/40" title={`Última actualización: ${rateDate}`}>
            ({rateDate.slice(5)})
          </span>
        )}
      </div>
    </div>
  );
}
