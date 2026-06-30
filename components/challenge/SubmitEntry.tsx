"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Link2, Loader2, Plus, ShieldCheck, Trash2, Upload } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type { Challenge, SubmissionStatus } from "@/lib/types";
import { useAuth } from "@/components/providers/AuthProvider";
import { submitCampaign } from "@/lib/api";

const statusTone: Record<SubmissionStatus, "gold" | "green" | "blue" | "red"> = {
  "Pending Review": "gold",
  Approved: "blue",
  Winner: "green",
  Rejected: "red",
};

export function SubmitEntry({
  challenge,
  open,
  onClose,
}: {
  challenge: Challenge;
  open: boolean;
  onClose: () => void;
}) {
  const { user, refreshUser } = useAuth();
  const isCreator = user?.id === challenge.creator.id;
  const alreadySubmitted = !!user?.submissions?.some((submission) => submission.challengeId === challenge.id);
  const isMulti = challenge.submissionType === "Multiple Links";
  const isUpload = challenge.submissionType === "Image Upload";
  const [links, setLinks] = useState<string[]>([""]);
  const [upload, setUpload] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<"form" | "loading" | "done">("form");
  const submitter = user;

  const cleanLinks = links.map((l) => l.trim()).filter(Boolean);
  const valid = !!submitter && !isCreator && !alreadySubmitted && (isUpload ? !!upload : cleanLinks.some(isLikelyUrl));

  async function submit() {
    if (!submitter) {
      setError("Connect your wallet before submitting.");
      return;
    }
    if (isCreator) {
      setError("You created this campaign. Creators cannot submit entries to their own campaigns.");
      return;
    }
    if (alreadySubmitted) {
      setError("You have already submitted an entry to this campaign.");
      return;
    }
    if (!isUpload && !cleanLinks.some(isLikelyUrl)) {
      setError("Enter a valid submission link.");
      return;
    }
    setPhase("loading");
    setError(null);
    try {
      await submitCampaign(challenge.id, {
        link: isUpload ? upload : cleanLinks.find(isLikelyUrl),
        links: cleanLinks.filter(isLikelyUrl),
        type: challenge.submissionType,
      });
      await refreshUser();
      setPhase("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit entry.");
      setPhase("form");
    }
  }

  function reset() {
    setPhase("form");
    setLinks([""]);
    setUpload(null);
    setError(null);
    onClose();
  }

  const footer =
    phase === "done" ? (
      <Button className="w-full" onClick={reset}>
        Got it
      </Button>
    ) : (
      <Button className="w-full" onClick={submit} disabled={!valid || phase === "loading"}>
        {phase === "loading" ? (
          <>
            <Loader2 size={18} className="animate-spin" /> Submitting...
          </>
        ) : (
          "Submit entry"
        )}
      </Button>
    );

  return (
    <Modal
      open={open}
      onClose={reset}
      title={phase === "done" ? "Entry submitted" : "Submit your entry"}
      footer={footer}
    >
      {phase === "done" ? (
        <div className="py-4 text-center">
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 18 }}
            className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-green/12 text-green"
          >
            <CheckCircle2 size={34} />
          </motion.div>
          <h4 className="mt-4 font-display text-xl font-semibold">You&apos;re in the arena</h4>
          <p className="mx-auto mt-2 max-w-xs text-sm text-muted">
            Entry submitted successfully for <span className="text-text">{challenge.title}</span>.
          </p>
          <div className="mt-4 flex justify-center">
            <Badge tone={statusTone["Pending Review"]}>● Submitted</Badge>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {!submitter && (
            <p className="rounded-xl border border-gold/25 bg-gold/10 px-3 py-2 text-[13px] text-gold-bright">
              Connect your wallet before submitting.
            </p>
          )}
          {isCreator && (
            <p className="rounded-xl border border-gold/25 bg-gold/10 px-3 py-2 text-[13px] text-gold-bright">
              You created this campaign. Creators cannot submit entries to their own campaigns.
            </p>
          )}
          {alreadySubmitted && (
            <p className="rounded-xl border border-blue/25 bg-blue/10 px-3 py-2 text-[13px] text-blue">
              You already submitted an entry to this campaign.
            </p>
          )}
          {/* verified X account notice */}
          <div className="flex items-center gap-3 rounded-2xl border border-blue/20 bg-blue/8 p-3.5">
            <ShieldCheck size={20} className="shrink-0 text-blue" />
            <p className="text-[13px] text-muted">
              Submitting as <span className="font-medium text-text">@{submitter?.xHandle || "your connected X account"}</span>. Links must come
              from your connected X account to be approved.
            </p>
          </div>

          <div>
            <label className="text-[13px] font-medium text-muted">Submission type</label>
            <div className="mt-1.5">
              <Badge tone="neutral">{challenge.submissionType}</Badge>
            </div>
          </div>

          {isUpload ? (
            <label className="flex h-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border-strong bg-surface text-faint transition-colors hover:border-gold/50 hover:text-muted">
              <Upload size={24} />
              <span className="text-sm font-medium">Tap to upload your artwork</span>
              <span className="text-[12px]">{upload ? "Artwork ready" : "PNG / JPG · up to 12MB"}</span>
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => setUpload(String(reader.result || ""));
                  reader.readAsDataURL(file);
                  e.target.value = "";
                }}
              />
            </label>
          ) : (
            <div className="space-y-2.5">
              <label className="text-[13px] font-medium text-muted">
                {isMulti ? "Your links" : `${challenge.submissionType} link`}
              </label>
              {links.map((link, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="flex h-12 flex-1 items-center gap-2.5 rounded-xl border border-border bg-surface px-3.5 focus-within:border-gold/50">
                    <Link2 size={16} className="text-faint" />
                    <input
                      value={link}
                      onChange={(e) => {
                        const next = [...links];
                        next[i] = e.target.value;
                        setLinks(next);
                      }}
                      placeholder="https://x.com/you/status/…"
                      className="h-full flex-1 bg-transparent text-sm outline-none placeholder:text-faint"
                    />
                  </div>
                  {isMulti && links.length > 1 && (
                    <button
                      onClick={() => setLinks(links.filter((_, idx) => idx !== i))}
                      className="grid h-12 w-10 place-items-center rounded-xl text-faint hover:text-red"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
              {isMulti && links.length < 5 && (
                <button
                  onClick={() => setLinks([...links, ""])}
                  className="flex items-center gap-1.5 text-[13px] font-medium text-gold-bright hover:underline"
                >
                  <Plus size={14} /> Add another link
                </button>
              )}
            </div>
          )}

          {!!challenge.requiredTags?.length && (
            <div className="rounded-xl bg-surface p-3.5">
              <p className="text-[12px] text-faint">Your post must include</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {challenge.requiredTags.map((t) => (
                  <span key={t} className="rounded-md bg-surface-2 px-2 py-1 font-mono text-[12px] text-gold-bright">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {error && <p className="rounded-xl border border-red/25 bg-red/10 px-3 py-2 text-[13px] text-red">{error}</p>}

        </div>
      )}
    </Modal>
  );
}

function isLikelyUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}
