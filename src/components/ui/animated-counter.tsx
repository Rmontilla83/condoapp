"use client";

import { useEffect, useRef, useState } from "react";

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  // Si el valor es una etiqueta no numérica, la mostramos tal cual sin animar.
  fallback?: string;
  /**
   * false = muestra el valor real desde el primer render. Para las pantallas de
   * trabajo (inicio, panel admin): contar desde 0 hacía que durante un segundo
   * el saldo dijera "$9,76" en vez de "$402,03", y una captura o una mirada
   * rápida se quedaba con el número falso. La animación queda para la landing.
   */
  animate?: boolean;
}

/**
 * Animated counter — cuenta de 0 al valor target cuando entra en viewport.
 * Usa easeOutQuart y requestAnimationFrame. Respeta prefers-reduced-motion.
 */
export function AnimatedCounter({
  value,
  duration = 1200,
  decimals = 0,
  prefix = "",
  suffix = "",
  className,
  fallback,
  animate = true,
}: AnimatedCounterProps) {
  const [current, setCurrent] = useState(animate ? 0 : value);
  const nodeRef = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const node = nodeRef.current;
    if (!animate) {
      setCurrent(value);
      return;
    }
    if (!node || started.current) return;

    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setCurrent(value);
      started.current = true;
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry || !entry.isIntersecting || started.current) return;
        started.current = true;
        const start = performance.now();
        let raf = 0;
        const tick = (now: number) => {
          // El primer frame de rAF puede traer un timestamp ANTERIOR a `start`:
          // p negativo daba un easing negativo y el contador mostraba "-1".
          const p = Math.min(Math.max((now - start) / duration, 0), 1);
          const eased = 1 - Math.pow(1 - p, 4);
          setCurrent(value * eased);
          if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        io.disconnect();
        return () => cancelAnimationFrame(raf);
      },
      { threshold: 0.25, rootMargin: "0px 0px -10% 0px" },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [value, duration, animate]);

  if (fallback !== undefined) {
    return <span className={className}>{fallback}</span>;
  }

  const display = current.toLocaleString("es-VE", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <span ref={nodeRef} className={className}>
      {prefix}
      {display}
      {suffix}
    </span>
  );
}
