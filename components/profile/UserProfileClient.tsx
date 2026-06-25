"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Trophy, Wallet, Check } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge, VerifiedBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { ChallengeCard } from "@/components/challenge/ChallengeCard";
import { SubmissionRow } from "./SubmissionRow";
import { challenges, me, submissions } from "@/lib/mock";
import { cn, shortAddr } from "@/lib/utils";

const tabs = ["Submissions", "Joined", "Created"] as const;

export function UserProfileClient() {
  const [tab, setTab] = useState<(typeof tabs)[number]>("Submissions");
  const [copied, setCopied] = useState(false);
  const joined = challenges.slice(0, 6);
  const created = challenges.filter((c) => !c.official).slice(0, 3);

  function copy() {
    navigator.clipboard?.writeText(me.wallet);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="-mt-6">
      {/* banner */}
      <div className="relative -mx-4 h-44 overflow-hidden sm:-mx-6 sm:h-56">
        <img src={me.banner} alt="" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/30 to-transparent" />
      </div>

      <div className="-mt-14 flex flex-col gap-4 sm:-mt-16 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-end gap-4">
          <Avatar src={me.avatar} alt={me.name} size={104} verified={me.xConnected} ring className="rounded-full bg-bg p-1" />
          <div className="pb-1">
            <h1 className="flex items-center gap-1.5 font-display text-2xl font-bold sm:text-3xl">
              {me.name} {me.xConnected && <VerifiedBadge size={20} />}
            </h1>
            <p className="text-sm text-faint">@{me.handle}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={copy} className="flex h-11 items-center gap-2 rounded-full border border-border bg-surface px-4 text-sm font-mono transition-colors hover:border-border-strong">
            <Wallet size={15} className="text-gold-bright" />
            {shortAddr(me.wallet)}
            {copied ? <Check size={14} className="text-green" /> : <Copy size={14} className="text-faint" />}
          </button>
          <Button variant="outline">Edit profile</Button>
        </div>
      </div>

      <p className="mt-4 max-w-xl text-[15px] text-muted">{me.bio}</p>
      {me.xConnected && (
        <Badge tone="blue" className="mt-3">𝕏 connected · @{me.handle}</Badge>
      )}

      {/* stats */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Wins" value={<AnimatedNumber value={me.wins} />} icon={<Trophy size={16} className="text-gold-bright" />} />
        <StatCard label="Rewards earned" value={<AnimatedNumber value={me.earned} prefix="$" useCompact />} accent />
        <StatCard label="Challenges joined" value={<AnimatedNumber value={me.joined} />} />
        <StatCard label="Created" value={<AnimatedNumber value={me.created} />} />
      </div>

      {/* tabs */}
      <div className="no-scrollbar mt-8 flex gap-1 overflow-x-auto border-b border-border">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "relative px-4 py-3 text-sm font-medium transition-colors",
              tab === t ? "text-text" : "text-faint hover:text-muted",
            )}
          >
            {t}
            {tab === t && <motion.span layoutId="userprofiletab" className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-gold" />}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} className="mt-6">
          {tab === "Submissions" && (
            <div className="grid gap-2.5">
              {submissions.map((s) => <SubmissionRow key={s.id} s={s} />)}
            </div>
          )}
          {tab === "Joined" && (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {joined.map((c, i) => <ChallengeCard key={c.id} c={c} index={i} />)}
            </div>
          )}
          {tab === "Created" && (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {created.map((c, i) => <ChallengeCard key={c.id} c={c} index={i} />)}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function StatCard({ label, value, icon, accent }: { label: string; value: React.ReactNode; icon?: React.ReactNode; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-surface/50 p-4">
      <div className="flex items-center gap-1.5 text-[12px] text-faint">{icon}{label}</div>
      <p className={cn("mt-1 font-mono text-2xl font-bold", accent ? "text-green" : "text-text")}>{value}</p>
    </div>
  );
}
