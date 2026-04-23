"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const mainItems = [
  {
    href: "/dashboard",
    label: "Inicio",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
      </svg>
    ),
  },
  {
    href: "/pagos",
    label: "Pagos",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
      </svg>
    ),
  },
  {
    href: "/visitantes",
    label: "QR",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
      </svg>
    ),
  },
  {
    href: "/mantenimiento",
    label: "Reportes",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.384 3.174A1 1 0 014.5 17.447V6.553a1 1 0 011.536-.897l5.384 3.174m0 0l5.384-3.174A1 1 0 0118.34 6.553v10.894a1 1 0 01-1.536.897l-5.384-3.174" />
      </svg>
    ),
  },
];

const moreItemsBase = [
  { href: "/comunicados", label: "Comunicados", adminOnly: false },
  { href: "/finanzas", label: "Finanzas", adminOnly: false },
  { href: "/reservas", label: "Reservas", adminOnly: false },
  { href: "/votaciones", label: "Votaciones", adminOnly: false },
  { href: "/mi-unidad", label: "Mi unidad", adminOnly: false },
  { href: "/admin", label: "Admin", adminOnly: true },
  { href: "/perfil", label: "Perfil", adminOnly: false },
];

export function BottomNav({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  const [showMore, setShowMore] = useState(false);

  const moreItems = moreItemsBase.filter((item) => !item.adminOnly || isAdmin);

  const isMoreActive = moreItems.some(
    (item) => pathname === item.href || pathname.startsWith(item.href + "/")
  );

  return (
    <>
      {/* More menu overlay */}
      {showMore && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setShowMore(false)}>
          <div className="absolute inset-0 bg-marine-deep/30" />
          <div className="absolute bottom-20 right-3 left-3 bg-card rounded-2xl border border-border shadow-2xl p-2 animate-in fade-in slide-in-from-bottom-4 duration-200">
            <div className="grid grid-cols-3 gap-1">
              {moreItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setShowMore(false)}
                    className={`flex items-center justify-center rounded-lg px-3 py-3 text-[12px] font-medium transition-colors ${
                      isActive ? "bg-marine-deep text-frost" : "text-marine-deep/70 hover:bg-cloud/50"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Bottom bar — Ink background */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-sidebar text-sidebar-foreground md:hidden">
        <div className="flex items-center justify-around py-2">
          {mainItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 px-3 py-1.5 text-[10px] font-medium transition-colors ${
                  isActive ? "text-ember" : "text-sidebar-foreground/60"
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
          <button
            onClick={() => setShowMore(!showMore)}
            className={`flex flex-col items-center gap-1 px-3 py-1.5 text-[10px] font-medium transition-colors ${
              isMoreActive || showMore ? "text-ember" : "text-sidebar-foreground/60"
            }`}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
            Más
          </button>
        </div>
      </nav>
    </>
  );
}
