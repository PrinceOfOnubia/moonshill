"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowDown, ArrowUp, Crown, Minus, Trophy } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { VerifiedBadge } from "@/components/ui/Badge";
import { leaderboard } from "@/lib/mock";
import type { LeaderRow } from "@/lib/types";
import { cn, compact } from "@/lib/utils";

const tabs = ["Top Winners", "Top Contributors", "Top Projects"] as const;
const views = ["Weekly", "Monthly", "All Time"] as const;
type Tab = (typeof tabs)[number];

const unit: Record<Tab, (v: number) => string> = {
  "Top Winners": (v) => `$${compact(v)}`,
  "Top Contributors": (v) => `${compact(v)} pts`,
  "Top Projects": (v) => `$${compact(v)}`,
};
const metricLabel: Record<Tab, string> = {
  "Top Winners": "Rewards earned",
  "Top Contributors": "Contribution score",
  "Top Projects": "Total sponsored",
};

function rowsFor(tab: Tab): LeaderRow[] {
  if (tab === "Top Contributors") return leaderboard.contributors;
  if (tab === "Top Projects") return leaderboard.projects;
  return leaderboard.winners;
}

export function LeaderboardClient() {
  const [tab, setTab] = useState<Tab>("Top Winners");
  const [view, setView] = useState<(typeof views)[number]>("All Time");
  const rows = rowsFor(tab);
  const podium = rows.slice(0, 3);
  const rest = rows.slice(3);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 font-display text-3xl font-bold sm:text-4xl">
            <Trophy className="text-gold-bright" /> Leaderboard
          </h1>
          <p className="mt-2 text-muted">The creators and projects running the arena.</p>
        </div>
        <div className="flex rounded-full border border-border bg-surface/60 p-1">
          {views.map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors",
                view === v ? "bg-surface-2 text-text" : "text-muted hover:text-text",
              )}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* tabs */}
      <div className="no-scrollbar mb-7 flex gap-1 overflow-x-auto rounded-full border border-border bg-surface/60 p-1">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "relative flex-1 whitespace-nowrap rounded-full px-4 py-2.5 text-[13px] font-semibold transition-colors",
              tab === t ? "text-black" : "text-muted hover:text-text",
            )}
          >
            {tab === t && (
              <motion.span layoutId="lbtab" className="absolute inset-0 rounded-full bg-gradient-to-b from-gold-bright to-gold" transition={{ type: "spring", stiffness: 380, damping: 30 }} />
            )}
            <span className="relative">{t}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab + view} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
          {/* podium */}
          <div className="mb-6 grid grid-cols-3 gap-3 sm:gap-4">
            {[podium[1], podium[0], podium[2]].map((r, idx) => {
              const place = idx === 1 ? 1 : idx === 0 ? 2 : 3;
              const tall = place === 1;
              return (
                <div key={r.id} className={cn("flex flex-col items-center", tall ? "order-2" : place === 2 ? "order-1" : "order-3")}>
                  <div className={cn("relative", tall ? "mb-3" : "mb-2 mt-6")}>
                    {tall && <Crown className="absolute -top-7 left-1/2 -translate-x-1/2 text-gold-bright" size={26} />}
                    <Avatar src={r.avatar} alt={r.name} size={tall ? 78 : 60} verified={r.verified} ring={tall} />
                    <span className={cn(
                      "absolute -bottom-1 left-1/2 grid -translate-x-1/2 place-items-center rounded-full border-2 border-bg font-mono text-[12px] font-bold",
                      place === 1 ? "h-7 w-7 bg-gold text-black" : place === 2 ? "h-6 w-6 bg-surface-3 text-text" : "h-6 w-6 bg-[#cd7f32] text-black",
                    )}>{place}</span>
                  </div>
                  <p className="mt-1 max-w-full truncate text-center text-[13px] font-semibold sm:text-sm">{r.name}</p>
                  <p className={cn("font-mono text-sm font-bold", tall ? "text-gold-bright" : "text-text")}>{unit[tab](r.value)}</p>
                  <div className={cn(
                    "mt-2 w-full rounded-t-xl bg-gradient-to-t",
                    tall ? "h-16 from-gold/25 to-gold/5" : "h-10 from-surface-2 to-transparent",
                  )} />
                </div>
              );
            })}
          </div>

          {/* list */}
          <div className="overflow-hidden rounded-[20px] border border-border bg-surface/40">
            <div className="flex items-center gap-4 border-b border-border px-5 py-3 text-[12px] font-medium uppercase tracking-wider text-faint">
              <span className="w-8">#</span>
              <span className="flex-1">Name</span>
              <span className="hidden w-20 text-right sm:block">Wins</span>
              <span className="w-28 text-right">{metricLabel[tab]}</span>
            </div>
            {rest.map((r, i) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center gap-4 border-b border-border/60 px-5 py-3.5 transition-colors last:border-0 hover:bg-surface/60"
              >
                <span className="w-8 font-mono text-sm text-faint">{r.rank}</span>
                <div className="flex flex-1 items-center gap-3">
                  <Avatar src={r.avatar} alt={r.name} size={36} verified={r.verified} />
                  <div className="min-w-0">
                    <p className="flex items-center gap-1 truncate text-sm font-medium">
                      {r.name} {r.verified && <VerifiedBadge size={13} />}
                    </p>
                    <p className="truncate text-[12px] text-faint">@{r.handle}</p>
                  </div>
                  <Delta d={r.delta} />
                </div>
                <span className="hidden w-20 text-right font-mono text-sm text-muted sm:block">{r.wins}</span>
                <span className="w-28 text-right font-mono text-sm font-semibold text-green">{unit[tab](r.value)}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function Delta({ d }: { d: number }) {
  if (d === 0) return <Minus size={13} className="text-faint" />;
  return d > 0 ? (
    <span className="flex items-center text-[11px] text-green"><ArrowUp size={12} />{d}</span>
  ) : (
    <span className="flex items-center text-[11px] text-red"><ArrowDown size={12} />{Math.abs(d)}</span>
  );
}
