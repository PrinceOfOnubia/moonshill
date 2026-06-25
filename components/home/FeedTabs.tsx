"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChallengeCard } from "@/components/challenge/ChallengeCard";
import { challenges } from "@/lib/mock";
import { cn } from "@/lib/utils";

const tabs = ["For You", "Trending", "Official", "Newest"] as const;
type Tab = (typeof tabs)[number];

function sortFor(tab: Tab) {
  const list = [...challenges];
  switch (tab) {
    case "Trending":
      return list.sort((a, b) => b.trending - a.trending);
    case "Official":
      return list.filter((c) => c.official);
    case "Newest":
      return list.sort((a, b) => +new Date(b.startsAt) - +new Date(a.startsAt));
    default:
      return list.sort((a, b) => b.participants + b.trending - (a.participants + a.trending));
  }
}

export function FeedTabs() {
  const [tab, setTab] = useState<Tab>("For You");
  const list = sortFor(tab);

  return (
    <section className="mt-12">
      <div className="flex items-end justify-between gap-4">
        <h2 className="font-display text-2xl font-bold">The Arena</h2>
        <div className="no-scrollbar flex gap-1 overflow-x-auto rounded-full border border-border bg-surface/60 p-1">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "relative whitespace-nowrap rounded-full px-4 py-2 text-[13px] font-medium transition-colors",
                tab === t ? "text-black" : "text-muted hover:text-text",
              )}
            >
              {tab === t && (
                <motion.span
                  layoutId="feedtab"
                  className="absolute inset-0 rounded-full bg-gradient-to-b from-gold-bright to-gold"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <span className="relative">{t}</span>
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {list.map((c, i) => (
            <ChallengeCard key={c.id} c={c} index={i} />
          ))}
        </motion.div>
      </AnimatePresence>
    </section>
  );
}
