"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { BadgeCheck, Building2, Check, Globe, Loader2, Rocket, ShieldCheck, Wallet } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  getProjectApplication,
  startProjectXConnect,
  submitProjectApplication,
  updateProjectApplication,
  verifyProjectWallet,
  walletChallenge,
} from "@/lib/api";
import type { ProjectApplication, ProjectCategory } from "@/lib/types";
import { BSC_CHAIN_ID, connectInjectedWallet, formatWalletError } from "@/lib/wallet";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

const wallets = [
  { id: "metamask", name: "MetaMask", tag: "Popular", emoji: "🦊" },
  { id: "coinbase", name: "Coinbase Wallet", tag: "", emoji: "🔵" },
  { id: "okx", name: "OKX Wallet", tag: "", emoji: "⚫" },
  { id: "binance", name: "Binance Web3 Wallet", tag: "BNB Chain", emoji: "🟡" },
  { id: "trust", name: "Trust Wallet", tag: "", emoji: "🛡️" },
] as const;
type WalletId = (typeof wallets)[number]["id"];

const categories: ProjectCategory[] = ["Gaming", "DeFi", "Meme", "NFT", "AI", "RWA", "Infrastructure", "Other"];

type FormState = {
  projectName: string;
  tokenName: string;
  tokenTicker: string;
  tokenContract: string;
  chain: string;
  website: string;
  telegramUrl: string;
  discordUrl: string;
  description: string;
  logo: string;
  banner: string;
  projectCategory: string;
  verificationNotes: string;
};

const emptyForm: FormState = {
  projectName: "",
  tokenName: "",
  tokenTicker: "",
  tokenContract: "",
  chain: "BNB Chain",
  website: "",
  telegramUrl: "",
  discordUrl: "",
  description: "",
  logo: "",
  banner: "",
  projectCategory: "",
  verificationNotes: "",
};

function shortAddr(value: string) {
  return value ? `${value.slice(0, 6)}…${value.slice(-4)}` : "Not connected";
}

function formFromApplication(application: ProjectApplication | null): FormState {
  if (!application) return emptyForm;
  return {
    projectName: application.projectName || "",
    tokenName: application.tokenName || "",
    tokenTicker: application.tokenTicker || "",
    tokenContract: application.tokenContract || "",
    chain: application.chain || "BNB Chain",
    website: application.website || "",
    telegramUrl: application.telegramUrl || "",
    discordUrl: application.discordUrl || "",
    description: application.description || "",
    logo: application.logo || "",
    banner: application.banner || "",
    projectCategory: application.projectCategory || "",
    verificationNotes: application.verificationNotes || "",
  };
}

function formToPatch(form: FormState) {
  return {
    ...form,
    projectCategory: (form.projectCategory || undefined) as ProjectCategory | undefined,
  };
}

export function ProjectOnboardingClient() {
  const { refreshUser, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [application, setApplication] = useState<ProjectApplication | null>(null);
  const [walletAddress, setWalletAddress] = useState("");
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [walletPending, setWalletPending] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const intent = searchParams.get("intent") === "create" ? "create" : "dashboard";
  const approvedProject = user?.accountType === "project" && user.projectVerificationStatus === "approved" ? user : null;

  const submitDisabled = useMemo(() => {
    const required = [
      form.projectName,
      form.tokenName,
      form.tokenTicker,
      form.chain,
      form.website,
      form.telegramUrl,
      form.description,
      form.logo,
      form.banner,
    ];
    return required.some((value) => !value.trim()) || !application?.xConnected;
  }, [application?.xConnected, form]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getProjectApplication()
      .then(({ application: next }) => {
        if (cancelled) return;
        setApplication(next);
        setForm(formFromApplication(next));
        setWalletAddress(next.wallet);
      })
      .catch(() => {
        if (cancelled) return;
        setApplication(null);
        setForm(emptyForm);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (searchParams.get("x") !== "connected") return;
    let cancelled = false;
    getProjectApplication()
      .then(({ application: next }) => {
        if (cancelled) return;
        setApplication(next);
        setForm(formFromApplication(next));
        setWalletAddress(next.wallet);
        setMessage("Project X account connected.");
      })
      .catch(() => {
        if (!cancelled) setError("Could not refresh the project application after X connection.");
      });
    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  async function connectWallet(walletId: WalletId) {
    setWalletPending(walletId);
    setError(null);
    setMessage(null);
    try {
      const { address, provider } = await connectInjectedWallet(walletId);
      setWalletAddress(address);
      const challenge = await walletChallenge(address);
      const signature = (await provider.request({
        method: "personal_sign",
        params: [challenge.message, address],
      })) as string;
      const verified = await verifyProjectWallet(address, signature);
      if (verified.user) {
        await refreshUser();
        router.push(intent === "create" ? "/create" : `/project/${verified.user.handle}`);
        return;
      }
      if (verified.application) {
        setApplication(verified.application);
        setForm(formFromApplication(verified.application));
        setWalletAddress(verified.application.wallet);
        if (verified.application.status === "pending") {
          setMessage("Your project is still under review.");
        } else if (verified.application.status === "rejected") {
          setError(verified.application.rejectionReason || "This project application was rejected. Update the details and resubmit.");
        } else {
          setMessage("Project wallet connected. Complete the application to continue.");
        }
      }
    } catch (err) {
      setError(formatWalletError(err));
    } finally {
      setWalletPending(null);
    }
  }

  async function saveDraft() {
    if (!application) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const { application: next } = await updateProjectApplication(formToPatch(form));
      setApplication(next);
      setForm(formFromApplication(next));
      setMessage("Project draft saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the project application.");
    } finally {
      setSaving(false);
    }
  }

  async function submit() {
    if (!application) return;
    setSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      await updateProjectApplication(formToPatch(form));
      const { application: next } = await submitProjectApplication();
      setApplication(next);
      setForm(formFromApplication(next));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit the project application.");
    } finally {
      setSubmitting(false);
    }
  }

  async function connectX() {
    setError(null);
    setMessage(null);
    try {
      const response = await startProjectXConnect("/build");
      window.location.href = response.redirectUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not connect the project X account.");
    }
  }

  if (approvedProject) {
    return (
      <div className="space-y-8">
        <section className="overflow-hidden rounded-[28px] border border-gold/20 bg-gradient-to-br from-bg-2 via-surface to-bg p-8 sm:p-10">
          <Badge tone="gold">Approved project</Badge>
          <h1 className="mt-4 max-w-3xl font-display text-4xl font-bold leading-tight sm:text-5xl">
            Welcome back, {approvedProject.name}
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-muted">
            Your project is approved and linked to this wallet. You can open the dashboard or launch a campaign right away.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href={`/project/${approvedProject.handle}`}>
              <Button size="lg">
                <BadgeCheck size={18} /> Project dashboard
              </Button>
            </Link>
            <Link href="/create">
              <Button size="lg" variant="outline">
                <Rocket size={18} /> Launch campaign
              </Button>
            </Link>
          </div>
        </section>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-surface/40 p-10 text-center text-muted">
        Loading project onboarding…
      </div>
    );
  }

  if (application?.status === "pending") {
    return (
      <div className="space-y-8">
        <section className="overflow-hidden rounded-[28px] border border-gold/20 bg-gradient-to-br from-bg-2 via-surface to-bg p-8 text-center sm:p-10">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-gold/15 text-gold-bright">
            <Loader2 className="animate-spin" size={26} />
          </div>
          <h1 className="mt-5 font-display text-3xl font-bold sm:text-4xl">Your project application has been submitted successfully.</h1>
          <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-muted">
            Our team is reviewing your project.
          </p>
          <p className="mx-auto mt-2 max-w-xl text-[15px] leading-relaxed text-muted">
            Once approved, you can return and connect this same wallet to access your project dashboard.
          </p>
          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-gold/25 bg-gold/10 px-4 py-2 text-sm text-gold-bright">
            <ShieldCheck size={16} /> Pending review for {shortAddr(application.wallet)}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[28px] border border-gold/20 bg-gradient-to-br from-bg-2 via-surface to-bg p-8 sm:p-10">
        <Badge tone="gold">For projects</Badge>
        <h1 className="mt-4 max-w-3xl font-display text-4xl font-bold leading-tight sm:text-5xl">
          Build with Moonshill
        </h1>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-muted">
          Projects onboard separately from creators. Connect the project wallet, link the official X account, complete the application, and wait for approval before dashboard access is unlocked.
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {wallets.map((wallet) => (
            <button
              key={wallet.id}
              onClick={() => void connectWallet(wallet.id)}
              disabled={!!walletPending}
              className="flex items-center gap-3 rounded-2xl border border-border bg-surface/60 px-4 py-3.5 text-left transition-colors hover:border-border-strong hover:bg-surface-2 disabled:opacity-60"
            >
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-surface-2 text-xl">
                {wallet.emoji}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold text-text">{wallet.name}</span>
                {wallet.tag && <span className="block text-[12px] text-faint">{wallet.tag}</span>}
              </span>
              {walletPending === wallet.id ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-gold border-t-transparent" />
              ) : (
                <span className="text-[12px] font-medium text-faint">Connect</span>
              )}
            </button>
          ))}
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <StatusRow
            icon={<Wallet size={16} className="text-gold-bright" />}
            label="Project wallet"
            value={walletAddress ? shortAddr(walletAddress) : "Connect wallet"}
            done={!!walletAddress}
          />
          <StatusRow
            icon={<ShieldCheck size={16} className="text-blue" />}
            label="Official X"
            value={application?.xConnected ? `@${application.xHandle || "connected"}` : "Connect X"}
            done={!!application?.xConnected}
            action={application ? (
              <Button size="sm" variant={application.xConnected ? "glass" : "outline"} onClick={connectX}>
                {application.xConnected ? "Reconnect X" : "Connect X"}
              </Button>
            ) : undefined}
          />
          <StatusRow
            icon={<Building2 size={16} className="text-green" />}
            label="Chain"
            value={application?.chain || BSC_CHAIN_ID}
            done={!!application?.chain}
          />
        </div>

        {error && (
          <p className="mt-4 rounded-2xl border border-red/25 bg-red/10 p-4 text-sm text-red">{error}</p>
        )}
        {message && (
          <p className="mt-4 rounded-2xl border border-green/25 bg-green/10 p-4 text-sm text-green">{message}</p>
        )}
        {application?.status === "rejected" && (
          <p className="mt-4 rounded-2xl border border-red/25 bg-red/10 p-4 text-sm text-red">
            {application.rejectionReason || "This project application was rejected. Update the required details and resubmit for review."}
          </p>
        )}
      </section>

      <section className="rounded-[28px] border border-border bg-surface/40 p-6 sm:p-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-semibold">Project application</h2>
            <p className="mt-1 text-sm text-faint">Every required project field must be completed before submission.</p>
          </div>
          <Badge tone={application?.status === "rejected" ? "red" : "gold"}>
            {application?.status === "rejected" ? "Needs changes" : application ? "Draft" : "Connect wallet first"}
          </Badge>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Project name" required value={form.projectName} onChange={(value) => setForm((current) => ({ ...current, projectName: value }))} />
          <Field label="Token name" required value={form.tokenName} onChange={(value) => setForm((current) => ({ ...current, tokenName: value }))} />
          <Field label="Token ticker" required value={form.tokenTicker} onChange={(value) => setForm((current) => ({ ...current, tokenTicker: value.toUpperCase() }))} />
          <Field label="Token contract" value={form.tokenContract} onChange={(value) => setForm((current) => ({ ...current, tokenContract: value }))} placeholder="Optional if applicable" />
          <Field label="Chain" required value={form.chain} onChange={(value) => setForm((current) => ({ ...current, chain: value }))} />
          <Field label="Website" required value={form.website} onChange={(value) => setForm((current) => ({ ...current, website: value }))} placeholder="https://yourproject.xyz" />
          <Field label="Telegram" required value={form.telegramUrl} onChange={(value) => setForm((current) => ({ ...current, telegramUrl: value }))} placeholder="https://t.me/yourproject" />
          <Field label="Discord" value={form.discordUrl} onChange={(value) => setForm((current) => ({ ...current, discordUrl: value }))} placeholder="Optional" />
          <Field label="Logo" required value={form.logo} onChange={(value) => setForm((current) => ({ ...current, logo: value }))} placeholder="Logo image URL" />
          <Field label="Banner" required value={form.banner} onChange={(value) => setForm((current) => ({ ...current, banner: value }))} placeholder="Banner image URL" />
          <SelectField
            label="Category"
            value={form.projectCategory}
            onChange={(value) => setForm((current) => ({ ...current, projectCategory: value }))}
            options={categories}
          />
        </div>

        <div className="mt-4 grid gap-4">
          <TextField
            label="Description"
            required
            value={form.description}
            onChange={(value) => setForm((current) => ({ ...current, description: value }))}
            rows={5}
            placeholder="Explain what the project is, what it is launching, and what reviewers should know."
          />
          <TextField
            label="Verification information"
            value={form.verificationNotes}
            onChange={(value) => setForm((current) => ({ ...current, verificationNotes: value }))}
            rows={4}
            placeholder="Anything the team should review alongside the application."
          />
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button size="lg" variant="outline" onClick={() => void saveDraft()} disabled={!application || saving}>
            {saving ? <><Loader2 size={18} className="animate-spin" /> Saving…</> : "Save draft"}
          </Button>
          <Button size="lg" onClick={() => void submit()} disabled={!application || submitting || submitDisabled}>
            {submitting ? <><Loader2 size={18} className="animate-spin" /> Submitting…</> : "Submit project application"}
          </Button>
        </div>
      </section>
    </div>
  );
}

function StatusRow({
  icon,
  label,
  value,
  done,
  action,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  done?: boolean;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface/50 p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-sm text-muted">{icon}{label}</span>
        {done ? <Check size={16} className="text-green" /> : null}
      </div>
      <p className="mt-2 font-mono text-[13px] text-text">{value}</p>
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-text">
        {label}{required ? <span className="text-gold-bright"> *</span> : null}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-12 w-full rounded-2xl border border-border bg-surface px-4 text-sm text-text outline-none transition-colors placeholder:text-faint focus:border-gold/60"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-text">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full rounded-2xl border border-border bg-surface px-4 text-sm text-text outline-none transition-colors focus:border-gold/60"
      >
        <option value="">Select category</option>
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function TextField({
  label,
  value,
  onChange,
  rows,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows: number;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-text">
        {label}{required ? <span className="text-gold-bright"> *</span> : null}
      </span>
      <textarea
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-text outline-none transition-colors placeholder:text-faint focus:border-gold/60"
      />
    </label>
  );
}
