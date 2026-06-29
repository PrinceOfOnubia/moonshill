"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { BadgeCheck, Check, Globe, Loader2, ShieldCheck, Wallet, FileCode2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/components/providers/AuthProvider";
import { startXConnect, submitProjectVerification } from "@/lib/api";
import { cn } from "@/lib/utils";

export function VerifyClient() {
  const { user } = useAuth();
  const isProjectAccount = user?.accountType === "project";
  const copy = useMemo(() => {
    if (isProjectAccount) {
      return {
        title: "Get verified",
        body: "Submit your project details for review. Verified projects receive the blue badge once approved.",
      };
    }
    return {
      title: "Get verified",
      body: "Verification unlocks submissions. Connect your wallet and X account to complete your profile.",
    };
  }, [isProjectAccount]);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-blue/12 text-blue">
          <ShieldCheck size={28} />
        </div>
        <h1 className="mt-4 font-display text-3xl font-bold">{copy.title}</h1>
        <p className="mx-auto mt-2 max-w-md text-muted">{copy.body}</p>
      </div>

      <motion.div
        key={isProjectAccount ? "project" : "user"}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="mt-8"
      >
        {isProjectAccount ? <ProjectFlow /> : <XFlow />}
      </motion.div>
    </div>
  );
}

function XFlow() {
  const searchParams = useSearchParams();
  const { connected, address, user, openConnect, refreshUser } = useAuth();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const linked = !!user?.xConnected;

  useEffect(() => {
    if (searchParams.get("x") === "connected") {
      void refreshUser();
    }
    const reason = searchParams.get("reason");
    const x = searchParams.get("x");
    if (x && x !== "connected") {
      setError(reason || (x === "not-configured" ? "X connection not configured yet." : "X connection failed."));
    }
  }, [refreshUser, searchParams]);

  async function connectX() {
    setPending(true);
    setError(null);
    try {
      const response = await startXConnect("/verify");
      window.location.href = response.redirectUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "X connection failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-3">
      <StepCard
        n={1}
        title="Connect your wallet"
        body="Your wallet is your identity on Moonshill."
        done={connected}
        action={<Button variant={connected ? "glass" : "primary"} onClick={() => openConnect("/verify")}>{connected ? <><Check size={16} /> {address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "Connected"}</> : <><Wallet size={16} /> Connect</>}</Button>}
      />
      <StepCard
        n={2}
        title="Connect your 𝕏 account"
        body="We check that submitted links come from this account before approval."
        done={linked}
        disabled={!connected}
        action={<Button variant={linked ? "glass" : "primary"} disabled={!connected || pending} onClick={connectX}>{linked ? <><Check size={16} /> @{user?.xHandle || "connected"}</> : pending ? "Connecting…" : "Connect 𝕏"}</Button>}
      />
      {linked && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 rounded-2xl border border-green/25 bg-green/10 p-4">
          <BadgeCheck className="text-green" />
          <p className="text-sm text-text">You can now submit entries. Links must come from <span className="font-medium">@{user?.xHandle || "your connected X account"}</span>.</p>
        </motion.div>
      )}
      {error && (
        <p className="rounded-2xl border border-red/25 bg-red/10 p-4 text-sm text-red">{error}</p>
      )}
    </div>
  );
}

function ProjectFlow() {
  const searchParams = useSearchParams();
  const { connected, address, user, openConnect, refreshUser } = useAuth();
  const [phase, setPhase] = useState<"form" | "loading">("form");
  const [error, setError] = useState<string | null>(null);
  const linked = !!user?.xConnected;
  const verificationStatus = user?.projectVerificationStatus || "unverified";

  useEffect(() => {
    if (searchParams.get("x") === "connected") {
      void refreshUser();
    }
    const reason = searchParams.get("reason");
    const x = searchParams.get("x");
    if (x && x !== "connected") {
      setError(reason || (x === "not-configured" ? "X connection not configured yet." : "X connection failed."));
    }
  }, [refreshUser, searchParams]);

  async function connectX() {
    setError(null);
    try {
      const response = await startXConnect("/verify");
      window.location.href = response.redirectUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "X connection failed.");
    }
  }

  async function submit() {
    setPhase("loading");
    setError(null);
    try {
      await submitProjectVerification();
      await refreshUser();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit project verification.");
    } finally {
      setPhase("form");
    }
  }

  if (verificationStatus === "pending") {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="rounded-2xl border border-gold/25 bg-gold/8 p-8 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-gold/15 text-gold-bright">
          <Loader2 className="animate-spin" size={26} />
        </div>
        <h3 className="mt-4 font-display text-xl font-semibold">Submitted for review</h3>
        <p className="mx-auto mt-2 max-w-sm text-muted">Admins typically approve verified projects within 24 hours. You&apos;ll get the blue badge once approved.</p>
        <Badge tone="gold" className="mt-4">● Pending admin approval</Badge>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-surface/50 p-6">
      <StepCard
        n={1}
        title="Connect your project wallet"
        body="Your approved wallet becomes the permanent login for this project account."
        done={connected}
        action={<Button variant={connected ? "glass" : "primary"} onClick={() => openConnect("/verify")}>{connected ? <><Check size={16} /> {address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "Connected"}</> : <><Wallet size={16} /> Connect</>}</Button>}
      />
      <StepCard
        n={2}
        title="Connect your official 𝕏 account"
        body="Admins review the linked X handle alongside your owner wallet before approval."
        done={linked}
        disabled={!connected}
        action={<Button variant={linked ? "glass" : "primary"} disabled={!connected} onClick={connectX}>{linked ? <><Check size={16} /> @{user?.xHandle || "connected"}</> : "Connect 𝕏"}</Button>}
      />
      <Row icon={<Globe size={16} className="text-blue" />} label="Project website" value={user?.website || "Add website in Profile first"} />
      <Row icon={<FileCode2 size={16} className="text-gold-bright" />} label="Owner wallet" value={address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "Connect wallet first"} />
      {verificationStatus === "rejected" && (
        <p className="rounded-2xl border border-red/25 bg-red/10 p-4 text-sm text-red">
          This project verification was rejected. Review your profile details, reconnect the correct X account if needed, and submit again.
        </p>
      )}
      <Link href="/profile" className="inline-flex items-center gap-1.5 text-sm text-blue transition-colors hover:text-text">
        Update project profile details
      </Link>
      <Button
        className="w-full"
        size="lg"
        disabled={phase === "loading" || !connected || !linked}
        onClick={submit}
      >
        {phase === "loading" ? <><Loader2 size={18} className="animate-spin" /> Submitting…</> : verificationStatus === "rejected" ? "Resubmit for verification" : "Submit for verification"}
      </Button>
      {error && (
        <p className="rounded-2xl border border-red/25 bg-red/10 p-4 text-sm text-red">{error}</p>
      )}
    </div>
  );
}

function StepCard({ n, title, body, done, disabled, action }: { n: number; title: string; body: string; done?: boolean; disabled?: boolean; action: React.ReactNode }) {
  return (
    <div className={cn("flex items-center gap-4 rounded-2xl border border-border bg-surface/50 p-5 transition-opacity", disabled && "opacity-50")}>
      <div className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-full border text-sm font-semibold", done ? "border-green bg-green/15 text-green" : "border-border-strong text-muted")}>
        {done ? <Check size={16} /> : n}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-[13px] text-faint">{body}</p>
      </div>
      {action}
    </div>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-surface px-3.5 py-3">
      <span className="flex items-center gap-2 text-[13px] text-muted">{icon}{label}</span>
      <span className="font-mono text-[13px] text-green">{value}</span>
    </div>
  );
}
