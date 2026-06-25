"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Crown, ShieldAlert, Star, X } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge, VerifiedBadge } from "@/components/ui/Badge";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { challenges, projects, submissions } from "@/lib/mock";
import { cn, timeAgo } from "@/lib/utils";

const sections = ["Projects", "Submissions", "Featured"] as const;
type Section = (typeof sections)[number];

export function AdminClient() {
  const [section, setSection] = useState<Section>("Projects");

  return (
    <div>
      <div className="mb-6 flex items-center gap-2">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-red/12 text-red"><ShieldAlert size={20} /></div>
        <div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">Admin dashboard</h1>
          <p className="text-[13px] text-faint">Moderate the arena. Approvals, winners &amp; featured.</p>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KStat label="Pending projects" value={2} tone="gold" />
        <KStat label="Pending submissions" value={14} tone="gold" />
        <KStat label="Live challenges" value={challenges.length} tone="green" />
        <KStat label="Flagged" value={1} tone="red" />
      </div>

      <div className="no-scrollbar mb-6 flex gap-1 overflow-x-auto rounded-full border border-border bg-surface/60 p-1">
        {sections.map((s) => (
          <button key={s} onClick={() => setSection(s)} className={cn("relative flex-1 whitespace-nowrap rounded-full px-4 py-2.5 text-[13px] font-semibold transition-colors", section === s ? "text-black" : "text-muted hover:text-text")}>
            {section === s && <motion.span layoutId="admintab" className="absolute inset-0 rounded-full bg-gradient-to-b from-gold-bright to-gold" transition={{ type: "spring", stiffness: 380, damping: 30 }} />}
            <span className="relative">{s}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={section} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
          {section === "Projects" && <ProjectQueue />}
          {section === "Submissions" && <SubmissionQueue />}
          {section === "Featured" && <FeaturedManager />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function KStat({ label, value, tone }: { label: string; value: number; tone: "gold" | "green" | "red" }) {
  const c = tone === "gold" ? "text-gold-bright" : tone === "green" ? "text-green" : "text-red";
  return (
    <div className="rounded-2xl border border-border bg-surface/50 p-4">
      <p className="text-[12px] text-faint">{label}</p>
      <p className={cn("mt-1 font-mono text-2xl font-bold", c)}><AnimatedNumber value={value} /></p>
    </div>
  );
}

type Verdict = "pending" | "approved" | "rejected";

function ProjectQueue() {
  const [state, setState] = useState<Record<string, Verdict>>({});
  return (
    <div className="space-y-3">
      {projects.map((p) => {
        const v = state[p.id] ?? "pending";
        return (
          <div key={p.id} className="flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-surface/50 p-4">
            <Avatar src={p.avatar} alt={p.name} size={48} className="rounded-xl" />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1 font-semibold">{p.name} <VerifiedBadge size={14} /></p>
              <p className="truncate text-[13px] text-faint">{p.website} · <span className="font-mono">{p.contract.slice(0, 12)}…</span></p>
            </div>
            <Actions
              verdict={v}
              onApprove={() => setState({ ...state, [p.id]: "approved" })}
              onReject={() => setState({ ...state, [p.id]: "rejected" })}
              extra={<button onClick={() => setState({ ...state, [p.id]: "rejected" })} className="rounded-full border border-border px-3 py-2 text-[12px] font-medium text-faint hover:text-red">Suspend</button>}
            />
          </div>
        );
      })}
    </div>
  );
}

function SubmissionQueue() {
  const [state, setState] = useState<Record<string, Verdict | "winner">>({});
  const pending = submissions.filter((s) => s.status !== "Rejected");
  return (
    <div className="space-y-3">
      {pending.map((s) => {
        const v = state[s.id] ?? "pending";
        return (
          <div key={s.id} className="flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-surface/50 p-3">
            <img src={s.cover} alt="" className="h-12 w-12 rounded-lg object-cover" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{s.challengeTitle}</p>
              <div className="flex items-center gap-2 text-[12px] text-faint">
                <Avatar src={s.user.avatar} alt={s.user.name} size={16} />
                @{s.user.handle} · {s.type} · <span suppressHydrationWarning>{timeAgo(s.submittedAt)}</span>
              </div>
            </div>
            {v === "pending" ? (
              <div className="flex gap-2">
                <button onClick={() => setState({ ...state, [s.id]: "approved" })} className="grid h-9 w-9 place-items-center rounded-full border border-green/30 bg-green/10 text-green hover:bg-green/20"><Check size={16} /></button>
                <button onClick={() => setState({ ...state, [s.id]: "rejected" })} className="grid h-9 w-9 place-items-center rounded-full border border-red/30 bg-red/10 text-red hover:bg-red/20"><X size={16} /></button>
                <button onClick={() => setState({ ...state, [s.id]: "winner" })} className="flex h-9 items-center gap-1.5 rounded-full border border-gold/30 bg-gold/10 px-3 text-[12px] font-medium text-gold-bright hover:bg-gold/20"><Crown size={14} /> Winner</button>
              </div>
            ) : (
              <Badge tone={v === "approved" ? "blue" : v === "winner" ? "green" : "red"}>
                {v === "winner" ? <><Crown size={12} /> Winner</> : v === "approved" ? "Approved" : "Rejected"}
              </Badge>
            )}
          </div>
        );
      })}
    </div>
  );
}

function FeaturedManager() {
  const [featured, setFeatured] = useState<string[]>([challenges[0].id]);
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {challenges.slice(0, 8).map((c) => {
        const on = featured.includes(c.id);
        return (
          <button
            key={c.id}
            onClick={() => setFeatured(on ? featured.filter((id) => id !== c.id) : [...featured, c.id])}
            className={cn("flex items-center gap-3 rounded-2xl border p-3 text-left transition-colors", on ? "border-gold/40 bg-gold/8" : "border-border bg-surface/50 hover:border-border-strong")}
          >
            <img src={c.cover} alt="" className="h-12 w-12 rounded-lg object-cover" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{c.title}</p>
              <p className="text-[12px] text-faint">{c.category}</p>
            </div>
            <span className={cn("grid h-8 w-8 place-items-center rounded-full", on ? "bg-gold text-black" : "bg-surface-2 text-faint")}><Star size={15} className={on ? "fill-black" : ""} /></span>
          </button>
        );
      })}
    </div>
  );
}

function Actions({ verdict, onApprove, onReject, extra }: { verdict: Verdict; onApprove: () => void; onReject: () => void; extra?: React.ReactNode }) {
  if (verdict !== "pending") {
    return <Badge tone={verdict === "approved" ? "green" : "red"}>{verdict === "approved" ? <><Check size={12} /> Approved</> : <><X size={12} /> Rejected</>}</Badge>;
  }
  return (
    <div className="flex items-center gap-2">
      {extra}
      <button onClick={onReject} className="rounded-full border border-red/30 bg-red/10 px-4 py-2 text-[12px] font-medium text-red hover:bg-red/20">Reject</button>
      <button onClick={onApprove} className="rounded-full bg-gradient-to-b from-green to-green-dim px-4 py-2 text-[12px] font-semibold text-black">Approve</button>
    </div>
  );
}
