"use client";

import { useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface TiltCardProps {
  children: ReactNode;
  className?: string;
  max?: number;            // grados máximos de tilt. 6-10 se siente real sin marear.
  glare?: boolean;         // añade highlight glossy que sigue al cursor
  scale?: number;          // scale on hover. 1 = desactivado, 1.02 = sutil.
}

/**
 * Tilt card — sigue el cursor con rotación 3D + opcional glare highlight.
 * Ideal para cards hero/pricing. Respeta prefers-reduced-motion.
 */
export function TiltCard({
  children,
  className,
  max = 8,
  glare = false,
  scale = 1,
}: TiltCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const glareRef = useRef<HTMLDivElement>(null);

  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = cardRef.current;
    if (!el) return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const rotY = (x - 0.5) * 2 * max;
    const rotX = -(y - 0.5) * 2 * max;
    el.style.transform = `perspective(1000px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale(${scale})`;
    if (glare && glareRef.current) {
      glareRef.current.style.opacity = "1";
      glareRef.current.style.background = `radial-gradient(circle at ${x * 100}% ${y * 100}%, rgba(47,180,230,0.25), transparent 55%)`;
    }
  }

  function handleLeave() {
    const el = cardRef.current;
    if (!el) return;
    el.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)";
    if (glare && glareRef.current) {
      glareRef.current.style.opacity = "0";
    }
  }

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className={cn("relative will-change-transform", className)}
      style={{
        transition: "transform 480ms cubic-bezier(0.22, 1, 0.36, 1)",
        transformStyle: "preserve-3d",
      }}
    >
      {children}
      {glare && (
        <div
          ref={glareRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-0 rounded-[inherit] mix-blend-overlay"
          style={{ transition: "opacity 260ms ease-out" }}
        />
      )}
    </div>
  );
}
