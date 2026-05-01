"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface WowItem {
  number: string;          // "01"
  pill: string;            // "COBRANZA"
  title: ReactNode;        // h3 con <em>
  copy: string;
  bullets: string[];
  killer?: boolean;        // true = highlight especial (el moat)
  visual: ReactNode;       // el mockup
}

interface WowStackProps {
  items: WowItem[];
}

/**
 * Sticky scroll storytelling. La columna izquierda (visual) hace sticky
 * mientras la derecha (texto) scrollea. El visual cambia según qué item
 * está activo en viewport. Inspirado en Linear / Vercel features pages.
 */
export function WowStack({ items }: WowStackProps) {
  const [activeIdx, setActiveIdx] = useState(0);
  const itemRefs = useRef<Array<HTMLDivElement | null>>([]);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    itemRefs.current.forEach((node, idx) => {
      if (!node) return;
      const io = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
            setActiveIdx(idx);
          }
        },
        { threshold: [0.5], rootMargin: "-20% 0px -20% 0px" },
      );
      io.observe(node);
      observers.push(io);
    });
    return () => observers.forEach((io) => io.disconnect());
  }, []);

  return (
    <div className="relative">
      <div className="grid md:grid-cols-12 gap-10 md:gap-12">
        {/* Sticky visual column — desktop only */}
        <div className="hidden md:block md:col-span-6 lg:col-span-7">
          <div className="sticky top-28 h-[calc(100vh-12rem)] flex items-center justify-center">
            <div className="relative w-full max-w-[560px]">
              {items.map((item, idx) => (
                <div
                  key={item.number}
                  className="absolute inset-0 transition-all duration-700"
                  style={{
                    opacity: activeIdx === idx ? 1 : 0,
                    transform:
                      activeIdx === idx
                        ? "translateY(0) scale(1)"
                        : "translateY(24px) scale(0.96)",
                    pointerEvents: activeIdx === idx ? "auto" : "none",
                    transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
                  }}
                >
                  {item.visual}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Text column */}
        <div className="md:col-span-6 lg:col-span-5 space-y-32 md:space-y-48">
          {items.map((item, idx) => (
            <div
              key={item.number}
              ref={(el) => {
                itemRefs.current[idx] = el;
              }}
              className="min-h-[40vh] flex flex-col justify-center"
            >
              <div className="flex items-center gap-3 mb-5">
                <span className="font-meta text-cyan">
                  {item.number} · {item.pill}
                </span>
                {item.killer && (
                  <span className="inline-flex items-center gap-1.5 bg-ember/15 text-ember font-meta px-2.5 py-1 rounded-md border border-ember/30">
                    <span className="h-1.5 w-1.5 rounded-full bg-ember animate-pulse" />
                    ÚNICO EN LATAM
                  </span>
                )}
              </div>
              <h3
                className={cn(
                  "font-display leading-[1.08] tracking-[-0.025em] text-marine-deep",
                  item.killer
                    ? "text-[clamp(2rem,4vw,2.75rem)]"
                    : "text-[clamp(1.75rem,3.2vw,2.25rem)]",
                )}
              >
                {item.title}
              </h3>
              <p className="mt-5 text-[16px] text-mute leading-relaxed">
                {item.copy}
              </p>
              <ul className="mt-6 space-y-2.5" role="list">
                {item.bullets.map((b) => (
                  <li
                    key={b}
                    className="flex items-start gap-3 text-[14px] text-marine-deep/85"
                  >
                    <svg
                      className="mt-0.5 h-4 w-4 text-cyan shrink-0"
                      viewBox="0 0 20 20"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M4 10.5L8 14.5L16 6"
                        stroke="currentColor"
                        strokeWidth="1.75"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    {b}
                  </li>
                ))}
              </ul>

              {/* Mobile inline visual */}
              <div className="md:hidden mt-8 transform-gpu">{item.visual}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Progress dots — desktop sidebar */}
      <div className="hidden lg:flex absolute -left-16 top-1/2 -translate-y-1/2 flex-col gap-3">
        {items.map((item, idx) => (
          <button
            key={item.number}
            onClick={() => {
              itemRefs.current[idx]?.scrollIntoView({
                behavior: "smooth",
                block: "center",
              });
            }}
            aria-label={`Ir a ${item.pill}`}
            className={cn(
              "h-1.5 rounded-full transition-all duration-500",
              activeIdx === idx
                ? "w-8 bg-marine-deep"
                : "w-1.5 bg-marine/25 hover:bg-marine/50",
            )}
          />
        ))}
      </div>
    </div>
  );
}
