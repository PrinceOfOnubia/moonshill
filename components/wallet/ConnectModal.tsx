"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, ShieldCheck } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { useAuth } from "@/components/providers/AuthProvider";
import { XIcon } from "@/components/landing/social";

const STORAGE_POST_AUTH_KEY = "mb_post_auth";

export function ConnectModal() {
  const {
    connectModalOpen,
    closeConnect,
    connectError,
    loginWithEmail,
    loginWithX,
    authTarget,
  } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
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

  async function handleEmail() {
    if (!email.trim()) return;
    setPending("email");
    try {
      const result = await loginWithEmail(email.trim());
      let nextPath = result.nextPath;
      try {
        nextPath = localStorage.getItem(STORAGE_POST_AUTH_KEY) || nextPath;
        localStorage.removeItem(STORAGE_POST_AUTH_KEY);
      } catch {
        /* ignore */
      }
      router.push(result.hasSession ? nextPath : "/build");
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
            {pending === "email" ? "Working…" : "Continue"}
          </button>
        </div>

        <button
          onClick={handleX}
          disabled={pending !== null}
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
