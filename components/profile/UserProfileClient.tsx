"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Pencil, Trophy, Wallet, Check } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge, VerifiedBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { Modal } from "@/components/ui/Modal";
import { ChallengeCard } from "@/components/challenge/ChallengeCard";
import { SubmissionRow } from "./SubmissionRow";
import { cn, shortAddr } from "@/lib/utils";
import { useAuth } from "@/components/providers/AuthProvider";
import { startXConnect, updateMe } from "@/lib/api";

const tabs = ["Submissions", "Joined", "Created"] as const;

export function UserProfileClient() {
  const { user, refreshUser } = useAuth();
  const [tab, setTab] = useState<(typeof tabs)[number]>("Submissions");
  const [copied, setCopied] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [xPending, setXPending] = useState(false);
  const [xError, setXError] = useState<string | null>(null);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState("");
  const [handle, setHandle] = useState("");
  const [accountType, setAccountType] = useState<"user" | "project">("user");
  const [website, setWebsite] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const profile = user;
  const joined = profile?.joinedCampaigns ?? [];
  const created = profile?.createdCampaigns ?? [];
  const submissions = profile?.submissions ?? [];
  const sourceXHandle = profile?.xHandle || profile?.handle || "";
  const xConnected = !!profile?.xConnected;

  async function connectX() {
    setXPending(true);
    setXError(null);
    try {
      const response = await startXConnect("/profile");
      window.location.href = response.redirectUrl;
    } catch (err) {
      setXError(err instanceof Error ? err.message : "X connection failed.");
      setXPending(false);
    }
  }

  function copy() {
    if (!profile) return;
    navigator.clipboard?.writeText(profile.wallet);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  useEffect(() => {
    if (!profile) return;
    setName(profile.name);
    setBio(profile.bio);
    setAvatar(profile.avatar);
    setHandle(profile.handle);
    setAccountType(profile.accountType);
    setWebsite(profile.website || "");
  }, [profile]);

  if (!profile) {
    return (
      <div className="rounded-2xl border border-border bg-surface/40 p-8 text-center text-muted">
        Connect your wallet to load your profile.
      </div>
    );
  }

  return (
    <div className="-mt-6">
      {/* banner */}
      <div className="relative -mx-4 h-44 overflow-hidden sm:-mx-6 sm:h-56">
        <img src={profile.banner} alt="" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/30 to-transparent" />
      </div>

      <div className="relative z-10 -mt-14 flex flex-col gap-4 sm:-mt-16 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-end gap-4">
          <span className="shrink-0 rounded-full bg-bg p-1.5">
            <Avatar src={avatar} alt={profile.name} size={100} verified={xConnected} />
          </span>
          <div className="min-w-0 pb-1">
            <h1 className="flex items-center gap-1.5 font-display text-2xl font-bold text-text drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)] sm:text-3xl">
              <span className="truncate">{name}</span>
              {xConnected && <VerifiedBadge size={20} className="shrink-0" />}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <p className="text-sm text-faint">@{profile.handle}</p>
              <Badge tone={profile.accountType === "project" ? "blue" : "neutral"}>
                {profile.accountType === "project" ? "Project account" : "User account"}
              </Badge>
              {profile.accountType === "project" && profile.projectVerified && (
                <Badge tone="gold">Verified project</Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button onClick={copy} className="flex h-11 items-center gap-2 rounded-full border border-border bg-surface px-4 text-sm font-mono transition-colors hover:border-border-strong">
            <Wallet size={15} className="text-gold-bright" />
            {shortAddr(profile.wallet)}
            {copied ? <Check size={14} className="text-green" /> : <Copy size={14} className="text-faint" />}
          </button>
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil size={15} /> Edit profile
          </Button>
        </div>
      </div>

      <p className="mt-4 max-w-xl text-[15px] text-muted">{bio}</p>
      {profile.accountType === "project" && profile.website && (
        <p className="mt-2 text-sm text-muted">{profile.website}</p>
      )}
      {xConnected ? (
        <Badge tone="blue" className="mt-3">𝕏 connected · @{sourceXHandle}</Badge>
      ) : (
        <button
          type="button"
          onClick={connectX}
          disabled={xPending}
          className="mt-3 inline-flex items-center gap-1 rounded-full border border-blue/25 bg-blue/12 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-blue transition-colors hover:border-blue/40 hover:bg-blue/18 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {xPending ? "Connecting..." : "Connect 𝕏"}
        </button>
      )}
      {xError && (
        <p className="mt-2 text-sm text-red">{xError}</p>
      )}
      {profileMessage && (
        <p className="mt-2 text-sm text-green">{profileMessage}</p>
      )}

      {/* stats */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Wins" value={<AnimatedNumber value={profile.wins} />} icon={<Trophy size={16} className="text-gold-bright" />} />
        <StatCard label="Rewards earned" value={<AnimatedNumber value={profile.earned} prefix="$" useCompact />} accent />
        <StatCard label="Campaigns joined" value={<AnimatedNumber value={profile.joined} />} />
        <StatCard label="Created" value={<AnimatedNumber value={profile.created} />} />
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
              {submissions.length ? (
                submissions.map((s) => <SubmissionRow key={s.id} s={s} />)
              ) : (
                <EmptyState>You haven&apos;t submitted any entries yet.</EmptyState>
              )}
            </div>
          )}
          {tab === "Joined" && (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {joined.length ? (
                joined.map((c, i) => <ChallengeCard key={c.id} c={c} index={i} />)
              ) : (
                <EmptyState>You haven&apos;t joined any campaigns yet.</EmptyState>
              )}
            </div>
          )}
          {tab === "Created" && (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {created.length ? (
                created.map((c, i) => <ChallengeCard key={c.id} c={c} index={i} />)
              ) : (
                <EmptyState>No campaigns found.</EmptyState>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Edit profile screen */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit profile">
        <div className="space-y-5">
          <div className="flex items-center gap-4">
            <Avatar src={avatar} alt={profile.name} size={64} verified={xConnected} />
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => setAvatar(String(reader.result || avatar));
                reader.readAsDataURL(file);
                e.target.value = "";
              }}
            />
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>Change avatar</Button>
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-muted">Display name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-12 w-full rounded-xl border border-border bg-surface px-3.5 text-sm outline-none focus:border-gold/50"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-muted">Handle</label>
            <input
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              className="h-12 w-full rounded-xl border border-border bg-surface px-3.5 text-sm outline-none focus:border-gold/50"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-muted">Account type</label>
            <div className="flex gap-2">
              {(["user", "project"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setAccountType(value)}
                  className={cn(
                    "rounded-full border px-4 py-2 text-[13px] font-medium transition-colors",
                    accountType === value ? "border-gold/40 bg-gold/12 text-gold-bright" : "border-border bg-surface text-muted hover:text-text",
                  )}
                >
                  {value === "project" ? "Project" : "User"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-muted">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className="w-full resize-none rounded-xl border border-border bg-surface p-3.5 text-sm outline-none focus:border-gold/50"
            />
          </div>
          {accountType === "project" && (
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-muted">Website</label>
              <input
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://yourproject.org"
                className="h-12 w-full rounded-xl border border-border bg-surface px-3.5 text-sm outline-none focus:border-gold/50"
              />
            </div>
          )}
          <div className="flex items-center justify-between rounded-xl bg-surface px-3.5 py-3">
            <span className="flex items-center gap-2 text-[13px] text-muted">
              <Wallet size={15} className="text-gold-bright" /> Wallet
            </span>
            <span className="font-mono text-[13px] text-green">{shortAddr(profile.wallet)}</span>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-surface px-3.5 py-3">
            <span className="text-[13px] text-muted">𝕏 account</span>
            <span className="font-mono text-[13px] text-blue">@{sourceXHandle}</span>
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="ghost" className="flex-1" onClick={() => { setName(profile.name); setBio(profile.bio); setAvatar(profile.avatar); setHandle(profile.handle); setAccountType(profile.accountType); setWebsite(profile.website || ""); setEditOpen(false); }}>
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={async () => {
                try {
                  const updated = await updateMe({ name, bio, avatar, handle, accountType, website });
                  setName(updated.user.name);
                  setBio(updated.user.bio);
                  setAvatar(updated.user.avatar);
                  setHandle(updated.user.handle);
                  setAccountType(updated.user.accountType);
                  setWebsite(updated.user.website || "");
                  setEditOpen(false);
                  await refreshUser();
                  setProfileMessage("Profile updated successfully.");
                  setTimeout(() => setProfileMessage(null), 2200);
                } catch (error) {
                  setProfileMessage(error instanceof Error ? error.message : "Could not update profile.");
                  setTimeout(() => setProfileMessage(null), 2600);
                }
              }}
            >
              Save changes
            </Button>
          </div>
        </div>
      </Modal>
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

function StatCard({ label, value, icon, accent }: { label: string; value: React.ReactNode; icon?: React.ReactNode; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-surface/50 p-4">
      <div className="flex items-center gap-1.5 text-[12px] text-faint">{icon}{label}</div>
      <p className={cn("mt-1 font-mono text-2xl font-bold", accent ? "text-green" : "text-text")}>{value}</p>
    </div>
  );
}
