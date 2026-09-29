"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Chat } from "@/app/(dashboard)/conserje/chat";
import { CaraConserje, NOMBRE_CONSERJE } from "./cara";

/**
 * Atri, disponible en todas las pantallas.
 *
 * El panel vive en el layout, así que la conversación sigue abierta al cambiar
 * de sección. En el celular:
 *  - la burbuja se apila ENCIMA de la barra "Pagar" cuando esa barra aparece
 *    (mismas reglas que PendingPayFab), para no taparla;
 *  - el panel es una hoja a pantalla completa, con el campo de escribir visible.
 */
export function ConserjeFlotante({
  primerNombre,
  modo,
  condominio,
  fabDePago,
}: {
  primerNombre: string;
  modo: "ia" | "demo";
  condominio: string;
  /** El residente tiene la barra de pago en el celular (se oculta en /pagos, inicio y conserje). */
  fabDePago: boolean;
}) {
  const pathname = usePathname();
  const [abierto, setAbierto] = useState(false);
  const [saludo, setSaludo] = useState(false);

  // Un saludo breve la primera vez que el vecino lo ve, y nunca más.
  useEffect(() => {
    try {
      if (localStorage.getItem("atri-saludo")) return;
    } catch {
      return;
    }
    // Se marca como visto apenas aparece: si el vecino cambia de página antes
    // de que se esconda, no tiene que volver a salirle en cada pantalla.
    const t = setTimeout(() => {
      setSaludo(true);
      try {
        localStorage.setItem("atri-saludo", "1");
      } catch {
        /* sin almacenamiento: vuelve a saludar la próxima vez, no pasa nada */
      }
    }, 3500);
    const f = setTimeout(() => setSaludo(false), 11000);
    return () => {
      clearTimeout(t);
      clearTimeout(f);
    };
  }, []);

  // Escape cierra el panel.
  useEffect(() => {
    if (!abierto) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && setAbierto(false);
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [abierto]);

  if (pathname?.startsWith("/conserje")) return null;

  const fabVisible =
    fabDePago && !pathname?.startsWith("/pagos") && pathname !== "/dashboard";

  return (
    <>
      {abierto && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Conversación con ${NOMBRE_CONSERJE}, el conserje`}
          className="fixed inset-0 z-[60] flex flex-col bg-card md:inset-auto md:bottom-24 md:right-6 md:h-[min(640px,calc(100dvh-8rem))] md:w-[400px] md:overflow-hidden md:rounded-2xl md:border md:border-border md:shadow-[0_30px_80px_-20px_rgb(15,46,90,0.45)]"
        >
          <div className="flex items-center gap-3 border-b border-border bg-marine-deep px-4 py-3 text-frost pt-[max(0.75rem,env(safe-area-inset-top))]">
            <CaraConserje tam={38} />
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold leading-tight">{NOMBRE_CONSERJE}</p>
              <p className="truncate text-[12px] text-frost/70">Conserje de {condominio}</p>
            </div>
            <button
              type="button"
              onClick={() => setAbierto(false)}
              aria-label="Cerrar"
              className="flex h-11 w-11 items-center justify-center rounded-full text-frost/80 hover:bg-frost/10 focus-visible:outline-2 focus-visible:outline-cyan"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="min-h-0 flex-1 pb-[env(safe-area-inset-bottom)]">
            <Chat primerNombre={primerNombre} modo={modo} variante="flotante" condominio={condominio} />
          </div>
        </div>
      )}

      {!abierto && (
        <div
          className={`fixed right-4 z-40 flex items-end gap-2 md:bottom-6 md:right-6 ${
            fabVisible ? "bottom-[9.5rem]" : "bottom-24"
          }`}
        >
          {saludo && (
            <button
              type="button"
              onClick={() => {
                setSaludo(false);
                setAbierto(true);
              }}
              className="mb-2 max-w-[14rem] rounded-2xl rounded-br-md bg-card px-3.5 py-2 text-left text-[13px] leading-snug text-marine-deep shadow-lg ring-1 ring-border animate-in fade-in slide-in-from-bottom-2 duration-300"
            >
              ¡Hola! Soy {NOMBRE_CONSERJE}. ¿Te ayudo con algo del edificio?
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setSaludo(false);
              setAbierto(true);
            }}
            aria-label={`Hablar con ${NOMBRE_CONSERJE}, el conserje`}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-marine-deep shadow-[0_14px_34px_-10px_rgb(15,46,90,0.6)] ring-4 ring-frost transition-transform hover:scale-105 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan motion-reduce:transition-none"
          >
            <CaraConserje tam={50} />
          </button>
        </div>
      )}
    </>
  );
}
