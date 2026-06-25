import { Trophy } from "lucide-react";
import { tickerItems } from "@/lib/mock";

export function RewardTicker() {
  const items = [...tickerItems, ...tickerItems];
  return (
    <div className="relative h-9 overflow-hidden border-b border-border bg-bg-2/80 backdrop-blur">
      <div className="mask-fade-x flex h-full items-center">
        <div className="flex shrink-0 animate-[marquee_40s_linear_infinite] items-center gap-8 pr-8">
          {items.map((it, i) => (
            <span key={i} className="flex items-center gap-2 text-[12px] whitespace-nowrap">
              <Trophy size={12} className="text-gold-bright" />
              <span className="text-text font-medium">{it.who}</span>
              <span className="text-faint">won</span>
              <span className="font-mono font-semibold text-green">{it.amount}</span>
              <span className="text-faint">·</span>
              <span className="text-muted">{it.challenge}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
