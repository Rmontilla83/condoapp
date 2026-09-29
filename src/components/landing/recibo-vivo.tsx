"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * La portada: un recibo de condominio que vive su mes en cinco segundos.
 * Se emite, el vecino reporta su pago, la administración lo aprueba y cae el
 * sello. Es la única animación que se dispara sola en la página; con «reducir
 * movimiento» se muestra directamente el final.
 */
type Paso = 0 | 1 | 2 | 3;

const fmtUsd = (n: number) => `$${n.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtBs = (n: number) => `Bs ${n.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtTasa = (n: number) => n.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function ReciboVivo({ tasa, fechaTasa }: { tasa: number; fechaTasa: string }) {
  const monto = 213.88;
  const [paso, setPaso] = useState<Paso>(0);
  const timers = useRef<number[]>([]);

  const correr = useCallback(() => {
    timers.current.forEach(clearTimeout);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPaso(3);
      return;
    }
    setPaso(0);
    timers.current = [
      window.setTimeout(() => setPaso(1), 1300),
      window.setTimeout(() => setPaso(2), 2900),
      window.setTimeout(() => setPaso(3), 3700),
    ];
  }, []);

  useEffect(() => {
    correr();
    const t = timers.current;
    return () => t.forEach(clearTimeout);
  }, [correr]);

  const pagado = paso === 3;

  return (
    <div className="mx-auto w-full max-w-[440px]" aria-label="Ejemplo de recibo de condominio">
      <div className="relative">
      {/* El recibo */}
      <div className="relative rounded-[20px] bg-white px-7 pb-7 pt-6 text-marine-deep shadow-[0_40px_90px_-40px_rgb(15_46_90/0.55)] ring-1 ring-marine-deep/10">
        <div className="flex items-start justify-between gap-4 border-b-2 border-marine-deep pb-4">
          <div>
            <p className="font-display text-[17px] font-semibold leading-tight">Residencias El Mirador</p>
            <p className="text-[12px] text-mute">RIF J-00000000-0 · Caracas</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-mute">Recibo de condominio</p>
            <p className="font-mono text-[15px] font-semibold">N° 00000208</p>
          </div>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-y-2.5 text-[13px]">
          <dt className="text-mute">Unidad</dt>
          <dd className="text-right">Torre A · 2-6</dd>
          <dt className="text-mute">Concepto</dt>
          <dd className="text-right">Cuota de septiembre</dd>
          <dt className="text-mute">Vence</dt>
          <dd className="text-right">30 de septiembre</dd>
        </dl>

        <div className="mt-5 flex items-end justify-between border-t border-marine-deep/10 pt-4">
          <div>
            <p className="text-[12px] text-mute">Total</p>
            <p className="font-display text-[34px] font-bold leading-none tracking-[-0.03em] tabular-nums">{fmtUsd(monto)}</p>
            <p className="mt-1.5 text-[12px] text-mute tabular-nums">
              {fmtBs(monto * tasa)} · tasa BCV {fmtTasa(tasa)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[12px] text-mute">Saldo pendiente</p>
            <p
              className={`font-display text-[20px] font-semibold tabular-nums transition-colors duration-500 ${
                pagado ? "text-emerald-700" : "text-ember-ink"
              }`}
            >
              {pagado ? fmtUsd(0) : fmtUsd(monto)}
            </p>
          </div>
        </div>

        {/* El sello */}
        <div
          aria-hidden={!pagado}
          className={`pointer-events-none absolute -right-5 -top-9 rounded-lg border-[3px] border-emerald-600 bg-white/90 px-4 py-1 font-display text-[26px] font-bold uppercase tracking-[0.14em] text-emerald-700 shadow-[0_10px_24px_-12px_rgb(4_120_87/0.5)] ${
            pagado ? "sello-cae" : "opacity-0"
          }`}
        >
          Pagado
        </div>
      </div>

      {/* Lo que pasa alrededor del recibo */}
      <div className="pointer-events-none absolute left-3 right-3 top-[calc(100%-0.9rem)] space-y-2 sm:-left-10 sm:right-auto sm:w-[19rem]">
        <Aviso visible={paso >= 1} tono="vecino">
          <span className="font-medium">María reportó su pago</span>
          <span className="block text-mute">Pago móvil · ref. 00864953 · con captura</span>
        </Aviso>
        <Aviso visible={paso >= 2} tono="admin">
          <span className="font-medium">La administración lo aprobó</span>
          <span className="block text-mute">María recibe el aviso y su constancia</span>
        </Aviso>
      </div>

      </div>
      <p className="mt-36 text-[12px] text-mute">
        Tasa BCV del {fechaTasa}.{" "}
        <button type="button" onClick={correr} className="font-medium text-marine underline-offset-2 hover:underline">
          Ver el recorrido otra vez
        </button>
      </p>
    </div>
  );
}

function Aviso({ visible, tono, children }: { visible: boolean; tono: "vecino" | "admin"; children: React.ReactNode }) {
  return (
    <div
      className={`flex items-start gap-3 rounded-xl bg-white px-3.5 py-2.5 text-[12.5px] leading-snug text-marine-deep shadow-[0_18px_40px_-18px_rgb(15_46_90/0.45)] ring-1 ring-marine-deep/10 transition-all duration-500 ${
        visible ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
      }`}
    >
      <span
        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
          tono === "vecino" ? "bg-cyan/15 text-cyan-ink" : "bg-emerald-50 text-emerald-700"
        }`}
        aria-hidden="true"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          {tono === "vecino" ? (
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          )}
        </svg>
      </span>
      <span>{children}</span>
    </div>
  );
}
