"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { DollarSign, Flag, Send, Trophy, Users } from "lucide-react";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { useAuth } from "@/components/providers/AuthProvider";
import { getPublicData } from "@/lib/api";
import { ContractAddress } from "./ContractAddress";
import { SOCIALS, TelegramIcon, XIcon } from "./social";

type Stat = {
  icon: typeof Users;
  label: string;
  tint: string;
  value?: number;
  display?: string;
};

export function LandingHero() {
  const { openConnect } = useAuth();
  const [stats, setStats] = useState<Stat[]>([
    { icon: Users, value: 0, label: "Total Users", tint: "text-gold-bright" },
    { icon: Flag, value: 0, label: "Campaigns", tint: "text-violet-400" },
    { icon: Trophy, value: 0, label: "Winners", tint: "text-gold-bright" },
    { icon: DollarSign, display: "$0", label: "Total Rewards", tint: "text-green" },
  ]);

  useEffect(() => {
    let cancelled = false;
    getPublicData()
      .then((data) => {
        if (cancelled) return;
        setStats([
          { icon: Users, value: data.platformStats.creators, label: "Total Users", tint: "text-gold-bright" },
          { icon: Flag, value: data.platformStats.activeChallenges, label: "Campaigns", tint: "text-violet-400" },
          { icon: Trophy, value: data.platformStats.winners, label: "Winners", tint: "text-gold-bright" },
          { icon: DollarSign, display: `$${new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(data.platformStats.totalRewards)}`, label: "Total Rewards", tint: "text-green" },
        ]);
      })
      .catch(() => {
        if (cancelled) return;
        setStats([
          { icon: Users, value: 0, label: "Total Users", tint: "text-gold-bright" },
          { icon: Flag, value: 0, label: "Campaigns", tint: "text-violet-400" },
          { icon: Trophy, value: 0, label: "Winners", tint: "text-gold-bright" },
          { icon: DollarSign, display: "$0", label: "Total Rewards", tint: "text-green" },
        ]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="relative">
      {/* full-bleed hero — the artwork blends straight into the page */}
      <div className="relative ml-[calc(50%-50vw)] w-screen overflow-hidden bg-black">
        {/* coin / chevron artwork */}
        <motion.img
          src="/hero-bg.jpg"
          alt=""
          aria-hidden
          draggable={false}
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, ease: [0.21, 0.47, 0.32, 0.98] }}
          className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover object-right"
        />
        <div className="pointer-events-none absolute inset-0 bg-black/45 md:hidden" />
        {/* smooth fade from the artwork into the black page below */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-b from-transparent via-black/70 to-black" />
        {/* content — constrained to the page grid */}
        <div className="relative mx-auto max-w-[1240px] px-4 py-20 sm:px-6 sm:py-24 lg:py-32">
          <div className="max-w-lg">
            <span className="inline-flex items-center rounded-full border border-gold/40 bg-gold/5 px-4 py-1.5 text-[12px] font-bold uppercase tracking-[0.12em] text-gold-bright">
              Create. Compete. Earn.
            </span>

            <h1 className="mt-6 font-display text-[44px] font-bold leading-[1.02] tracking-tight sm:text-[62px]">
              Your Web3
              <br />
              <span className="text-gold-grad">Attention Engine</span>
            </h1>

            <p className="mt-5 text-[17px] font-medium text-muted">
              Grow. Engage. Earn.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => openConnect("/home")}
                className="flex h-14 items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-b from-gold-bright to-gold px-7 text-[15px] font-semibold text-black transition-shadow hover:shadow-[0_12px_44px_-8px_rgba(240,185,11,0.65)]"
              >
                Launch App <Send size={18} />
              </button>
              <Link
                href="/build"
                className="flex h-14 items-center justify-center gap-2 rounded-2xl border border-border-strong bg-black/40 px-7 text-[15px] font-semibold text-text backdrop-blur transition-colors hover:border-gold/50 hover:text-gold-bright"
              >
                Build with Moonshill
              </Link>
            </div>

            <ContractAddress className="mt-7 w-full max-w-sm" />
          </div>

          {/* social rail — pinned to the content edge */}
          <div className="absolute bottom-6 right-4 hidden items-center gap-1 rounded-2xl border border-white/10 bg-black/40 px-1.5 py-1.5 backdrop-blur sm:right-6 sm:flex">
            <HeroSocial href={SOCIALS.x} label="X">
              <XIcon size={16} />
            </HeroSocial>
            <span className="h-5 w-px bg-white/10" />
            <HeroSocial href={SOCIALS.telegram} label="Telegram">
              <TelegramIcon size={18} />
            </HeroSocial>
          </div>
        </div>
      </div>

      {/* stat bar */}
      <div className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-border bg-border sm:grid-cols-4">
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

function HeroSocial({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      className="grid h-9 w-9 place-items-center rounded-xl text-muted transition-colors hover:text-gold-bright"
    >
      {children}
    </a>
  );
}
