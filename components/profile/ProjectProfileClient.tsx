"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Copy, Globe, FileCode2 } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge, VerifiedBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { ChallengeCard } from "@/components/challenge/ChallengeCard";
import { challenges } from "@/lib/mock";
import type { ProjectProfile } from "@/lib/types";
import { cn, shortAddr } from "@/lib/utils";

const tabs = ["Active", "Completed"] as const;

export function ProjectProfileClient({ p }: { p: ProjectProfile }) {
  const [tab, setTab] = useState<(typeof tabs)[number]>("Active");
  const [copied, setCopied] = useState(false);
  const owned = challenges.filter((c) => c.creator.handle === p.handle);
  const active = owned.length ? owned : challenges.filter((c) => c.official).slice(0, 4);

  return (
    <div className="-mt-6">
      <div className="relative -mx-4 h-44 overflow-hidden sm:-mx-6 sm:h-56">
        <img src={p.banner} alt="" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/40 to-transparent" />
      </div>

      <div className="-mt-14 flex flex-col gap-4 sm:-mt-16 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-end gap-4">
          <Avatar src={p.avatar} alt={p.name} size={104} verified={p.verified} className="rounded-2xl bg-bg p-1" />
          <div className="pb-1">
            <h1 className="flex items-center gap-1.5 font-display text-2xl font-bold sm:text-3xl">
              {p.name} {p.verified && <VerifiedBadge size={22} />}
            </h1>
            <p className="text-sm text-faint">@{p.handle}</p>
          </div>
        </div>
        <Button>Follow on 𝕏</Button>
      </div>

      <p className="mt-4 max-w-2xl text-[15px] text-muted">{p.description}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        <a href={`https://${p.website}`} className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-[13px] text-muted transition-colors hover:text-text">
          <Globe size={14} className="text-blue" /> {p.website}
        </a>
        <button
          onClick={() => { navigator.clipboard?.writeText(p.contract); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
          className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 font-mono text-[13px] text-muted transition-colors hover:text-text"
        >
          <FileCode2 size={14} className="text-gold-bright" /> {shortAddr(p.contract)}
          {copied ? <Check size={13} className="text-green" /> : <Copy size={13} className="text-faint" />}
        </button>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3">
        <Stat label="Total sponsored" value={<AnimatedNumber value={p.totalSponsored} prefix="$" useCompact />} accent />
        <Stat label="Active" value={<AnimatedNumber value={p.activeChallenges} />} />
        <Stat label="Completed" value={<AnimatedNumber value={p.completedChallenges} />} />
      </div>

      <div className="mt-8 flex gap-1 border-b border-border">
        {tabs.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={cn("relative px-4 py-3 text-sm font-medium transition-colors", tab === t ? "text-text" : "text-faint hover:text-muted")}>
            {t} challenges
            {tab === t && <motion.span layoutId="projtab" className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-gold" />}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {active.map((c, i) => <ChallengeCard key={c.id} c={c} index={i} />)}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: React.ReactNode; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-surface/50 p-4 text-center sm:text-left">
      <p className="text-[12px] text-faint">{label}</p>
      <p className={cn("mt-1 font-mono text-xl font-bold sm:text-2xl", accent ? "text-green" : "text-text")}>{value}</p>
    </div>
  );
}
