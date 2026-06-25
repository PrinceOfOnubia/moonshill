"use client";

import { useState } from "react";
import { Link } from "next-view-transitions";
import { motion } from "framer-motion";
import {
  Check, CheckCircle2, ClipboardCheck, Clock, FileCheck2, Share2, Tag, Trophy, Users,
} from "lucide-react";
import type { Challenge } from "@/lib/types";
import { Avatar } from "@/components/ui/Avatar";
import { Badge, VerifiedBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { SubmitEntry } from "./SubmitEntry";
import { ChallengeCard } from "./ChallengeCard";
import { challenges } from "@/lib/mock";
import { useTimeLeft } from "@/components/ui/useTimeLeft";
import { compact, fmtToken, fmtUsd } from "@/lib/utils";

export function ChallengeDetail({ c }: { c: Challenge }) {
  const [joined, setJoined] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [shared, setShared] = useState(false);
  const t = useTimeLeft(c.endsAt);

  const related = challenges.filter((x) => x.category === c.category && x.id !== c.id).slice(0, 3);

  function share() {
    setShared(true);
    setTimeout(() => setShared(false), 1800);
  }

  return (
    <div className="-mt-6">
      {/* banner */}
      <div className="relative -mx-4 h-56 overflow-hidden sm:-mx-6 sm:h-80">
        <img src={c.cover} alt={c.title} style={{ viewTransitionName: `cover-${c.slug}` }} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/40 to-bg/10" />
        <div className="absolute inset-x-4 top-4 sm:inset-x-6">
          <Link href="/explore" className="inline-flex items-center gap-1.5 rounded-full bg-black/45 px-3 py-1.5 text-[13px] text-white backdrop-blur hover:bg-black/60">
            ← Back to explore
          </Link>
        </div>
      </div>

      <div className="relative grid gap-8 lg:grid-cols-[1fr_360px]">
        {/* main */}
        <div className="-mt-12 sm:-mt-16">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="gold">{c.category}</Badge>
            {c.official && <Badge tone="blue">Official</Badge>}
            {c.trending > 85 && <Badge tone="gold"><Trophy size={11} /> Hot</Badge>}
          </div>

          <h1 className="mt-3 font-display text-3xl font-bold leading-tight text-balance sm:text-4xl">
            {c.title}
          </h1>

          <Link href={`/project/${c.creator.handle}`} className="mt-4 inline-flex items-center gap-2.5">
            <Avatar src={c.creator.avatar} alt={c.creator.name} size={36} verified={c.creator.verified} />
            <span className="flex items-center gap-1 text-sm">
              <span className="font-medium text-text">{c.creator.name}</span>
              {c.creator.verified && <VerifiedBadge size={15} />}
            </span>
            <span className="text-sm text-faint">@{c.creator.handle}</span>
          </Link>

          <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-muted">{c.description}</p>

          {/* mobile action card — keeps Join/Submit near the top on phones */}
          <div className="mt-6 rounded-[20px] border border-gold/20 bg-gradient-to-br from-gold/10 to-transparent p-4 lg:hidden">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-gold-bright">Reward pool</p>
                <p className="font-mono text-2xl font-bold leading-none">{fmtUsd(c.rewardPool)}</p>
                <p className="mt-1 text-[12px] font-medium text-green">{fmtToken(c.rewardAmount)} {c.rewardToken} · {c.winners} winners</p>
              </div>
              <div className="text-right">
                <p className="text-[11px] uppercase tracking-wider text-faint">Ends in</p>
                <p className="font-mono text-lg font-bold text-gold-bright">{t.label}</p>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              {!joined ? (
                <Button className="flex-1" size="lg" onClick={() => setJoined(true)}>
                  Join challenge
                </Button>
              ) : (
                <Button className="flex-1" size="lg" variant="green" onClick={() => setSubmitOpen(true)}>
                  Submit entry
                </Button>
              )}
              <Button variant="glass" size="lg" onClick={share} aria-label="Share">
                {shared ? <Check size={18} /> : <Share2 size={18} />}
              </Button>
            </div>
            {joined && (
              <p className="mt-2 flex items-center justify-center gap-1.5 text-[12px] font-medium text-green">
                <CheckCircle2 size={13} /> You joined this challenge
              </p>
            )}
          </div>

          {/* meta strip */}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Meta icon={Users} label="Participants" value={compact(c.participants)} />
            <Meta icon={Trophy} label="Winners" value={`${c.winners}`} />
            <Meta icon={Clock} label="Ends in" value={t.label} accent={t.urgent} />
            <Meta icon={Tag} label="Type" value={c.submissionType} small />
          </div>

          {/* rules */}
          <Section title="Rules" icon={ClipboardCheck}>
            <ul className="space-y-2.5">
              {c.rules.map((r) => (
                <li key={r} className="flex items-start gap-2.5 text-[15px] text-muted">
                  <Check size={17} className="mt-0.5 shrink-0 text-green" />
                  {r}
                </li>
              ))}
            </ul>
          </Section>

          {/* proof */}
          <Section title="Proof requirements" icon={FileCheck2}>
            <ul className="space-y-2.5">
              {c.proof.map((p) => (
                <li key={p} className="flex items-start gap-2.5 text-[15px] text-muted">
                  <FileCheck2 size={17} className="mt-0.5 shrink-0 text-blue" />
                  {p}
                </li>
              ))}
            </ul>
            {c.requiredTags && (
              <div className="mt-4 flex flex-wrap gap-2">
                {c.requiredTags.map((tag) => (
                  <span key={tag} className="rounded-lg bg-surface-2 px-2.5 py-1 font-mono text-[13px] text-gold-bright">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </Section>

          {related.length > 0 && (
            <div className="mt-12">
              <h3 className="mb-4 font-display text-xl font-bold">More {c.category} challenges</h3>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {related.map((r, i) => (
                  <ChallengeCard key={r.id} c={r} index={i} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* sticky reward sidebar — desktop only (mobile uses the top action card) */}
        <aside className="hidden lg:sticky lg:top-24 lg:block lg:self-start">
          <div className="ring-grad overflow-hidden rounded-[24px] border border-border bg-bg-2">
            <div className="relative overflow-hidden bg-gradient-to-br from-gold/15 to-transparent p-6">
              <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gold/20 blur-3xl" />
              <p className="text-[12px] font-medium uppercase tracking-wider text-gold-bright">Reward pool</p>
              <p className="mt-1 font-mono text-4xl font-bold">
                <AnimatedNumber value={c.rewardPool} prefix="$" useCompact />
              </p>
              <p className="mt-1 font-mono text-sm font-medium text-green">
                {fmtToken(c.rewardAmount)} {c.rewardToken}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border/60 pt-4 text-sm">
                <div>
                  <p className="text-faint text-[12px]">Winners</p>
                  <p className="font-mono font-semibold">{c.winners}</p>
                </div>
                <div>
                  <p className="text-faint text-[12px]">Avg / winner</p>
                  <p className="font-mono font-semibold text-green">{fmtUsd(Math.round(c.rewardPool / c.winners))}</p>
                </div>
              </div>
            </div>

            <div className="space-y-2.5 p-5">
              {!joined ? (
                <Button className="w-full" size="lg" magnetic onClick={() => setJoined(true)}>
                  Join challenge
                </Button>
              ) : (
                <>
                  <div className="flex items-center justify-center gap-2 rounded-2xl border border-green/25 bg-green/10 py-2.5 text-sm font-medium text-green">
                    <CheckCircle2 size={16} /> You joined this challenge
                  </div>
                  <Button className="w-full" size="lg" variant="green" onClick={() => setSubmitOpen(true)}>
                    Submit entry
                  </Button>
                </>
              )}
              <Button className="w-full" variant="glass" onClick={share}>
                {shared ? <><Check size={16} /> Link copied</> : <><Share2 size={16} /> Share</>}
              </Button>
              <p className="pt-1 text-center text-[12px] text-faint">
                {compact(c.participants)} creators already joined
              </p>
            </div>
          </div>
        </aside>
      </div>

      <SubmitEntry challenge={c} open={submitOpen} onClose={() => setSubmitOpen(false)} />
    </div>
  );
}

function Meta({
  icon: Icon, label, value, accent, small,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string; value: string; accent?: boolean; small?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <Icon size={16} className="text-faint" />
      <p className="mt-2 text-[12px] text-faint">{label}</p>
      <p className={`mt-0.5 font-semibold ${small ? "text-[13px]" : "font-mono text-lg"} ${accent ? "text-gold-bright" : "text-text"}`}>
        {value}
      </p>
    </div>
  );
}

function Section({
  title, icon: Icon, children,
}: {
  title: string; icon: React.ComponentType<{ size?: number; className?: string }>; children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5 }}
      className="mt-8 rounded-[20px] border border-border bg-surface/50 p-5 sm:p-6"
    >
      <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold">
        <Icon size={18} className="text-gold-bright" /> {title}
      </h3>
      {children}
    </motion.div>
  );
}
