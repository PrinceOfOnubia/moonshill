"use client";

import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/components/providers/AuthProvider";
import { platformStats } from "@/lib/mock";
import { ContractAddress } from "./ContractAddress";
import { SOCIALS, TelegramIcon, XIcon } from "./social";

// Marketing-only protocol metric not surfaced inside the app.
const HOLDERS = 12_840;

export function LandingHero() {
  const { openConnect } = useAuth();

  return (
    <section className="relative overflow-hidden">
      {/* ambient glow */}
      <div className="pointer-events-none absolute left-1/2 top-[-10%] h-[420px] w-[680px] -translate-x-1/2 rounded-full bg-gold/12 blur-[120px]" />

      <div className="relative mx-auto flex max-w-3xl flex-col items-center px-1 pb-6 pt-10 text-center sm:pt-16">
        <img src="/logo-mark.png" alt="" className="h-16 w-16 sm:h-20 sm:w-20" aria-hidden />

        <Badge tone="gold" className="mt-6">
          <Sparkles size={12} /> The on-chain creator arena
        </Badge>

        <h1 className="mt-5 font-display text-[38px] font-bold leading-[1.02] tracking-tight text-balance sm:text-[58px]">
          Every card is a <span className="text-gold-grad">challenge</span> to join.
        </h1>

        <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-muted sm:text-[17px]">
          Projects fund missions, contests &amp; challenges. Create your content on X,
          submit the link on Memebook, and compete for real on-chain rewards.
        </p>

        <ContractAddress className="mt-7 w-full max-w-md" />

        <div className="mt-7 flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row">
          <button
            onClick={openConnect}
            className="group flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-gold-bright to-gold px-8 text-[15px] font-semibold text-black transition-shadow hover:shadow-[0_12px_44px_-8px_rgba(240,185,11,0.65)] sm:w-auto"
          >
            Enter Memebook
            <ArrowRight size={18} className="transition-transform group-hover:translate-x-0.5" />
          </button>
          <div className="flex items-center gap-3">
            <SocialPill href={SOCIALS.x} label="Follow on X">
              <XIcon size={18} />
            </SocialPill>
            <SocialPill href={SOCIALS.telegram} label="Join Telegram">
              <TelegramIcon size={20} />
            </SocialPill>
          </div>
        </div>

        {/* live stats */}
        <div className="mt-12 grid w-full grid-cols-2 gap-px overflow-hidden rounded-3xl border border-border bg-border sm:grid-cols-4">
          <Stat label="Rewards paid" value={<AnimatedNumber value={platformStats.totalRewards} prefix="$" useCompact />} />
          <Stat label="Holders" value={<AnimatedNumber value={HOLDERS} useCompact />} />
          <Stat label="Creators" value={<AnimatedNumber value={platformStats.creators} useCompact />} />
          <Stat label="Live challenges" value={<AnimatedNumber value={platformStats.activeChallenges} />} />
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="bg-bg-2 px-4 py-6">
      <div className="font-mono text-2xl font-bold text-text sm:text-3xl">{value}</div>
      <div className="mt-1 text-[12px] text-faint">{label}</div>
    </div>
  );
}

function SocialPill({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <motion.a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      whileTap={{ scale: 0.95 }}
      className="grid h-14 w-14 place-items-center rounded-2xl border border-border-strong bg-surface text-text transition-colors hover:border-gold/50 hover:text-gold-bright"
    >
      {children}
    </motion.a>
  );
}
