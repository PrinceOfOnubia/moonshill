"use client";

import { motion } from "framer-motion";
import { BookOpen, ChevronRight, DollarSign, Flag, Trophy, Users } from "lucide-react";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { useAuth } from "@/components/providers/AuthProvider";
import { ContractAddress } from "./ContractAddress";

type Stat = {
  icon: typeof Users;
  label: string;
  tint: string;
  value?: number;
  display?: string;
};

const stats: Stat[] = [
  { icon: Users, value: 24_560, label: "Total Users", tint: "text-gold-bright" },
  { icon: Flag, value: 1_248, label: "Challenges", tint: "text-violet-400" },
  { icon: Trophy, value: 320, label: "Winners", tint: "text-gold-bright" },
  { icon: DollarSign, display: "$1.45M", label: "Rewards Distributed", tint: "text-green" },
];

export function LandingHero() {
  const { openConnect } = useAuth();

  return (
    <section className="relative">
      <div className="grid items-center gap-10 py-8 lg:grid-cols-[1.05fr_0.95fr] lg:py-12">
        {/* left — pitch */}
        <div>
          <span className="inline-flex items-center rounded-full border border-gold/40 bg-gold/5 px-4 py-1.5 text-[12px] font-bold uppercase tracking-[0.12em] text-gold-bright">
            Create. Compete. Earn.
          </span>

          <h1 className="mt-6 font-display text-[42px] font-bold leading-[1.04] tracking-tight sm:text-[58px]">
            Create challenges.
            <br />
            Grow your community.
            <br />
            <span className="text-gold-grad">Earn $BOOKS.</span>
          </h1>

          <p className="mt-6 max-w-md text-[16px] leading-relaxed text-muted">
            Memebook is the home for crypto communities. Complete challenges, earn{" "}
            <span className="font-medium text-gold-bright">rewards</span> and climb the leaderboard.
          </p>

          <ContractAddress className="mt-7 w-full max-w-sm" />

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              onClick={openConnect}
              className="flex h-14 items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-b from-gold-bright to-gold px-7 text-[15px] font-semibold text-black transition-shadow hover:shadow-[0_12px_44px_-8px_rgba(240,185,11,0.65)]"
            >
              <BookOpen size={19} /> Open the Book
            </button>
            <button
              onClick={openConnect}
              className="flex h-14 items-center justify-center gap-2 rounded-2xl border border-border-strong bg-surface px-7 text-[15px] font-semibold text-text transition-colors hover:border-gold/50 hover:text-gold-bright"
            >
              <ChevronRight size={18} className="text-gold-bright" /> Explore Challenges
            </button>
          </div>
        </div>

        {/* right — 3D book visual */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: [0.21, 0.47, 0.32, 0.98] }}
          className="relative mx-auto w-full max-w-[520px]"
        >
          <div className="pointer-events-none absolute inset-0 -z-10 bg-gold/12 blur-[120px]" />
          <img
            src="/hero-book.png"
            alt="Memebook"
            draggable={false}
            className="w-full select-none"
            style={{
              WebkitMaskImage:
                "radial-gradient(ellipse 78% 78% at 50% 50%, #000 62%, transparent 92%)",
              maskImage:
                "radial-gradient(ellipse 78% 78% at 50% 50%, #000 62%, transparent 92%)",
            }}
          />
        </motion.div>
      </div>

      {/* stat bar */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-border bg-border sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="flex items-center gap-3.5 bg-bg-2 px-5 py-6">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-surface-2">
              <s.icon size={20} className={s.tint} />
            </span>
            <div>
              <div className="font-mono text-xl font-bold text-text sm:text-2xl">
                {s.display ? s.display : <AnimatedNumber value={s.value!} />}
              </div>
              <div className="text-[12px] text-faint">{s.label}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
