"use client";

import { useRef } from "react";
import { Link } from "next-view-transitions";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, Sparkles, Clock, Trophy } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { useIntro } from "@/components/providers/IntroProvider";
import { useTimeLeft } from "@/components/ui/useTimeLeft";
import { challenges, platformStats } from "@/lib/mock";
import { fmtUsd, compact } from "@/lib/utils";

const featured = challenges[0];

export function Hero() {
  const t = useTimeLeft(featured.endsAt);
  const { done } = useIntro();

  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const coverY = useTransform(scrollYProgress, [0, 1], ["0%", "22%"]);
  const coverScale = useTransform(scrollYProgress, [0, 1], [1.05, 1.18]);

  const show = done ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 20, scale: 0.98 };

  return (
    <section ref={ref} className="relative">
      <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        {/* left — pitch */}
        <div className="relative flex flex-col justify-center overflow-hidden rounded-[26px] border border-border bg-bg-2 p-7 grid-lines sm:p-10">
          <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-gold/15 blur-3xl" />
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={done ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.7, ease: [0.21, 0.47, 0.32, 0.98] }}
          >
            <Badge tone="gold" className="mb-5">
              <Sparkles size={12} /> The on-chain creator arena
            </Badge>
            <h1 className="font-display text-[40px] font-bold leading-[0.98] tracking-tight text-balance sm:text-[56px]">
              Every card is a{" "}
              <span className="text-gold-grad">challenge</span> to join.
            </h1>
            <p className="mt-5 max-w-md text-[15px] leading-relaxed text-muted">
              Projects fund missions, contests &amp; challenges. Create your content
              on X, submit the link on Memebook, and compete for real rewards.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link href="/explore">
                <Button size="lg" magnetic>
                  Explore challenges <ArrowRight size={18} />
                </Button>
              </Link>
              <Link href="/create">
                <Button size="lg" variant="outline">
                  Create a challenge
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* stat strip */}
          <div className="mt-9 grid grid-cols-2 gap-x-4 gap-y-5 border-t border-border pt-6 sm:grid-cols-4">
            <Stat label="Rewards paid" value={<AnimatedNumber value={platformStats.totalRewards} prefix="$" useCompact />} />
            <Stat label="Live challenges" value={<AnimatedNumber value={platformStats.activeChallenges} />} />
            <Stat label="Creators" value={<AnimatedNumber value={platformStats.creators} useCompact />} />
            <Stat label="Submissions" value={<AnimatedNumber value={platformStats.submissions} useCompact />} />
          </div>
        </div>

        {/* right — featured challenge bento */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={show}
          transition={{ duration: 0.7, delay: 0.12, ease: [0.21, 0.47, 0.32, 0.98] }}
        >
          <Link
            href={`/challenge/${featured.slug}`}
            data-cursor="join"
            className="ring-grad group relative block h-full min-h-[360px] overflow-hidden rounded-[26px]"
          >
            <motion.img
              src={featured.cover}
              alt={featured.title}
              style={{ y: coverY, scale: coverScale }}
              className="absolute inset-0 h-[120%] w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-black/10" />

            <div className="absolute inset-x-5 top-5 flex items-center justify-between">
              <Badge tone="gold" className="bg-black/50 backdrop-blur border-gold/30">
                <Trophy size={11} /> Featured
              </Badge>
              <Badge tone="neutral" className="bg-black/50 backdrop-blur border-white/10 text-white">
                {featured.category}
              </Badge>
            </div>

            <div className="absolute inset-x-5 bottom-5">
              <div className="mb-3 flex items-center gap-2">
                <Avatar src={featured.creator.avatar} alt={featured.creator.name} size={26} verified={featured.creator.verified} />
                <span className="text-sm font-medium text-white/90">{featured.creator.name}</span>
              </div>
              <h2 className="font-display text-3xl font-bold leading-tight text-white text-balance">
                {featured.title}
              </h2>

              <div className="mt-4 flex items-end justify-between rounded-2xl bg-black/45 p-4 backdrop-blur">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-white/50">Reward pool</p>
                  <p className="font-mono text-3xl font-bold text-white">{fmtUsd(featured.rewardPool)}</p>
                  <p className="text-[12px] font-medium text-green">{compact(featured.rewardAmount)} {featured.rewardToken} · {featured.winners} winners</p>
                </div>
                <div className="text-right">
                  <p className="flex items-center justify-end gap-1 text-[11px] uppercase tracking-wider text-white/50">
                    <Clock size={11} /> Ends in
                  </p>
                  <p className="font-mono text-xl font-bold text-gold-bright">{t.label}</p>
                  <p className="text-[12px] text-white/60">{compact(featured.participants)} joined</p>
                </div>
              </div>
            </div>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="font-mono text-2xl font-bold text-text">{value}</div>
      <div className="mt-0.5 text-[12px] text-faint">{label}</div>
    </div>
  );
}
