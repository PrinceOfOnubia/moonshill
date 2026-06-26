"use client";

import { useRef } from "react";
import { Link } from "next-view-transitions";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { challenges } from "@/lib/mock";
import type { Category } from "@/lib/types";
import { compact, fmtUsd } from "@/lib/utils";

const cats: { name: Category; emoji: string }[] = [
  { name: "Memes", emoji: "🐸" },
  { name: "Threads", emoji: "🧵" },
  { name: "Videos", emoji: "🎬" },
  { name: "AI", emoji: "🤖" },
  { name: "Design", emoji: "🎨" },
  { name: "Research", emoji: "🔬" },
];

export function CategoryRail() {
  const ref = useRef<HTMLDivElement>(null);

  return (
    <section className="mt-14">
      <div className="mb-5 flex items-end justify-between">
        <div>
          <p className="text-[12px] font-medium uppercase tracking-[0.2em] text-gold-bright">Browse by lane</p>
          <h2 className="mt-1 font-display text-2xl font-bold">Pick your arena</h2>
        </div>
        <span className="hidden text-[12px] text-faint sm:block">Drag to explore →</span>
      </div>

      <motion.div ref={ref} className="overflow-hidden">
        <motion.div
          drag="x"
          dragConstraints={{ left: -((cats.length - 2.2) * 280), right: 0 }}
          dragElastic={0.08}
          className="flex cursor-grab gap-4 active:cursor-grabbing"
        >
          {cats.map((cat, i) => {
            const pool = challenges.filter((c) => c.category === cat.name).reduce((s, c) => s + c.rewardPool, 0);
            const count = challenges.filter((c) => c.category === cat.name).length;
            const cover = challenges.find((c) => c.category === cat.name)?.cover;
            return (
              <Link
                key={cat.name}
                href="/explore"
                draggable={false}
                className="ring-grad group relative block h-52 w-[260px] shrink-0 overflow-hidden rounded-[22px]"
              >
                {cover && (
                  <img src={cover} alt="" draggable={false} className="absolute inset-0 h-full w-full object-cover opacity-40 transition-opacity duration-300 group-hover:opacity-60" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-bg-2 via-bg-2/70 to-transparent" />
                <div className="relative flex h-full flex-col justify-between p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-3xl">{cat.emoji}</span>
                    <ArrowUpRight size={20} className="text-faint transition-colors group-hover:text-gold-bright" />
                  </div>
                  <div>
                    <h3 className="font-display text-xl font-bold">{cat.name}</h3>
                    <p className="mt-1 text-[13px] text-muted">{count} live · {fmtUsd(pool)} pool</p>
                  </div>
                </div>
                {i === 0 && <span className="absolute right-3 top-3 rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold text-black">HOT</span>}
              </Link>
            );
          })}
        </motion.div>
      </motion.div>
    </section>
  );
}
