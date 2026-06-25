"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { ChallengeCard } from "@/components/challenge/ChallengeCard";
import { challenges } from "@/lib/mock";
import type { Category } from "@/lib/types";
import { cn } from "@/lib/utils";

const categories: (Category | "All")[] = ["All", "Memes", "Threads", "Videos", "AI", "Design", "Research"];
const sorts = ["Trending", "Newest", "Highest Rewards", "Ending Soon"] as const;
type Sort = (typeof sorts)[number];

export function ExploreClient() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<(typeof categories)[number]>("All");
  const [sort, setSort] = useState<Sort>("Trending");

  const list = useMemo(() => {
    let l = challenges.filter((c) => {
      const matchesCat = cat === "All" || c.category === cat;
      const matchesQ =
        !q ||
        c.title.toLowerCase().includes(q.toLowerCase()) ||
        c.creator.name.toLowerCase().includes(q.toLowerCase());
      return matchesCat && matchesQ;
    });
    switch (sort) {
      case "Newest":
        l = l.sort((a, b) => +new Date(b.startsAt) - +new Date(a.startsAt));
        break;
      case "Highest Rewards":
        l = l.sort((a, b) => b.rewardPool - a.rewardPool);
        break;
      case "Ending Soon":
        l = l.sort((a, b) => +new Date(a.endsAt) - +new Date(b.endsAt));
        break;
      default:
        l = l.sort((a, b) => b.trending - a.trending);
    }
    return l;
  }, [q, cat, sort]);

  return (
    <div>
      {/* heading */}
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold sm:text-4xl">Explore the arena</h1>
        <p className="mt-2 text-muted">Find your next mission. {challenges.length} live challenges.</p>
      </div>

      {/* search */}
      <div className="sticky top-16 z-30 -mx-4 border-b border-border bg-bg/85 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6">
        <div className="flex h-12 items-center gap-3 rounded-2xl border border-border bg-surface px-4 focus-within:border-gold/50">
          <Search size={18} className="text-faint" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search challenges, creators, projects…"
            className="h-full flex-1 bg-transparent text-[15px] outline-none placeholder:text-faint"
          />
          {q && (
            <button onClick={() => setQ("")} className="text-faint hover:text-text">
              <X size={16} />
            </button>
          )}
        </div>

        {/* category chips */}
        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={cn(
                "whitespace-nowrap rounded-full border px-4 py-1.5 text-[13px] font-medium transition-colors",
                cat === c
                  ? "border-gold/40 bg-gold/12 text-gold-bright"
                  : "border-border bg-surface text-muted hover:text-text",
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* sort row */}
      <div className="mt-5 flex items-center gap-3 overflow-x-auto no-scrollbar">
        <span className="flex shrink-0 items-center gap-1.5 text-[13px] text-faint">
          <SlidersHorizontal size={14} /> Sort
        </span>
        {sorts.map((s) => (
          <button
            key={s}
            onClick={() => setSort(s)}
            className={cn(
              "whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors",
              sort === s ? "bg-surface-2 text-text" : "text-muted hover:text-text",
            )}
          >
            {s}
          </button>
        ))}
        <span className="ml-auto shrink-0 text-[13px] text-faint">{list.length} results</span>
      </div>

      {/* grid */}
      {list.length ? (
        <motion.div layout className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((c, i) => (
            <ChallengeCard key={c.id} c={c} index={i} />
          ))}
        </motion.div>
      ) : (
        <div className="mt-20 text-center">
          <p className="font-display text-xl font-semibold">No challenges found</p>
          <p className="mt-1 text-muted">Try a different category or search term.</p>
        </div>
      )}
    </div>
  );
}
