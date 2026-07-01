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
import { startXConnect, updateMe, updateRewardWallets } from "@/lib/api";
import { XIcon } from "@/components/landing/social";

const rewardWalletChains = ["BNB", "Ethereum/Base", "Solana", "TON"] as const;

const creatorTabs = ["Submissions", "Joined", "Created"] as const;
const projectTabs = ["Created", "Active", "Completed"] as const;
const projectCategories = ["Gaming", "DeFi", "Meme", "NFT", "AI", "RWA", "Infrastructure", "Other"] as const;

export function UserProfileClient() {
  const { user, refreshUser } = useAuth();
  const [tab, setTab] = useState<(typeof creatorTabs)[number] | (typeof projectTabs)[number]>("Submissions");
  const [copied, setCopied] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [walletOpen, setWalletOpen] = useState(false);
  const [walletSaving, setWalletSaving] = useState(false);
  const [xPending, setXPending] = useState(false);
  const [xError, setXError] = useState<string | null>(null);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState("");
  const [handle, setHandle] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [projectCategory, setProjectCategory] = useState("");
  const [telegramUrl, setTelegramUrl] = useState("");
  const [rewardWallets, setRewardWallets] = useState<Record<(typeof rewardWalletChains)[number], string>>({
    BNB: "",
    "Ethereum/Base": "",
    Solana: "",
    TON: "",
  });
  const fileRef = useRef<HTMLInputElement>(null);
  const profile = user;
  const isProjectAccount = profile?.accountType === "project";
  const tabs = isProjectAccount ? projectTabs : creatorTabs;
  const joined = profile?.joinedCampaigns ?? [];
  const created = profile?.createdCampaigns ?? [];
  const activeCreated = created.filter((campaign) => new Date(campaign.endsAt).getTime() >= Date.now());
  const completedCreated = created.filter((campaign) => new Date(campaign.endsAt).getTime() < Date.now());
  const submissions = profile?.submissions ?? [];
  const sourceXHandle = profile?.xHandle || "";
  const xConnected = !!profile?.xConnected;
  const xProfileUrl = sourceXHandle ? `https://x.com/${sourceXHandle}` : null;
  const totalSponsored = created.reduce((sum, campaign) => sum + Number(campaign.rewardPool || 0), 0);

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
    if (!profile?.wallet) return;
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
    setEmail(profile.email || "");
    setWebsite(profile.website || "");
    setProjectCategory(profile.projectCategory || "");
    setTelegramUrl(profile.telegramUrl || "");
    setRewardWallets({
      BNB: profile.rewardWallets?.find((wallet) => wallet.chain === "BNB")?.address || "",
      "Ethereum/Base": profile.rewardWallets?.find((wallet) => wallet.chain === "Ethereum/Base")?.address || "",
      Solana: profile.rewardWallets?.find((wallet) => wallet.chain === "Solana")?.address || "",
      TON: profile.rewardWallets?.find((wallet) => wallet.chain === "TON")?.address || "",
    });
  }, [profile]);

  useEffect(() => {
    setTab(isProjectAccount ? "Created" : "Submissions");
  }, [isProjectAccount]);

  if (!profile) {
    return (
      <div className="rounded-2xl border border-border bg-surface/40 p-8 text-center text-muted">
        Log in to load your profile.
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
              {xProfileUrl && (
                <a
                  href={xProfileUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Open @${sourceXHandle} on X`}
                  className="grid h-7 w-7 place-items-center rounded-full text-faint transition-colors hover:text-text"
                >
                  <XIcon size={14} />
                </a>
              )}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <p className="text-sm text-faint">@{profile.handle}</p>
              {profile.accountType === "project" && profile.projectVerified && (
                <Badge tone="gold">Verified</Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {!isProjectAccount && (
            <button
              onClick={() => setWalletOpen(true)}
              className="group flex h-11 items-center gap-2 rounded-full border border-border bg-surface px-4 text-sm font-mono shadow-[0_0_0_1px_rgba(255,255,255,0.02)] transition-all hover:-translate-y-0.5 hover:border-gold/35 hover:bg-surface-2 hover:shadow-[0_10px_30px_-18px_rgba(255,199,0,0.45)]"
            >
              <Wallet size={15} className="text-gold-bright transition-transform group-hover:scale-105" />
              {profile.wallet ? "Manage reward wallet" : "Add reward wallet"}
            </button>
          )}
          {isProjectAccount && profile.wallet && (
            <button onClick={copy} className="flex h-11 items-center gap-2 rounded-full border border-border bg-surface px-4 text-sm font-mono transition-colors hover:border-border-strong">
              <Wallet size={15} className="text-gold-bright" />
              {shortAddr(profile.wallet)}
              {copied ? <Check size={14} className="text-green" /> : <Copy size={14} className="text-faint" />}
            </button>
          )}
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
        {isProjectAccount ? (
          <>
            <StatCard label="Total sponsored" value={<AnimatedNumber value={totalSponsored} prefix="$" useCompact />} accent />
            <StatCard label="Created" value={<AnimatedNumber value={created.length} />} />
            <StatCard label="Active campaigns" value={<AnimatedNumber value={activeCreated.length} />} />
            <StatCard label="Completed campaigns" value={<AnimatedNumber value={completedCreated.length} />} />
          </>
        ) : (
          <>
            <StatCard label="Wins" value={<AnimatedNumber value={profile.wins} />} icon={<Trophy size={16} className="text-gold-bright" />} />
            <StatCard label="Rewards earned" value={<AnimatedNumber value={profile.earned} prefix="$" useCompact />} accent />
            <StatCard label="Campaigns joined" value={<AnimatedNumber value={profile.joined} />} />
            <StatCard label="Created" value={<AnimatedNumber value={profile.created} />} />
          </>
        )}
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
          {!isProjectAccount && tab === "Submissions" && (
            <div className="grid gap-2.5">
              {submissions.length ? (
                submissions.map((s) => <SubmissionRow key={s.id} s={s} />)
              ) : (
                <EmptyState>You haven&apos;t submitted any entries yet.</EmptyState>
              )}
            </div>
          )}
          {!isProjectAccount && tab === "Joined" && (
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
                <EmptyState>{isProjectAccount ? "No campaigns yet." : "No campaigns found."}</EmptyState>
              )}
            </div>
          )}
          {isProjectAccount && tab === "Active" && (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {activeCreated.length ? (
                activeCreated.map((c, i) => <ChallengeCard key={c.id} c={c} index={i} />)
              ) : (
                <EmptyState>No active campaigns yet.</EmptyState>
              )}
            </div>
          )}
          {isProjectAccount && tab === "Completed" && (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {completedCreated.length ? (
                completedCreated.map((c, i) => <ChallengeCard key={c.id} c={c} index={i} />)
              ) : (
                <EmptyState>No completed campaigns yet.</EmptyState>
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
              onChange={(e) => setHandle(e.target.value.replace(/^@+/, ""))}
              className="h-12 w-full rounded-xl border border-border bg-surface px-3.5 text-sm outline-none focus:border-gold/50"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-muted">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              className="h-12 w-full rounded-xl border border-border bg-surface px-3.5 text-sm outline-none focus:border-gold/50"
            />
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
          {profile.accountType === "project" && (
            <>
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-muted">Website</label>
                <input
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://yourproject.org"
                  className="h-12 w-full rounded-xl border border-border bg-surface px-3.5 text-sm outline-none focus:border-gold/50"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-muted">Project category</label>
                <select
                  value={projectCategory}
                  onChange={(e) => setProjectCategory(e.target.value)}
                  className="h-12 w-full rounded-xl border border-border bg-surface px-3.5 text-sm outline-none focus:border-gold/50"
                >
                  <option value="">Select category</option>
                  {projectCategories.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-muted">Telegram (optional)</label>
                <input
                  value={telegramUrl}
                  onChange={(e) => setTelegramUrl(e.target.value)}
                  placeholder="https://t.me/yourproject"
                  className="h-12 w-full rounded-xl border border-border bg-surface px-3.5 text-sm outline-none focus:border-gold/50"
                />
              </div>
            </>
          )}
          {!isProjectAccount && (
            <>
              <div className="rounded-xl border border-border bg-surface px-3.5 py-3 text-[13px] text-muted">
                Reward wallets are managed separately from profile details.
              </div>
            </>
          )}
          <div className="flex items-center justify-between rounded-xl bg-surface px-3.5 py-3">
            <span className="text-[13px] text-muted">𝕏 account</span>
            {xConnected ? (
              <span className="font-mono text-[13px] text-blue">Connected · @{sourceXHandle}</span>
            ) : (
              <button
                type="button"
                onClick={connectX}
                disabled={xPending}
                className="text-[13px] font-medium text-blue transition-colors hover:text-text disabled:opacity-70"
              >
                {xPending ? "Connecting..." : "Connect X"}
              </button>
            )}
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="ghost" className="flex-1" onClick={() => { setName(profile.name); setBio(profile.bio); setAvatar(profile.avatar); setHandle(profile.handle); setEmail(profile.email || ""); setWebsite(profile.website || ""); setProjectCategory(profile.projectCategory || ""); setTelegramUrl(profile.telegramUrl || ""); setRewardWallets({ BNB: profile.rewardWallets?.find((wallet) => wallet.chain === "BNB")?.address || "", "Ethereum/Base": profile.rewardWallets?.find((wallet) => wallet.chain === "Ethereum/Base")?.address || "", Solana: profile.rewardWallets?.find((wallet) => wallet.chain === "Solana")?.address || "", TON: profile.rewardWallets?.find((wallet) => wallet.chain === "TON")?.address || "" }); setEditOpen(false); }}>
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={async () => {
                try {
                  const updated = await updateMe({
                    name,
                    bio,
                    avatar,
                    handle: handle.replace(/^@+/, ""),
                    email,
                    website,
                    projectCategory: projectCategory || undefined,
                    telegramUrl,
                  });
                  if (!isProjectAccount) {
                    setRewardWallets({
                      BNB: updated.user.rewardWallets?.find((wallet) => wallet.chain === "BNB")?.address || rewardWallets.BNB,
                      "Ethereum/Base": updated.user.rewardWallets?.find((wallet) => wallet.chain === "Ethereum/Base")?.address || rewardWallets["Ethereum/Base"],
                      Solana: updated.user.rewardWallets?.find((wallet) => wallet.chain === "Solana")?.address || rewardWallets.Solana,
                      TON: updated.user.rewardWallets?.find((wallet) => wallet.chain === "TON")?.address || rewardWallets.TON,
                    });
                  }
                  setName(updated.user.name);
                  setBio(updated.user.bio);
                  setAvatar(updated.user.avatar);
                  setHandle(updated.user.handle);
                  setEmail(updated.user.email || "");
                  setWebsite(updated.user.website || "");
                  setProjectCategory(updated.user.projectCategory || "");
                  setTelegramUrl(updated.user.telegramUrl || "");
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

      {!isProjectAccount && (
        <Modal open={walletOpen} onClose={() => setWalletOpen(false)} title="Reward wallets">
          <div className="space-y-5">
            <div className="rounded-xl border border-border bg-surface px-3.5 py-3 text-[13px] text-muted">
              Add payout wallets by chain. Your creator profile can store multiple reward destinations without changing your main profile details.
            </div>
            {profile.wallet && (
              <button
                onClick={copy}
                className="flex w-full items-center justify-between rounded-xl border border-border bg-surface px-3.5 py-3 text-left text-sm font-mono transition-colors hover:border-border-strong"
              >
                <span className="flex items-center gap-2 text-muted">
                  <Wallet size={15} className="text-gold-bright" /> Primary reward wallet
                </span>
                <span className="flex items-center gap-2 text-green">
                  {shortAddr(profile.wallet)}
                  {copied ? <Check size={14} className="text-green" /> : <Copy size={14} className="text-faint" />}
                </span>
              </button>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              {rewardWalletChains.map((chain) => (
                <div key={chain}>
                  <label className="mb-1.5 block text-[13px] font-medium text-muted">{chain}</label>
                  <input
                    value={rewardWallets[chain]}
                    onChange={(e) => setRewardWallets((current) => ({ ...current, [chain]: e.target.value }))}
                    placeholder={chain === "BNB" ? "0x..." : chain === "Solana" ? "Solana address" : "Wallet address"}
                    className="h-12 w-full rounded-xl border border-border bg-surface px-3.5 text-sm outline-none focus:border-gold/50"
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="ghost" className="flex-1" onClick={() => setWalletOpen(false)}>
                Cancel
              </Button>
              <Button
                className="flex-1"
                disabled={walletSaving}
                onClick={async () => {
                  try {
                    setWalletSaving(true);
                    await updateRewardWallets(
                      rewardWalletChains
                        .map((chain, index) => ({
                          chain,
                          address: rewardWallets[chain].trim(),
                          isPrimary: index === 0,
                        }))
                        .filter((wallet) => wallet.address),
                    );
                    await refreshUser();
                    setWalletOpen(false);
                    setProfileMessage("Reward wallets updated.");
                    setTimeout(() => setProfileMessage(null), 2200);
                  } catch (error) {
                    setProfileMessage(error instanceof Error ? error.message : "Could not update reward wallets.");
                    setTimeout(() => setProfileMessage(null), 2600);
                  } finally {
                    setWalletSaving(false);
                  }
                }}
              >
                {walletSaving ? "Saving..." : "Save wallets"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
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
