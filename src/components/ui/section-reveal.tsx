"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionRevealProps {
  children: ReactNode;
  className?: string;
  stagger?: number;       // ms entre hijos
  delay?: number;         // ms inicial
  direction?: "up" | "fade" | "right";
  once?: boolean;
  as?: "section" | "div" | "article";
}

/**
 * Reveal on scroll con stagger automático. Aplica a cada hijo directo un
 * transition delay incremental. Estilo Linear/Vercel.
 */
export function SectionReveal({
  children,
  className,
  stagger = 80,
  delay = 0,
  direction = "up",
  once = true,
  as = "div",
}: SectionRevealProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const children = Array.from(node.children) as HTMLElement[];
    children.forEach((child, i) => {
      child.style.opacity = "0";
      child.style.transform =
        direction === "up"
          ? "translate3d(0, 24px, 0)"
          : direction === "right"
          ? "translate3d(-24px, 0, 0)"
          : "translate3d(0, 0, 0)";
      child.style.transition = `opacity 720ms cubic-bezier(0.22, 1, 0.36, 1) ${
        delay + i * stagger
      }ms, transform 720ms cubic-bezier(0.22, 1, 0.36, 1) ${delay + i * stagger}ms`;
      child.style.willChange = "opacity, transform";
    });

    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      children.forEach((c) => {
        c.style.opacity = "1";
        c.style.transform = "none";
      });
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            children.forEach((c) => {
              c.style.opacity = "1";
              c.style.transform = "translate3d(0, 0, 0)";
            });
            if (once) io.disconnect();
          } else if (!once) {
            children.forEach((c) => {
              c.style.opacity = "0";
              c.style.transform =
                direction === "up"
                  ? "translate3d(0, 24px, 0)"
                  : "translate3d(-24px, 0, 0)";
            });
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [stagger, delay, direction, once]);

  const Component = as;
  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <Component ref={containerRef as any} className={cn(className)}>
      {children}
    </Component>
  );
}
