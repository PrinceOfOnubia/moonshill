"use client";

import { useEffect, useState } from "react";
import { Trophy } from "lucide-react";
import { getPublicData } from "@/lib/api";

export function RewardTicker() {
  const [items, setItems] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    getPublicData()
      .then((data) => {
        if (!cancelled) setItems(data.tickerItems);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!items.length) return null;

  return (
    <div className="relative h-9 overflow-hidden border-b border-border bg-bg-2/80 backdrop-blur">
      <div className="mask-fade-x flex h-full items-center">
        <div className="flex shrink-0 animate-[marquee_40s_linear_infinite] items-center gap-8 pr-8">
          {[...items, ...items].map((it, i) => (
            <span key={i} className="flex items-center gap-2 text-[12px] whitespace-nowrap">
              <Trophy size={12} className="text-gold-bright" />
              <span className="text-text font-medium">{it}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
