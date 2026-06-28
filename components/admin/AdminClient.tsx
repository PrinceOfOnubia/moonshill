"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Crown, ShieldAlert, Star, X } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge, VerifiedBadge } from "@/components/ui/Badge";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { cn, timeAgo } from "@/lib/utils";
import { getAdminSummary, updateSubmissionStatus } from "@/lib/api";
import { useAuth } from "@/components/providers/AuthProvider";
import type { Challenge, Submission, UserProfile } from "@/lib/types";

const sections = ["Accounts", "Submissions", "Featured"] as const;
type Section = (typeof sections)[number];

export function AdminClient() {
  const { user } = useAuth();
  const [section, setSection] = useState<Section>("Accounts");
  const [counts, setCounts] = useState({
    campaigns: 0,
    submissions: 0,
    pendingProjects: 0,
    flagged: 0,
  });
  const [pendingSubmissions, setPendingSubmissions] = useState<Submission[]>([]);
  const [accounts, setAccounts] = useState<UserProfile[]>([]);
  const [featuredCampaigns, setFeaturedCampaigns] = useState<Challenge[]>([]);

  useEffect(() => {
    if (!user?.isAdmin) return;
    let cancelled = false;
    getAdminSummary()
      .then((summary) => {
        if (cancelled) return;
        setCounts({
          campaigns: summary.counts.campaigns,
          submissions: summary.counts.submissions,
          pendingProjects: summary.counts.pendingProjects,
          flagged: summary.counts.flagged,
        });
        setPendingSubmissions(summary.pendingSubmissions);
        setAccounts(summary.accounts);
        setFeaturedCampaigns(summary.featuredCampaigns);
      })
      .catch(() => {
        if (cancelled) return;
        setCounts({ campaigns: 0, submissions: 0, pendingProjects: 0, flagged: 0 });
        setPendingSubmissions([]);
        setAccounts([]);
        setFeaturedCampaigns([]);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.isAdmin]);

  if (!user?.isAdmin) {
    return (
      <div className="rounded-2xl border border-border bg-surface/40 p-8 text-center text-muted">
        Admin access required.
      </div>
    );
  }

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
        <KStat label="Pending projects" value={counts.pendingProjects} tone="gold" />
        <KStat label="Pending submissions" value={pendingSubmissions.length} tone="gold" />
        <KStat label="Live campaigns" value={counts.campaigns} tone="green" />
        <KStat label="Flagged" value={counts.flagged} tone="red" />
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
          {section === "Accounts" && <AccountQueue accounts={accounts} />}
          {section === "Submissions" && <SubmissionQueue pending={pendingSubmissions} />}
          {section === "Featured" && <FeaturedManager campaigns={featuredCampaigns} />}
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

function AccountQueue({ accounts }: { accounts: UserProfile[] }) {
  const [state, setState] = useState<Record<string, Verdict>>({});
  if (!accounts.length) {
    return <div className="rounded-2xl border border-border bg-surface/40 p-8 text-center text-muted">No accounts yet.</div>;
  }
  return (
    <div className="space-y-3">
      {accounts.map((account) => {
        const v = state[account.id] ?? "pending";
        return (
          <div key={account.id} className="flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-surface/50 p-4">
            <Avatar src={account.avatar} alt={account.name} size={48} className="rounded-xl" />
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-1.5 font-semibold">
                {account.name}
                {account.accountType === "project" && account.projectVerified && <VerifiedBadge size={14} />}
                <Badge tone={account.accountType === "project" ? "blue" : "neutral"}>
                  {account.accountType === "project" ? "Project" : "User"}
                </Badge>
                {account.accountType === "project" && account.projectVerified && <Badge tone="gold">Verified</Badge>}
              </p>
              <p className="truncate text-[13px] text-faint">
                @{account.xHandle || account.handle} · <span className="font-mono">{account.wallet.slice(0, 12)}…</span>
              </p>
            </div>
            <Actions
              verdict={v}
              onApprove={() => setState({ ...state, [account.id]: "approved" })}
              onReject={() => setState({ ...state, [account.id]: "rejected" })}
              extra={<button onClick={() => setState({ ...state, [account.id]: "rejected" })} className="rounded-full border border-border px-3 py-2 text-[12px] font-medium text-faint hover:text-red">Suspend</button>}
            />
          </div>
        );
      })}
    </div>
  );
}

function SubmissionQueue({ pending }: { pending: Submission[] }) {
  const [state, setState] = useState<Record<string, Verdict | "winner">>({});
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  async function setSubmissionVerdict(submission: Submission, status: "Approved" | "Rejected" | "Winner") {
    setPendingAction(submission.id);
    try {
      await updateSubmissionStatus(submission.id, status);
      setState({ ...state, [submission.id]: status === "Winner" ? "winner" : status.toLowerCase() as Verdict });
    } finally {
      setPendingAction(null);
    }
  }
  if (!pending.length) {
    return <div className="rounded-2xl border border-border bg-surface/40 p-8 text-center text-muted">No pending submissions yet.</div>;
  }
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
                <button disabled={pendingAction === s.id} onClick={() => setSubmissionVerdict(s, "Approved")} className="grid h-9 w-9 place-items-center rounded-full border border-green/30 bg-green/10 text-green hover:bg-green/20 disabled:opacity-60"><Check size={16} /></button>
                <button disabled={pendingAction === s.id} onClick={() => setSubmissionVerdict(s, "Rejected")} className="grid h-9 w-9 place-items-center rounded-full border border-red/30 bg-red/10 text-red hover:bg-red/20 disabled:opacity-60"><X size={16} /></button>
                <button disabled={pendingAction === s.id} onClick={() => setSubmissionVerdict(s, "Winner")} className="flex h-9 items-center gap-1.5 rounded-full border border-gold/30 bg-gold/10 px-3 text-[12px] font-medium text-gold-bright hover:bg-gold/20 disabled:opacity-60"><Crown size={14} /> Winner</button>
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

function FeaturedManager({ campaigns }: { campaigns: Challenge[] }) {
  const [featured, setFeatured] = useState<string[]>(campaigns[0]?.id ? [campaigns[0].id] : []);
  if (!campaigns.length) {
    return <div className="rounded-2xl border border-border bg-surface/40 p-8 text-center text-muted">No campaigns available to feature yet.</div>;
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {campaigns.slice(0, 8).map((c) => {
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
              <div className="flex flex-wrap items-center gap-1.5 text-[12px] text-faint">
                <span>{c.category}</span>
                <Badge tone={c.creator.type === "project" ? "blue" : "neutral"}>
                  {c.creator.type === "project" ? "Project creator" : "User creator"}
                </Badge>
                {c.creator.type === "project" && c.creator.verified && <Badge tone="gold">Verified</Badge>}
              </div>
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
