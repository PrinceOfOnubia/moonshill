"use client";

import { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";
import { compact } from "@/lib/utils";

export function AnimatedNumber({
  value,
  prefix = "",
  suffix = "",
  useCompact = false,
  decimals = 0,
  className,
  duration = 1300,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  useCompact?: boolean;
  decimals?: number;
  className?: string;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min((t - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(value * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, duration]);

  const text = useCompact
    ? compact(display, 1)
    : display.toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });

  return (
    <span ref={ref} className={className}>
      {prefix}
      {text}
      {suffix}
    </span>
  );
}
