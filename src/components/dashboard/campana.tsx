"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { marcarAvisosLeidos } from "@/app/(dashboard)/avisos-actions";

export interface AvisoFila {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

function hace(iso: string) {
  const min = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (min < 1) return "ahora";
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? "ayer" : `hace ${d} días`;
}

// Íconos de línea (la marca reemplazó los emojis por íconos geométricos).
const ICONO: Record<string, string> = {
  visita_llego: "M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l3 3m0 0l-3 3m3-3H2.25",
  paquete_recibido: "M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9",
  paquete_entregado: "M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  recordatorio_pago: "M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z",
  averia_actualizada: "M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63",
};

/**
 * La campana de avisos: visitas que llegaron, paquetes en la garita,
 * recordatorios. Al abrirla se marcan como leídos.
 */
export function Campana({ avisos: iniciales }: { avisos: AvisoFila[] }) {
  const [avisos, setAvisos] = useState(iniciales);
  const [abierta, setAbierta] = useState(false);
  const caja = useRef<HTMLDivElement>(null);
  const sinLeer = avisos.filter((a) => !a.read_at).length;

  useEffect(() => setAvisos(iniciales), [iniciales]);

  useEffect(() => {
    if (!abierta) return;
    const fuera = (e: MouseEvent) => {
      if (caja.current && !caja.current.contains(e.target as Node)) setAbierta(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setAbierta(false);
    document.addEventListener("mousedown", fuera);
    window.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", fuera);
      window.removeEventListener("keydown", esc);
    };
  }, [abierta]);

  function abrir() {
    const nueva = !abierta;
    setAbierta(nueva);
    if (nueva && sinLeer > 0) {
      void marcarAvisosLeidos();
      // Se muestran como no leídos mientras está abierta; al cerrar ya cuentan como leídos.
      setTimeout(() => setAvisos((prev) => prev.map((a) => ({ ...a, read_at: a.read_at ?? new Date().toISOString() }))), 4000);
    }
  }

  return (
    <div ref={caja} className="relative">
      <button
        type="button"
        onClick={abrir}
        aria-label={sinLeer ? `Avisos: ${sinLeer} sin leer` : "Avisos"}
        aria-expanded={abierta}
        className="relative flex h-10 w-10 items-center justify-center rounded-full text-marine-deep hover:bg-cloud focus-visible:outline-2 focus-visible:outline-cyan"
      >
        <svg className="h-[22px] w-[22px]" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
        {sinLeer > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-ember px-1 text-[11px] font-semibold text-white">
            {sinLeer > 9 ? "9+" : sinLeer}
          </span>
        )}
      </button>

      {abierta && (
        <div className="absolute right-0 top-12 z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-border bg-card shadow-[0_24px_60px_-20px_rgb(15,46,90,0.4)]">
          <p className="border-b border-border px-4 py-3 text-[14px] font-semibold text-marine-deep">Avisos</p>
          {avisos.length === 0 ? (
            <p className="px-4 py-8 text-center text-[14px] text-mute">
              Aquí te avisamos cuando llegue una visita, un paquete o algo que requiera tu atención.
            </p>
          ) : (
            <ul className="max-h-[60vh] divide-y divide-border overflow-y-auto">
              {avisos.map((a) => {
                const contenido = (
                  <div className={`flex gap-3 px-4 py-3 ${a.read_at ? "" : "bg-cyan/5"}`}>
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-marine-deep/5 text-marine-deep" aria-hidden="true">
                      <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d={ICONO[a.kind] ?? ICONO.paquete_entregado} />
                      </svg>
                    </span>
                    <div className="min-w-0">
                      <p className="text-[14px] font-medium text-marine-deep">{a.title}</p>
                      {a.body && <p className="mt-0.5 text-[13px] text-mute">{a.body}</p>}
                      <p className="mt-1 text-[12px] text-mute">{hace(a.created_at)}</p>
                    </div>
                  </div>
                );
                return (
                  <li key={a.id}>
                    {a.link ? (
                      <Link href={a.link} onClick={() => setAbierta(false)} className="block hover:bg-cloud/50">
                        {contenido}
                      </Link>
                    ) : (
                      contenido
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
