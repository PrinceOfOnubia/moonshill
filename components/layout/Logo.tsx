import { Link } from "next-view-transitions";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("group inline-flex items-center gap-2.5", className)}>
      <span className="relative inline-block h-9 w-9 transition-transform duration-300 group-hover:scale-105">
        <img src="/logo.svg" alt="Memebook" className="h-9 w-9 rounded-[11px] shadow-[0_4px_20px_-6px_rgba(240,185,11,0.6)]" />
        <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-green ring-2 ring-bg" />
      </span>
      <span className="font-display text-[19px] font-bold tracking-tight">
        meme<span className="text-gold-bright">book</span>
      </span>
    </Link>
  );
}
