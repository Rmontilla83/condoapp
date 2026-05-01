"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface FAQ {
  q: string;
  a: string;
}

interface FAQAccordionProps {
  items: FAQ[];
}

export function FAQAccordion({ items }: FAQAccordionProps) {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <div className="divide-y divide-border border-y border-border">
      {items.map((item, idx) => {
        const isOpen = openIdx === idx;
        return (
          <button
            key={item.q}
            onClick={() => setOpenIdx(isOpen ? null : idx)}
            className="w-full text-left py-6 group focus:outline-none focus:ring-2 focus:ring-cyan/40 rounded-lg px-1"
            aria-expanded={isOpen}
          >
            <div className="flex items-start justify-between gap-6">
              <h3 className="font-medium text-[16px] md:text-[18px] text-marine-deep group-hover:text-cyan transition-colors">
                {item.q}
              </h3>
              <span
                className={cn(
                  "flex-shrink-0 mt-1 w-7 h-7 rounded-full border border-marine/25 flex items-center justify-center transition-all duration-500",
                  isOpen
                    ? "bg-marine-deep border-marine-deep rotate-45"
                    : "group-hover:border-marine/50",
                )}
                style={{ transitionTimingFunction: "cubic-bezier(0.34, 1.4, 0.64, 1)" }}
              >
                <svg
                  className={cn(
                    "h-3.5 w-3.5 transition-colors",
                    isOpen ? "text-frost" : "text-marine-deep",
                  )}
                  viewBox="0 0 14 14"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M7 1V13M1 7H13"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </div>
            <div
              className="grid transition-all duration-500"
              style={{
                gridTemplateRows: isOpen ? "1fr" : "0fr",
                transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
              }}
            >
              <div className="overflow-hidden">
                <p className="mt-3 text-[15px] text-mute leading-relaxed pr-12">{item.a}</p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
