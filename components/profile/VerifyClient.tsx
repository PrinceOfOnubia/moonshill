"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { BadgeCheck, Check, Globe, Loader2, ShieldCheck, Wallet, FileCode2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/providers/AuthProvider";
import { startXConnect } from "@/lib/api";

const modes = ["Verify X account", "Verify a project"] as const;

export function VerifyClient() {
  const [mode, setMode] = useState<(typeof modes)[number]>("Verify X account");

  return (
    <div className="mx-auto max-w-2xl">
      <div className="text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-blue/12 text-blue">
          <ShieldCheck size={28} />
        </div>
        <h1 className="mt-4 font-display text-3xl font-bold">Get verified</h1>
        <p className="mx-auto mt-2 max-w-md text-muted">
          Verification unlocks submissions and grants the blue badge to projects. Pick a flow below.
        </p>
      </div>

      <div className="mx-auto mt-7 flex max-w-sm rounded-full border border-border bg-surface/60 p-1">
        {modes.map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={cn(
              "relative flex-1 rounded-full px-3 py-2 text-[13px] font-medium transition-colors",
              mode === m ? "text-black" : "text-muted hover:text-text",
            )}
          >
            {mode === m && <motion.span layoutId="verifytab" className="absolute inset-0 rounded-full bg-gradient-to-b from-gold-bright to-gold" transition={{ type: "spring", stiffness: 380, damping: 30 }} />}
            <span className="relative">{m}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={mode} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} className="mt-8">
          {mode === "Verify X account" ? <XFlow /> : <ProjectFlow />}
        </motion.div>
      </AnimatePresence>
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
        action={<Button variant={connected ? "glass" : "primary"} onClick={openConnect}>{connected ? <><Check size={16} /> {address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "Connected"}</> : <><Wallet size={16} /> Connect</>}</Button>}
      />
      <StepCard
        n={2}
        title="Connect your 𝕏 account"
        body="We check that submitted links come from this account before approval."
        done={linked}
        disabled={!connected}
        action={<Button variant={linked ? "glass" : "primary"} disabled={!connected || pending} onClick={connectX}>{linked ? <><Check size={16} /> @{user?.xHandle || user?.handle}</> : pending ? "Connecting…" : "Connect 𝕏"}</Button>}
      />
      {linked && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 rounded-2xl border border-green/25 bg-green/10 p-4">
          <BadgeCheck className="text-green" />
          <p className="text-sm text-text">You can now submit entries. Links must come from <span className="font-medium">@{user?.xHandle || user?.handle}</span>.</p>
        </motion.div>
      )}
      {error && (
        <p className="rounded-2xl border border-red/25 bg-red/10 p-4 text-sm text-red">{error}</p>
      )}
    </div>
  );
}

function ProjectFlow() {
  const [phase, setPhase] = useState<"form" | "loading" | "pending">("form");
  const [website, setWebsite] = useState("");
  const [contract, setContract] = useState("");

  if (phase === "pending") {
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
      <Row icon={<Wallet size={16} className="text-gold-bright" />} label="Project wallet" value="0x0E09…1cE82 (connected)" />
      <Row icon={<BadgeCheck size={16} className="text-blue" />} label="Official 𝕏 account" value="@verified (connected)" />
      <div>
        <label className="mb-1.5 flex items-center gap-1.5 text-[13px] font-medium text-muted"><Globe size={14} /> Website</label>
        <input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://yourproject.org" className="h-12 w-full rounded-xl border border-border bg-surface px-3.5 text-sm outline-none placeholder:text-faint focus:border-gold/50" />
      </div>
      <div>
        <label className="mb-1.5 flex items-center gap-1.5 text-[13px] font-medium text-muted"><FileCode2 size={14} /> Contract address</label>
        <input value={contract} onChange={(e) => setContract(e.target.value)} placeholder="0x…" className="h-12 w-full rounded-xl border border-border bg-surface px-3.5 font-mono text-sm outline-none placeholder:text-faint focus:border-gold/50" />
      </div>
      <Button
        className="w-full"
        size="lg"
        disabled={phase === "loading"}
        onClick={() => { setPhase("loading"); setTimeout(() => setPhase("pending"), 1200); }}
      >
        {phase === "loading" ? <><Loader2 size={18} className="animate-spin" /> Submitting…</> : "Submit for verification"}
      </Button>
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
