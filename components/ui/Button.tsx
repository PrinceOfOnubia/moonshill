"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "ghost" | "glass" | "outline" | "green";
type Size = "sm" | "md" | "lg";

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  /** Deprecated — kept for compatibility; no longer applies a magnetic effect. */
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
  { className, variant = "primary", size = "md", magnetic: _magnetic, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap select-none cursor-pointer transition-colors duration-200 active:opacity-90 disabled:opacity-50 disabled:pointer-events-none",
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
});
