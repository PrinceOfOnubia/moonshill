"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Wallet } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge, VerifiedBadge } from "@/components/ui/Badge";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { ChallengeCard } from "@/components/challenge/ChallengeCard";
import { SubmissionRow } from "./SubmissionRow";
import type { PublicUserProfile } from "@/lib/types";
import { cn, shortAddr } from "@/lib/utils";

const tabs = ["Submissions", "Joined", "Created"] as const;

export function PublicUserProfileClient({ profile }: { profile: PublicUserProfile }) {
  const [tab, setTab] = useState<(typeof tabs)[number]>("Submissions");

  return (
    <div className="-mt-6">
      <div className="relative -mx-4 h-44 overflow-hidden sm:-mx-6 sm:h-56">
        <img src={profile.banner} alt="" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/30 to-transparent" />
      </div>

      <div className="relative z-10 -mt-14 flex flex-col gap-4 sm:-mt-16 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-end gap-4">
          <span className="shrink-0 rounded-full bg-bg p-1.5">
            <Avatar src={profile.avatar} alt={profile.name} size={100} verified={profile.xConnected} />
          </span>
          <div className="min-w-0 pb-1">
            <h1 className="flex items-center gap-1.5 font-display text-2xl font-bold text-text drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)] sm:text-3xl">
              <span className="truncate">{profile.name}</span>
              {profile.xConnected && <VerifiedBadge size={20} className="shrink-0" />}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <p className="text-sm text-faint">@{profile.xHandle || profile.handle}</p>
              <Badge tone="neutral">User account</Badge>
            </div>
          </div>
        </div>
        <div className="flex h-11 items-center gap-2 rounded-full border border-border bg-surface px-4 text-sm font-mono">
          <Wallet size={15} className="text-gold-bright" />
          {shortAddr(profile.wallet)}
        </div>
      </div>

      <p className="mt-4 max-w-xl text-[15px] text-muted">{profile.bio}</p>
      {profile.xConnected && <Badge tone="blue" className="mt-3">𝕏 connected · @{profile.xHandle || profile.handle}</Badge>}

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Wins" value={<AnimatedNumber value={profile.wins} />} icon={<Trophy size={16} className="text-gold-bright" />} />
        <StatCard label="Rewards earned" value={<AnimatedNumber value={profile.earned} prefix="$" useCompact />} accent />
        <StatCard label="Campaigns joined" value={<AnimatedNumber value={profile.joined} />} />
        <StatCard label="Created" value={<AnimatedNumber value={profile.created} />} />
      </div>

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
            {tab === t && <motion.span layoutId="publicuserprofiletab" className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-gold" />}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} className="mt-6">
          {tab === "Submissions" && (
            <div className="grid gap-2.5">
              {profile.submissions.length ? (
                profile.submissions.map((submission) => <SubmissionRow key={submission.id} s={submission} />)
              ) : (
                <EmptyState>No submissions yet.</EmptyState>
              )}
            </div>
          )}
          {tab === "Joined" && (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {profile.joinedCampaigns.length ? (
                profile.joinedCampaigns.map((campaign, index) => <ChallengeCard key={campaign.id} c={campaign} index={index} />)
              ) : (
                <EmptyState>No joined campaigns yet.</EmptyState>
              )}
            </div>
          )}
          {tab === "Created" && (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {profile.createdCampaigns.length ? (
                profile.createdCampaigns.map((campaign, index) => <ChallengeCard key={campaign.id} c={campaign} index={index} />)
              ) : (
                <EmptyState>No created campaigns yet.</EmptyState>
              )}
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
      <div className="mb-2">{icon}</div>
      <p className="text-[12px] text-faint">{label}</p>
      <p className={cn("mt-1 font-mono text-xl font-bold sm:text-2xl", accent ? "text-green" : "text-text")}>{value}</p>
    </div>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-surface/40 p-8 text-center text-muted sm:col-span-2 lg:col-span-3">
      {children}
    </div>
  );
}
