"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AudienceTabsProps {
  resident: { headline: string; benefits: { icon: string; title: string; desc: string }[] };
  board: { headline: string; benefits: { icon: string; title: string; desc: string }[] };
  cta: ReactNode;
}

/**
 * Tabs de audiencia: Residente vs Junta. Pill switcher animado con sliding bg
 * y crossfade entre paneles. Mobile-first.
 */
export function AudienceTabs({ resident, board, cta }: AudienceTabsProps) {
  const [active, setActive] = useState<"resident" | "board">("resident");

  const data = active === "resident" ? resident : board;

  return (
    <div>
      {/* Pill switcher */}
      <div className="flex justify-center mb-12">
        <div className="relative inline-flex bg-cloud border border-border rounded-full p-1 shadow-sm">
          <span
            className="absolute top-1 bottom-1 rounded-full bg-marine-deep transition-all duration-500"
            style={{
              transitionTimingFunction: "cubic-bezier(0.34, 1.4, 0.64, 1)",
              width: "calc(50% - 4px)",
              left: active === "resident" ? "4px" : "calc(50% + 0px)",
            }}
            aria-hidden="true"
          />
          <button
            onClick={() => setActive("resident")}
            className={cn(
              "relative z-10 px-6 py-2.5 rounded-full font-meta transition-colors duration-300 min-w-[140px]",
              active === "resident" ? "text-frost" : "text-mute hover:text-marine-deep",
            )}
          >
            🏠 SOY RESIDENTE
          </button>
          <button
            onClick={() => setActive("board")}
            className={cn(
              "relative z-10 px-6 py-2.5 rounded-full font-meta transition-colors duration-300 min-w-[140px]",
              active === "board" ? "text-frost" : "text-mute hover:text-marine-deep",
            )}
          >
            👔 SOY JUNTA
          </button>
        </div>
      </div>

      {/* Headline crossfade */}
      <div className="text-center max-w-2xl mx-auto mb-14 min-h-[80px]">
        <h3
          key={active}
          className="font-display text-[clamp(1.5rem,2.8vw,2rem)] leading-tight tracking-[-0.02em] text-marine-deep animate-[fadeUp_500ms_cubic-bezier(0.22,1,0.36,1)]"
        >
          {data.headline}
        </h3>
      </div>

      {/* Benefits grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {data.benefits.map((b, i) => (
          <div
            key={`${active}-${b.title}`}
            className="rounded-2xl bg-card border border-border p-6 hover-lift animate-[fadeUp_600ms_cubic-bezier(0.22,1,0.36,1)_both]"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <span className="text-3xl block mb-3" aria-hidden="true">
              {b.icon}
            </span>
            <p className="font-medium text-[14px] text-marine-deep mb-1.5">{b.title}</p>
            <p className="text-[13px] text-mute leading-relaxed">{b.desc}</p>
          </div>
        ))}
      </div>

      <div className="mt-14 flex justify-center">{cta}</div>
    </div>
  );
}
