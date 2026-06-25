"use client";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { forwardRef, useRef } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "ghost" | "glass" | "outline" | "green";
type Size = "sm" | "md" | "lg";

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  magnetic?: boolean;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-gradient-to-b from-gold-bright to-gold text-black font-semibold hover:shadow-[0_10px_40px_-8px_rgba(240,185,11,0.6)]",
  green:
    "bg-gradient-to-b from-green to-green-dim text-black font-semibold hover:shadow-[0_10px_40px_-8px_rgba(14,203,129,0.55)]",
  glass: "glass text-text hover:bg-surface-2",
  outline: "border border-border-strong text-text hover:border-gold/60 hover:text-gold-bright",
  ghost: "text-muted hover:text-text hover:bg-surface",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-[13px] rounded-[12px]",
  md: "h-11 px-5 text-sm rounded-[14px]",
  lg: "h-14 px-7 text-[15px] rounded-[16px]",
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { className, variant = "primary", size = "md", magnetic = false, children, ...rest },
  _ref,
) {
  const ref = useRef<HTMLButtonElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const x = useSpring(mx, { stiffness: 300, damping: 20 });
  const y = useSpring(my, { stiffness: 300, damping: 20 });
  const tx = useTransform(x, (v) => v * 0.35);
  const ty = useTransform(y, (v) => v * 0.35);

  function onMove(e: React.MouseEvent) {
    if (!magnetic || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    mx.set(e.clientX - (r.left + r.width / 2));
    my.set(e.clientY - (r.top + r.height / 2));
  }
  function onLeave() {
    mx.set(0);
    my.set(0);
  }

  return (
    <motion.button
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={magnetic ? { x: tx, y: ty } : undefined}
      whileTap={{ scale: 0.96 }}
      className={cn(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap transition-all duration-300 select-none cursor-pointer disabled:opacity-50 disabled:pointer-events-none",
        variants[variant],
        sizes[size],
        className,
      )}
      {...(rest as any)}
    >
      {children}
    </motion.button>
  );
});
