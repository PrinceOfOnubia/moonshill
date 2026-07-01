"use client";

import { useState } from "react";
import { Link } from "next-view-transitions";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Copy, Globe, FileCode2, MessageCircleMore, Tags } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge, VerifiedBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { ChallengeCard } from "@/components/challenge/ChallengeCard";
import { useAuth } from "@/components/providers/AuthProvider";
import { XIcon } from "@/components/landing/social";
import type { Challenge, ProjectProfile } from "@/lib/types";
import { cn, shortAddr } from "@/lib/utils";

const tabs = ["Created", "Active", "Completed"] as const;

export function ProjectProfileClient({ p, campaigns }: { p: ProjectProfile; campaigns: Challenge[] }) {
  const { user } = useAuth();
  const [tab, setTab] = useState<(typeof tabs)[number]>("Created");
  const [copied, setCopied] = useState(false);
  const isOwnProfile = user?.id === p.id;
  const xProfileUrl = p.xHandle ? `https://x.com/${p.xHandle}` : null;
  const now = Date.now();
  const createdCampaigns = campaigns;
  const activeCampaigns = campaigns.filter((campaign) => new Date(campaign.endsAt).getTime() >= now);
  const completedCampaigns = campaigns.filter((campaign) => new Date(campaign.endsAt).getTime() < now);
  const visibleCampaigns = tab === "Created"
    ? createdCampaigns
    : tab === "Active"
      ? activeCampaigns
      : completedCampaigns;

  return (
    <div className="-mt-6">
      <div className="relative -mx-4 h-44 overflow-hidden sm:-mx-6 sm:h-56">
        <img src={p.banner} alt="" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/40 to-transparent" />
      </div>

      <div className="relative z-10 -mt-14 flex flex-col gap-4 sm:-mt-16 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-end gap-4">
          <span className="shrink-0 rounded-[28px] bg-bg p-1.5">
            <Avatar src={p.avatar} alt={p.name} size={104} verified={p.verified} className="rounded-2xl" />
          </span>
          <div className="min-w-0 pb-1">
            <h1 className="flex items-center gap-1.5 font-display text-2xl font-bold sm:text-3xl">
              <span className="truncate">{p.name}</span>
              {p.verified && <VerifiedBadge size={22} className="shrink-0" />}
              {xProfileUrl && (
                <a
                  href={xProfileUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Open @${p.xHandle} on X`}
                  className="grid h-7 w-7 place-items-center rounded-full text-faint transition-colors hover:text-text"
                >
                  <XIcon size={14} />
                </a>
              )}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <p className="text-sm text-faint">@{p.handle}</p>
              {p.verified && <Badge tone="gold">Verified</Badge>}
            </div>
          </div>
        </div>
        {xProfileUrl && !isOwnProfile ? (
          <a href={xProfileUrl} target="_blank" rel="noreferrer">
            <Button>Follow on 𝕏</Button>
          </a>
        ) : isOwnProfile ? (
          <Link href="/profile">
            <Button variant="outline">Manage profile</Button>
          </Link>
        ) : null}
      </div>

      <p className="mt-4 max-w-2xl text-[15px] text-muted">{p.description}</p>
      {p.xHandle && <Badge tone="blue" className="mt-3">𝕏 connected · @{p.xHandle}</Badge>}

      <div className="mt-4 flex flex-wrap gap-2">
        {p.category && (
          <span className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-[13px] text-muted">
            <Tags size={14} className="text-gold-bright" /> {p.category}
          </span>
        )}
        {p.website && (
          <a href={p.website.startsWith("http") ? p.website : `https://${p.website}`} className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-[13px] text-muted transition-colors hover:text-text">
            <Globe size={14} className="text-blue" /> {p.website}
          </a>
        )}
        {p.telegramUrl && (
          <a href={p.telegramUrl.startsWith("http") ? p.telegramUrl : `https://${p.telegramUrl}`} className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-[13px] text-muted transition-colors hover:text-text">
            <MessageCircleMore size={14} className="text-gold-bright" /> Telegram
          </a>
        )}
        {p.ownerWallet ? (
          <button
            onClick={() => { navigator.clipboard?.writeText(p.ownerWallet || ""); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
            className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 font-mono text-[13px] text-muted transition-colors hover:text-text"
          >
            <FileCode2 size={14} className="text-gold-bright" /> {shortAddr(p.ownerWallet)}
            {copied ? <Check size={13} className="text-green" /> : <Copy size={13} className="text-faint" />}
          </button>
        ) : null}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Total sponsored" value={<AnimatedNumber value={p.totalSponsored} prefix="$" useCompact />} accent />
        <Stat label="Created" value={<AnimatedNumber value={createdCampaigns.length} />} />
        <Stat label="Active" value={<AnimatedNumber value={activeCampaigns.length} />} />
        <Stat label="Completed" value={<AnimatedNumber value={completedCampaigns.length} />} />
      </div>

      <div className="mt-8 flex gap-1 border-b border-border">
        {tabs.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={cn("relative px-4 py-3 text-sm font-medium transition-colors", tab === t ? "text-text" : "text-faint hover:text-muted")}>
            {t} campaigns
            {tab === t && <motion.span layoutId="projtab" className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-gold" />}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visibleCampaigns.length ? (
            visibleCampaigns.map((c, i) => <ChallengeCard key={c.id} c={c} index={i} />)
          ) : (
            <div className="rounded-2xl border border-border bg-surface/40 p-8 text-center text-muted sm:col-span-2 lg:col-span-3">
              {tab === "Created" ? "No campaigns yet." : tab === "Active" ? "No active campaigns yet." : "No completed campaigns yet."}
            </div>
          )}
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
