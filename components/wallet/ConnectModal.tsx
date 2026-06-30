"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Mail, ShieldCheck } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { useAuth } from "@/components/providers/AuthProvider";
import { XIcon } from "@/components/landing/social";

const STORAGE_POST_AUTH_KEY = "mb_post_auth";

export function ConnectModal() {
  const {
    connectModalOpen,
    closeConnect,
    connectError,
    startEmailLogin,
    verifyEmailLogin,
    resendEmailLogin,
    loginWithX,
    authTarget,
  } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [emailStep, setEmailStep] = useState<"entry" | "verify">("entry");
  const [codeMeta, setCodeMeta] = useState<{ expiresAt: string; resendAfterSeconds: number } | null>(null);
  const [pending, setPending] = useState<"email" | "x" | null>(null);

  const copy = useMemo(() => authTarget === "project"
    ? {
      title: "Log in or sign up",
      body: "Continue as a project with email or X. After login, you’ll finish verification before project access is approved.",
    }
    : {
      title: "Log in or sign up",
      body: "Continue as a creator with email or X. Your Moonshill account opens immediately and you can add reward wallets later from your profile.",
    }, [authTarget]);

  useEffect(() => {
    if (!connectModalOpen) {
      setPending(null);
      setCode("");
      setCodeMeta(null);
      setEmailStep("entry");
    }
  }, [connectModalOpen]);

  async function handleEmail() {
    if (!email.trim()) return;
    setPending("email");
    try {
      const result = await startEmailLogin(email.trim());
      setCodeMeta({
        expiresAt: result.expiresAt,
        resendAfterSeconds: result.resendAfterSeconds,
      });
      setCode("");
      setEmail(result.email);
      setEmailStep("verify");
    } finally {
      setPending(null);
    }
  }

  async function handleVerifyCode() {
    if (!email.trim() || !/^\d{6}$/.test(code.trim())) return;
    setPending("email");
    try {
      const result = await verifyEmailLogin(email.trim(), code.trim());
      let nextPath = result.nextPath;
      try {
        nextPath = localStorage.getItem(STORAGE_POST_AUTH_KEY) || nextPath;
        localStorage.removeItem(STORAGE_POST_AUTH_KEY);
      } catch {
        /* ignore */
      }
      setEmailStep("entry");
      setCode("");
      setCodeMeta(null);
      router.push(result.hasSession ? nextPath : "/build");
    } finally {
      setPending(null);
    }
  }

  async function handleResend() {
    if (!email.trim()) return;
    setPending("email");
    try {
      const result = await resendEmailLogin(email.trim());
      setCodeMeta({
        expiresAt: result.expiresAt,
        resendAfterSeconds: result.resendAfterSeconds,
      });
      setCode("");
    } finally {
      setPending(null);
    }
  }

  async function handleX() {
    setPending("x");
    try {
      await loginWithX();
    } finally {
      setPending(null);
    }
  }

  return (
    <Modal open={connectModalOpen} onClose={closeConnect} title={copy.title}>
      <p className="mb-5 text-[13.5px] leading-relaxed text-muted">
        {copy.body}
      </p>

      <div className="space-y-3">
        {emailStep === "entry" ? (
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface/60 px-4 py-3.5 transition-colors focus-within:border-border-strong">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-surface-2 text-muted">
              <Mail size={20} />
            </span>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="your@email.com"
              className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-text outline-none placeholder:text-faint"
            />
            <button
              type="button"
              onClick={handleEmail}
              disabled={pending !== null || !email.trim()}
              className="rounded-xl bg-surface-2 px-3 py-2 text-[12px] font-medium text-text transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending === "email" ? "Sending…" : "Continue"}
            </button>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-surface/60 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  if (pending) return;
                  setEmailStep("entry");
                  setCode("");
                }}
                className="inline-flex items-center gap-1 text-[12px] font-medium text-faint transition-colors hover:text-text"
              >
                <ArrowLeft size={14} />
                Back
              </button>
              <span className="text-[12px] text-faint">{email}</span>
            </div>
            <label className="block text-[12px] font-medium uppercase tracking-[0.18em] text-faint">
              Verification code
            </label>
            <input
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="123456"
              inputMode="numeric"
              className="mt-2 h-12 w-full rounded-2xl border border-border bg-surface px-4 text-center text-[24px] tracking-[0.35em] text-text outline-none placeholder:text-faint"
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <div className="text-[12px] text-faint">
                {codeMeta ? `Expires ${new Date(codeMeta.expiresAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : "Code expires in 10 minutes"}
              </div>
              <button
                type="button"
                onClick={handleResend}
                disabled={pending !== null}
                className="text-[12px] font-medium text-gold transition-colors hover:text-gold-bright disabled:opacity-60"
              >
                {pending === "email" ? "Sending…" : "Resend code"}
              </button>
            </div>
            <button
              type="button"
              onClick={handleVerifyCode}
              disabled={pending !== null || !/^\d{6}$/.test(code.trim())}
              className="mt-4 w-full rounded-2xl bg-gold px-4 py-3 text-[14px] font-semibold text-black transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending === "email" ? "Verifying…" : "Verify and continue"}
            </button>
          </div>
        )}

        <button
          onClick={handleX}
          disabled={pending !== null || emailStep === "verify"}
          className="flex w-full items-center gap-3 rounded-2xl border border-border bg-surface/60 px-4 py-3.5 text-left transition-colors hover:border-border-strong hover:bg-surface-2 disabled:opacity-60"
        >
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-black text-white">
            <XIcon size={18} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold text-text">Twitter / X</span>
            <span className="block text-[12px] text-faint">Continue with your X account</span>
          </span>
          <span className="text-[12px] font-medium text-faint">
            {pending === "x" ? "Opening…" : "Continue"}
          </span>
        </button>
      </div>

      {connectError && (
        <p className="mt-4 rounded-xl border border-red/25 bg-red/10 px-3 py-2 text-[12px] text-red">
          {connectError}
        </p>
      )}

      <p className="mt-5 flex items-center justify-center gap-1.5 text-[12px] text-faint">
        <ShieldCheck size={14} className="text-green" />
        Secure session · add reward wallets later from profile
      </p>
    </Modal>
  );
}
