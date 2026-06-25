import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "gold" | "green" | "blue" | "neutral" | "red" | "violet";

const tones: Record<Tone, string> = {
  gold: "bg-gold/12 text-gold-bright border-gold/25",
  green: "bg-green/12 text-green border-green/25",
  blue: "bg-blue/12 text-blue border-blue/25",
  violet: "bg-violet/12 text-violet border-violet/25",
  red: "bg-red/12 text-red border-red/25",
  neutral: "bg-surface-2 text-muted border-border-strong",
};

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium tracking-wide uppercase",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function VerifiedBadge({
  size = 16,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <BadgeCheck
      size={size}
      className={cn("text-blue fill-blue/15 shrink-0", className)}
      strokeWidth={2.25}
      aria-label="Verified"
    />
  );
}
