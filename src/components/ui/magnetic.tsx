"use client";

import { useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface MagneticProps {
  children: ReactNode;
  strength?: number; // 0.1 sutil — 0.5 dramático. Default 0.28 (Emil-ish)
  range?: number;    // radio de atracción en px. 0 = usa el bbox
  className?: string;
  as?: "span" | "div";
}

/**
 * Magnetic wrapper — al hover, traduce el contenido hacia el cursor con spring.
 * Sin dependencias. Respeta prefers-reduced-motion.
 */
export function Magnetic({
  children,
  strength = 0.28,
  range = 0,
  className,
  as = "span",
}: MagneticProps) {
  const ref = useRef<HTMLElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  function handleMove(e: React.MouseEvent) {
    const el = ref.current;
    if (!el) return;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    if (range > 0) {
      const dist = Math.hypot(dx, dy);
      if (dist > range) {
        setPos({ x: 0, y: 0 });
        return;
      }
    }
    setPos({ x: dx * strength, y: dy * strength });
  }

  const handleLeave = () => setPos({ x: 0, y: 0 });

  const Tag = as as "span";
  return (
    <Tag
      ref={ref as React.RefObject<HTMLSpanElement>}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className={cn("inline-block will-change-transform", className)}
      style={{
        transform: `translate3d(${pos.x}px, ${pos.y}px, 0)`,
        transition: "transform 350ms cubic-bezier(0.34, 1.4, 0.64, 1)",
      }}
    >
      {children}
    </Tag>
  );
}
