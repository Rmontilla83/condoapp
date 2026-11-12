"use client";

import { useEffect, useState } from "react";

/**
 * Invitación a instalar Atryum en el teléfono del vecino.
 *
 * Es insistente a propósito: mientras la app no esté instalada, hay una franja
 * fija bajo el encabezado en todas las pantallas, y una hoja que ocupa la
 * pantalla al entrar y vuelve a salir pasadas unas horas aunque se cierre.
 * No tiene «no volver a mostrar». Desaparece sola al instalar, y nunca sale
 * dentro de la app instalada ni en computadora.
 *
 * En Android, Chrome entrega el evento `beforeinstallprompt` (lo guarda el
 * script del layout raíz, porque puede llegar antes de que esto se monte) y
 * el botón instala de una vez. En iPhone no existe esa vía: se muestran los
 * pasos de Safari.
 */
type EventoInstalar = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

declare global {
  interface Window {
    __atryumInstalar?: EventoInstalar | null;
  }
}

const CLAVE = "atryum:instalar-visto";
/** Tras cerrar la hoja, vuelve a salir pasado este tiempo. */
const REPETIR_MS = 4 * 60 * 60 * 1000;

function yaInstalada() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function InstalarApp() {
  const [visible, setVisible] = useState(false);
  const [hoja, setHoja] = useState(false);
  const [pasos, setPasos] = useState(false);
  const [esIos, setEsIos] = useState(false);

  useEffect(() => {
    if (yaInstalada()) return;
    if (!window.matchMedia("(max-width: 767px)").matches) return;

    // Un instante después de cargar: la pantalla se pinta primero y luego sale la invitación.
    const espera = window.setTimeout(() => {
      setEsIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
      setVisible(true);
      let ultimo = 0;
      try {
        ultimo = Number(localStorage.getItem(CLAVE)) || 0;
      } catch {
        // Sin almacenamiento: la hoja sale en cada visita.
      }
      if (Date.now() - ultimo > REPETIR_MS) setHoja(true);
    }, 400);

    const instalada = () => {
      setVisible(false);
      setHoja(false);
    };
    window.addEventListener("appinstalled", instalada);
    return () => {
      window.clearTimeout(espera);
      window.removeEventListener("appinstalled", instalada);
    };
  }, []);

  const cerrar = () => {
    setHoja(false);
    setPasos(false);
    try {
      localStorage.setItem(CLAVE, String(Date.now()));
    } catch {
      // noop
    }
  };

  const instalar = async () => {
    const evento = window.__atryumInstalar;
    if (!evento) {
      // iPhone, o un navegador que no ofrece instalar con un toque.
      setPasos(true);
      return;
    }
    try {
      await evento.prompt();
      const { outcome } = await evento.userChoice;
      // El evento sirve una sola vez.
      window.__atryumInstalar = null;
      if (outcome === "accepted") {
        setVisible(false);
        setHoja(false);
      }
    } catch {
      setPasos(true);
    }
  };

  if (!visible) return null;

  return (
    <>
      <div data-print-hide className="flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-2 md:hidden">
        <p className="text-[14px] font-medium text-marine-deep">Instala Atryum en tu teléfono</p>
        <button
          type="button"
          onClick={() => setHoja(true)}
          className="h-9 shrink-0 rounded-lg bg-marine-deep px-3.5 text-[14px] font-semibold text-frost"
        >
          Instalar
        </button>
      </div>

      {hoja && (
        <div role="dialog" aria-modal="true" aria-labelledby="instalar-titulo" className="fixed inset-0 z-[80] flex items-end bg-marine-deep/60 md:hidden">
          <div className="w-full rounded-t-3xl bg-card px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-6">
            <div className="flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icon-192.png" alt="" width={56} height={56} className="h-14 w-14 rounded-2xl" />
              <div>
                <h2 id="instalar-titulo" className="font-display text-[21px] font-semibold leading-tight text-marine-deep">
                  Instala Atryum en tu teléfono
                </h2>
                <p className="mt-0.5 text-[14px] text-mute">Gratis y sin pasar por la tienda de aplicaciones.</p>
              </div>
            </div>

            {!pasos ? (
              <>
                <ul className="mt-5 space-y-2 text-[16px] text-marine-deep">
                  <li>Entras con un toque desde la pantalla de inicio.</li>
                  <li>Se abre a pantalla completa, sin la barra del navegador.</li>
                  <li>No tienes que volver a buscar el enlace.</li>
                </ul>
                <button
                  type="button"
                  onClick={instalar}
                  className="mt-6 flex h-14 w-full items-center justify-center rounded-2xl bg-marine-deep text-[17px] font-semibold text-frost"
                >
                  Instalar ahora
                </button>
              </>
            ) : (
              <>
                <p className="mt-5 text-[15px] font-medium text-marine-deep">
                  {esIos ? "En iPhone se hace desde Safari, en tres pasos:" : "Desde el navegador, en tres pasos:"}
                </p>
                <ol className="mt-3 list-decimal space-y-2 pl-5 text-[16px] text-marine-deep">
                  {esIos ? (
                    <>
                      <li>Toca el botón Compartir: el cuadro con una flecha hacia arriba.</li>
                      <li>Baja y elige «Agregar a inicio».</li>
                      <li>Toca «Agregar».</li>
                    </>
                  ) : (
                    <>
                      <li>Toca los tres puntos del navegador, arriba a la derecha.</li>
                      <li>Elige «Instalar aplicación» o «Agregar a pantalla principal».</li>
                      <li>Confirma con «Instalar».</li>
                    </>
                  )}
                </ol>
                <p className="mt-3 text-[14px] text-mute">
                  {esIos
                    ? "Si no ves el botón Compartir, abre este enlace en Safari."
                    : "Si no aparece la opción, abre este enlace en Chrome."}
                </p>
              </>
            )}

            <button
              type="button"
              onClick={cerrar}
              className="mt-3 flex h-12 w-full items-center justify-center rounded-2xl border border-border text-[16px] font-semibold text-marine-deep"
            >
              {pasos ? "Listo" : "Ahora no"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
