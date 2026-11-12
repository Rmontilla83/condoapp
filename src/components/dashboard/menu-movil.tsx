"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * El menú del residente en el teléfono: un botón arriba que abre una hoja a
 * pantalla completa con todas las secciones, en filas grandes. Reemplaza a la
 * barra inferior: el inicio es Atri con sus botones, y aquí queda lo demás.
 */
const SECCIONES: { titulo: string; items: { href: string; texto: string }[] }[] = [
  {
    titulo: "Lo de todos los días",
    items: [
      { href: "/dashboard", texto: "Inicio" },
      { href: "/pagos", texto: "Pagos y estado de cuenta" },
      { href: "/mantenimiento", texto: "Reportar una avería" },
      { href: "/visitantes", texto: "Invitar una visita" },
      { href: "/reservas", texto: "Reservar un área" },
      { href: "/comunicados", texto: "Avisos" },
    ],
  },
  {
    titulo: "Más",
    items: [
      { href: "/conserje", texto: "Hablar con Atri" },
      { href: "/finanzas", texto: "Finanzas del condominio" },
      { href: "/documentos", texto: "Documentos" },
      { href: "/decisiones", texto: "Decisiones y consultas" },
      { href: "/servicios", texto: "Técnicos y servicios" },
      { href: "/mi-unidad", texto: "Mi unidad" },
      { href: "/perfil", texto: "Mi perfil" },
    ],
  },
];

export function MenuMovil() {
  const pathname = usePathname();
  const [abierto, setAbierto] = useState(false);

  // Al llegar a otra pantalla, el menú se cierra solo.
  useEffect(() => setAbierto(false), [pathname]);
  useEffect(() => {
    if (!abierto) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && setAbierto(false);
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [abierto]);

  const activo = (href: string) => pathname === href || pathname?.startsWith(href + "/");

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        aria-haspopup="dialog"
        aria-expanded={abierto}
        className="flex h-11 items-center gap-2 rounded-xl border border-border bg-card px-3.5 text-[15px] font-semibold text-marine-deep md:hidden"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" className="h-5 w-5">
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
        Menú
      </button>

      {abierto && (
        <div role="dialog" aria-modal="true" aria-label="Menú" className="fixed inset-0 z-[70] flex flex-col bg-background md:hidden">
          <div className="flex items-center justify-between border-b border-border bg-card px-5 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <p className="font-display text-[20px] font-semibold text-marine-deep">Menú</p>
            <button
              type="button"
              onClick={() => setAbierto(false)}
              className="flex h-11 items-center gap-2 rounded-xl border border-border px-3.5 text-[15px] font-semibold text-marine-deep"
            >
              Cerrar
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4">
            {SECCIONES.map((s) => (
              <section key={s.titulo} className="mb-6">
                <h2 className="mb-2 text-[13px] font-medium text-mute">{s.titulo}</h2>
                <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
                  {s.items.map((i) => (
                    <li key={i.href}>
                      <Link
                        href={i.href}
                        onClick={() => setAbierto(false)}
                        aria-current={activo(i.href) ? "page" : undefined}
                        className={`flex min-h-[56px] items-center justify-between gap-3 px-4 text-[16px] font-medium ${
                          activo(i.href) ? "bg-marine-deep text-frost" : "text-marine-deep"
                        }`}
                      >
                        {i.texto}
                        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 opacity-50">
                          <path d="m9 6 6 6-6 6" />
                        </svg>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
