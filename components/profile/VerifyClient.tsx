"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { BadgeCheck, Check, FileCode2, Globe, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/components/providers/AuthProvider";
import { getProjectApplication, startProjectXConnect, startXConnect, submitProjectApplication, updateProjectApplication } from "@/lib/api";
import type { ProjectApplication } from "@/lib/types";
import { cn } from "@/lib/utils";

type ProjectFormState = {
  projectName: string;
  description: string;
  chain: string;
};

function projectFormFromApplication(application: ProjectApplication | null): ProjectFormState {
  if (!application) {
    return {
      projectName: "",
      description: "",
      chain: "Multi Chain",
    };
  }
  return {
    projectName: application.projectName || "",
    description: application.description || "",
    chain: application.chain || "Multi Chain",
  };
}

export function VerifyClient({ mode = "auto" }: { mode?: "auto" | "project" | "creator" }) {
  const { user } = useAuth();
  const isProjectAccount = mode === "project" || (mode === "auto" && user?.accountType === "project");
  const copy = useMemo(() => {
    if (isProjectAccount) {
      return {
        title: "Get verified",
        body: "Submit your project details for review. Approved projects unlock the dashboard and project-only features after admin approval.",
      };
    }
    return {
      title: "Get verified",
      body: "Verification unlocks submissions. Connect your X account to complete your creator profile.",
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
  const { user, openConnect, refreshUser } = useAuth();
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
      const response = await startXConnect("/profile");
      window.location.href = response.redirectUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "X connection failed.");
    } finally {
      setPending(false);
    }
  }

  if (!user) {
    return (
      <div className="space-y-3">
        <StepCard
          n={1}
          title="Log in or sign up"
          body="Use email or X to access the creator app first."
          action={<Button onClick={() => openConnect("/profile", "user")}>Open auth</Button>}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <StepCard
        n={1}
        title="Connect your 𝕏 account"
        body="We check that submitted links come from this account before approval."
        done={linked}
        action={<Button variant={linked ? "glass" : "primary"} disabled={pending} onClick={connectX}>{linked ? <><Check size={16} /> @{user?.xHandle || "connected"}</> : pending ? "Connecting…" : "Connect 𝕏"}</Button>}
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
  const { openConnect, refreshUser, user } = useAuth();
  const [application, setApplication] = useState<ProjectApplication | null>(null);
  const [form, setForm] = useState<ProjectFormState>(projectFormFromApplication(null));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [phase, setPhase] = useState<"form" | "loading">("form");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const linked = !!application?.xConnected;
  const verificationStatus = application?.status || (user?.accountType === "project" ? "approved" : "draft");

  const loadProjectApplication = useCallback(async (retries = 1) => {
    let lastError: unknown = null;
    for (let attempt = 0; attempt < retries; attempt += 1) {
      try {
        const { application: next } = await getProjectApplication();
        return next;
      } catch (error) {
        lastError = error;
        if (attempt < retries - 1) {
          await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)));
        }
      }
    }
    throw lastError;
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadProjectApplication(searchParams.get("x") === "connected" ? 5 : 1)
      .then((next) => {
        if (cancelled) return;
        setApplication(next);
        setForm(projectFormFromApplication(next));
      })
      .catch(() => {
        if (cancelled) return;
        setApplication(null);
        setForm(projectFormFromApplication(null));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [loadProjectApplication, searchParams]);

  useEffect(() => {
    if (searchParams.get("x") === "connected") {
      void loadProjectApplication(5)
        .then((next) => {
          setApplication(next);
          setForm(projectFormFromApplication(next));
          setMessage("Project X account connected.");
        })
        .catch(() => {
          setError("Could not refresh the project application after X connection.");
        });
    }
    const reason = searchParams.get("reason");
    const x = searchParams.get("x");
    if (x && x !== "connected") {
      setError(reason || (x === "not-configured" ? "X connection not configured yet." : "X connection failed."));
    }
  }, [loadProjectApplication, refreshUser, searchParams]);

  async function connectX() {
    setError(null);
    try {
      const response = await startProjectXConnect("/build");
      window.location.href = response.redirectUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "X connection failed.");
    }
  }

  if (!application && user?.accountType !== "project") {
    return (
      <div className="space-y-4 rounded-2xl border border-border bg-surface/50 p-6">
        <StepCard
          n={1}
          title="Log in or sign up as a project"
          body="Projects use a separate auth path from creators. Start with email or X, then finish verification here."
          action={<Button onClick={() => openConnect("/build", "project")}>Login / Signup</Button>}
        />
      </div>
    );
  }

  async function saveProjectDetails() {
    if (!application) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const { application: next } = await updateProjectApplication({
        projectName: form.projectName,
        description: form.description,
        chain: form.chain,
      });
      setApplication(next);
      setForm(projectFormFromApplication(next));
      setMessage("Project details saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save project details.");
    } finally {
      setSaving(false);
    }
  }

  async function submit() {
    if (!application) return;
    setPhase("loading");
    setError(null);
    try {
      await updateProjectApplication({
        projectName: form.projectName,
        description: form.description,
        chain: form.chain,
      });
      const { application: next } = await submitProjectApplication();
      setApplication(next);
      setForm(projectFormFromApplication(next));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit project application.");
    } finally {
      setPhase("form");
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-surface/40 p-8 text-center text-muted">
        Loading project verification…
      </div>
    );
  }

  if (user?.accountType === "project" && user.projectVerificationStatus === "approved") {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="rounded-2xl border border-green/25 bg-green/10 p-8 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-green/15 text-green">
          <BadgeCheck size={26} />
        </div>
        <h3 className="mt-4 font-display text-xl font-semibold">Project approved</h3>
        <p className="mx-auto mt-2 max-w-sm text-muted">This project account is already approved. You can open the dashboard or launch a campaign now.</p>
        <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href={`/project/${user.handle}`}>
            <Button>Project dashboard</Button>
          </Link>
          <Link href="/create">
            <Button variant="outline">Launch campaign</Button>
          </Link>
        </div>
      </motion.div>
    );
  }

  if (verificationStatus === "pending") {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="rounded-2xl border border-gold/25 bg-gold/8 p-8 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-gold/15 text-gold-bright">
          <Loader2 className="animate-spin" size={26} />
        </div>
        <h3 className="mt-4 font-display text-xl font-semibold">Your project application has been submitted.</h3>
        <p className="mx-auto mt-2 max-w-sm text-muted">Our team is reviewing your project.</p>
        <p className="mx-auto mt-2 max-w-sm text-muted">Once approved, log back in with this same email or X account to access your project dashboard.</p>
        <Badge tone="gold" className="mt-4">● Pending review</Badge>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-surface/50 p-6">
      <StepCard
        n={1}
        title="Connect your official 𝕏 account"
        body="Admins review the linked X handle alongside your submitted project information."
        done={!!linked}
        action={<Button variant={linked ? "glass" : "primary"} onClick={connectX}>{linked ? <><Check size={16} /> @{application?.xHandle || "connected"}</> : "Connect 𝕏"}</Button>}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Project name"
          value={form.projectName}
          onChange={(value) => setForm((current) => ({ ...current, projectName: value }))}
          placeholder="Moonshill"
        />
        <Field
          label="Chain"
          value={form.chain}
          onChange={(value) => setForm((current) => ({ ...current, chain: value }))}
          placeholder="Multi Chain"
        />
      </div>
      <TextField
        label="Project description"
        value={form.description}
        onChange={(value) => setForm((current) => ({ ...current, description: value }))}
        placeholder="Tell the team what the project is, what it is building, and what they should review."
      />
      <Row icon={<FileCode2 size={16} className="text-gold-bright" />} label="Project login email" value={application?.email || "Signed in with X"} />
      <Row icon={<Globe size={16} className="text-blue" />} label="Connected X account" value={application?.xHandle ? `@${application.xHandle}` : "Connect X first"} />
      {verificationStatus === "rejected" && (
        <p className="rounded-2xl border border-red/25 bg-red/10 p-4 text-sm text-red">
          {application?.rejectionReason || "This project application was rejected. Review the submitted information, reconnect the correct X account if needed, and submit again."}
        </p>
      )}
      {message && (
        <p className="rounded-2xl border border-green/25 bg-green/10 p-4 text-sm text-green">{message}</p>
      )}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          variant="outline"
          size="lg"
          disabled={saving}
          onClick={saveProjectDetails}
        >
          {saving ? <><Loader2 size={18} className="animate-spin" /> Saving…</> : "Save details"}
        </Button>
        <Button
          className="w-full"
          size="lg"
          disabled={phase === "loading" || !linked || !form.projectName.trim() || !form.description.trim() || !form.chain.trim()}
          onClick={submit}
        >
          {phase === "loading" ? <><Loader2 size={18} className="animate-spin" /> Submitting…</> : verificationStatus === "rejected" ? "Resubmit application" : "Submit application"}
        </Button>
      </div>
      <p className="text-[13px] text-faint">
        After submission, the project remains in review until an admin approves it. No dashboard access is granted before approval.
      </p>
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

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-text">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-12 w-full rounded-2xl border border-border bg-surface px-4 text-sm text-text outline-none transition-colors placeholder:text-faint focus:border-gold/60"
      />
    </label>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-text">{label}</span>
      <textarea
        rows={5}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-text outline-none transition-colors placeholder:text-faint focus:border-gold/60"
      />
    </label>
  );
}
