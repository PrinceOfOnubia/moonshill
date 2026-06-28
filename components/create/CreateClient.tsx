"use client";

import { useEffect, useMemo, useState } from "react";
import { Link } from "next-view-transitions";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronLeft, ChevronRight, Clock, ImageIcon, PartyPopper, Upload, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import type { Category, PresetRewardToken, RewardTokenOption, SubmissionType, TokenMetadata } from "@/lib/types";
import { cn, fmtUsd } from "@/lib/utils";
import { useAuth } from "@/components/providers/AuthProvider";
import { createCampaign, getBnbMarketPrice, getTokenMetadata } from "@/lib/api";

const categories: Category[] = ["Memes", "Threads", "Videos", "AI", "Design", "Research"];
const tokens: RewardTokenOption[] = ["BNB", "USDT", "USDC", "MEME", "ETH"];
const subTypes: SubmissionType[] = ["X Post", "Thread", "Quote", "Video"];
const durationOptions = [
  { label: "1 Day (24 Hours)", value: "1" },
  { label: "3 Days", value: "3" },
  { label: "7 Days", value: "7" },
  { label: "30 Days", value: "30" },
  { label: "Custom", value: "custom" },
] as const;
const requiredMoonshillRule = "Must follow @moonshillfun on X";
const covers = [
  "photo-1620207418302-439b387441b0", "photo-1634986666676-ec8fd927c23d",
  "photo-1639762681485-074b7f938ba0", "photo-1535016120720-40c646be5580",
  "photo-1605792657660-596af9009e82", "photo-1526374965328-7f61d4dc18c5",
];
const cover = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=80`;
const fallbackTokenUsd: Record<PresetRewardToken, number> = { BNB: 600, ETH: 3200, USDT: 1, USDC: 1, MEME: 0.002, CAKE: 2.5 };

const steps = ["Basics", "Reward & Schedule", "Rules & Submission"];

export function CreateClient() {
  const { connected, openConnect, user } = useAuth();
  const [step, setStep] = useState(0);
  const [published, setPublished] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdCampaignSlug, setCreatedCampaignSlug] = useState<string | null>(null);

  const [coverId, setCoverId] = useState(covers[0]);
  const [customCover, setCustomCover] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [category, setCategory] = useState<Category>("Memes");
  const [token, setToken] = useState<RewardTokenOption>("BNB");
  const [customTokenAddress, setCustomTokenAddress] = useState("");
  const [customTokenMeta, setCustomTokenMeta] = useState<TokenMetadata | null>(null);
  const [customTokenLoading, setCustomTokenLoading] = useState(false);
  const [customTokenError, setCustomTokenError] = useState<string | null>(null);
  const [amount, setAmount] = useState(1);
  const [winners, setWinners] = useState(1);
  const [duration, setDuration] = useState<(typeof durationOptions)[number]["value"]>("1");
  const [customDays, setCustomDays] = useState(1);
  const [submissionTypes, setSubmissionTypes] = useState<SubmissionType[]>(["X Post"]);
  const [rules, setRules] = useState("Original content only\nMust tag the project\n1 entry per account");
  const [tags, setTags] = useState("");
  const [bnbPrice, setBnbPrice] = useState(fallbackTokenUsd.BNB);

  const coverSrc = customCover ?? cover(coverId);
  const days = duration === "custom" ? Math.max(1, customDays) : Number(duration);
  const tokenUsd = useMemo<Record<PresetRewardToken, number>>(() => ({ ...fallbackTokenUsd, BNB: bnbPrice }), [bnbPrice]);

  useEffect(() => {
    let cancelled = false;
    getBnbMarketPrice()
      .then((market) => {
        if (!cancelled && Number.isFinite(market.price) && market.price > 0) setBnbPrice(market.price);
      })
      .catch(() => {
        if (!cancelled) setBnbPrice(fallbackTokenUsd.BNB);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function onUploadCover(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => setCustomCover(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  const pool = token === "CUSTOM" ? 0 : Math.round(amount * tokenUsd[token]);
  const creator = user;
  const rewardLabel = token === "CUSTOM" ? (customTokenMeta?.symbol || "Custom token") : token;
  const canNext =
    step === 0 ? title.trim().length > 2 : step === 1 ? amount > 0 && winners > 0 && (token !== "CUSTOM" || !!customTokenMeta) : true;

  async function fetchCustomToken() {
    if (!customTokenAddress.trim()) {
      setCustomTokenError("Paste a token contract address first.");
      setCustomTokenMeta(null);
      return;
    }
    setCustomTokenLoading(true);
    setCustomTokenError(null);
    try {
      const response = await getTokenMetadata(customTokenAddress.trim());
      setCustomTokenMeta(response.token);
    } catch (err) {
      setCustomTokenMeta(null);
      setCustomTokenError(err instanceof Error ? err.message : "Could not fetch token metadata.");
    } finally {
      setCustomTokenLoading(false);
    }
  }

  async function publish() {
    if (!connected) {
      openConnect();
      return;
    }
    setPublishing(true);
    setError(null);
    try {
      const selectedTypes = submissionTypes.length ? submissionTypes : ["X Post"];
      const proof = selectedTypes.map((type) => `Submit ${type.toLowerCase()} link`);
      const created = await createCampaign({
        title,
        description: desc,
        category,
        cover: coverSrc,
        rewardToken: token,
        rewardTokenAddress: customTokenMeta?.address,
        rewardTokenMeta: customTokenMeta,
        rewardAmount: amount,
        winners,
        days,
        submissionType: selectedTypes.join(", "),
        submissionTypes: selectedTypes,
        rules: [requiredMoonshillRule, ...rules.split("\n").map((rule) => rule.trim()).filter(Boolean)],
        proof,
        requiredTags: tags.split(/\s+/).filter(Boolean),
      });
      setCreatedCampaignSlug(created.campaign.slug);
      setPublished(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create campaign.");
    } finally {
      setPublishing(false);
    }
  }

  if (published) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 280, damping: 16 }}
          className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-gradient-to-br from-gold-bright to-gold text-black glow-gold"
        >
          <PartyPopper size={38} />
        </motion.div>
        <h1 className="mt-6 font-display text-3xl font-bold">Campaign created successfully.</h1>
        <p className="mx-auto mt-3 max-w-sm text-muted">
          <span className="text-text">{title || "Your campaign"}</span> is live with a{" "}
          <span className="font-mono text-green">{token === "CUSTOM" ? `${amount} ${rewardLabel}` : fmtUsd(pool)}</span> pool. The timeline awaits.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button size="lg" onClick={() => { setPublished(false); setStep(0); setCreatedCampaignSlug(null); }}>Create another</Button>
          {createdCampaignSlug && (
            <Link href={`/challenge/${createdCampaignSlug}`}>
              <Button size="lg" variant="outline">View campaign</Button>
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold sm:text-4xl">Create a campaign</h1>
        <p className="mt-2 text-muted">Fund a mission and let creators compete for the pool.</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
        {/* form */}
        <div>
          {/* stepper */}
          <div className="mb-7 flex items-center gap-2">
            {steps.map((s, i) => (
              <div key={s} className="flex flex-1 items-center gap-2">
                <div className={cn(
                  "grid h-8 w-8 shrink-0 place-items-center rounded-full border text-[13px] font-semibold transition-colors",
                  i < step ? "border-green bg-green/15 text-green"
                    : i === step ? "border-gold bg-gold/15 text-gold-bright"
                    : "border-border text-faint",
                )}>
                  {i < step ? <Check size={15} /> : i + 1}
                </div>
                <span className={cn("hidden text-[13px] font-medium sm:block", i === step ? "text-text" : "text-faint")}>{s}</span>
                {i < steps.length - 1 && <div className="h-px flex-1 bg-border" />}
              </div>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 18 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -18 }}
              transition={{ duration: 0.25 }}
              className="space-y-5"
            >
              {step === 0 && (
                <>
                  <Field label="Cover image">
                    <div className="grid grid-cols-3 gap-2.5">
                      {/* upload your own */}
                      <label
                        className={cn(
                          "relative flex aspect-video cursor-pointer flex-col items-center justify-center gap-1 overflow-hidden rounded-xl border-2 border-dashed text-faint transition-colors",
                          customCover ? "border-gold" : "border-border-strong hover:border-gold/60 hover:text-muted",
                        )}
                      >
                        {customCover ? (
                          <>
                            <img src={customCover} alt="Your cover" className="absolute inset-0 h-full w-full object-cover" />
                            <span className="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-gold text-black">
                              <Check size={13} />
                            </span>
                            <span className="relative rounded-md bg-black/55 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur">
                              Change
                            </span>
                          </>
                        ) : (
                          <>
                            <Upload size={18} />
                            <span className="text-[11px] font-medium">Upload</span>
                          </>
                        )}
                        <input type="file" accept="image/*" onChange={onUploadCover} className="hidden" />
                      </label>

                      {covers.map((id) => {
                        const selected = !customCover && coverId === id;
                        return (
                          <button
                            key={id}
                            onClick={() => { setCustomCover(null); setCoverId(id); }}
                            className={cn(
                              "relative aspect-video overflow-hidden rounded-xl border-2 transition-colors",
                              selected ? "border-gold" : "border-transparent opacity-70 hover:opacity-100",
                            )}
                          >
                            <img src={cover(id)} alt="" className="h-full w-full object-cover" />
                            {selected && (
                              <span className="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-gold text-black">
                                <Check size={13} />
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    <p className="mt-2 text-[12px] text-faint">PNG / JPG / GIF · 16:9 looks best</p>
                  </Field>
                  <Field label="Title">
                    <Input value={title} onChange={setTitle} placeholder="e.g. BNB Chain Meme Mania" />
                  </Field>
                  <Field label="Description">
                    <textarea
                      value={desc}
                      onChange={(e) => setDesc(e.target.value)}
                      rows={4}
                      placeholder="What should creators make? What wins?"
                      className="w-full resize-none rounded-xl border border-border bg-surface p-3.5 text-sm outline-none placeholder:text-faint focus:border-gold/50"
                    />
                  </Field>
                  <Field label="Category">
                    <Chips options={categories} value={category} onChange={setCategory} />
                  </Field>
                </>
              )}

              {step === 1 && (
                <>
                  <Field label="Reward token">
                    <Chips
                      options={tokens}
                      value={token}
                      onChange={(next) => {
                        setToken(next);
                        setCustomTokenError(null);
                        if (next !== "CUSTOM") {
                          setCustomTokenAddress("");
                          setCustomTokenMeta(null);
                        }
                      }}
                      render={(value) => value === "CUSTOM" ? "Custom Token" : value}
                    />
                  </Field>
                  {token === "CUSTOM" && (
                    <div className="rounded-xl border border-border bg-surface/60 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row">
                        <div className="flex-1">
                          <label className="mb-1.5 block text-[13px] font-medium text-muted">Token contract address</label>
                          <Input
                            value={customTokenAddress}
                            onChange={(value) => {
                              setCustomTokenAddress(value);
                              setCustomTokenMeta(null);
                              setCustomTokenError(null);
                            }}
                            placeholder="0x..."
                          />
                        </div>
                        <div className="sm:pt-7">
                          <Button variant="outline" onClick={fetchCustomToken} disabled={customTokenLoading}>
                            {customTokenLoading ? "Fetching..." : "Fetch token"}
                          </Button>
                        </div>
                      </div>
                      {customTokenMeta && (
                        <div className="mt-4 rounded-xl border border-green/20 bg-green/8 p-3.5 text-sm">
                          <p className="font-medium text-text">{customTokenMeta.name} ({customTokenMeta.symbol})</p>
                          <p className="mt-1 text-muted">Decimals: {customTokenMeta.decimals}</p>
                          <p className="mt-1 font-mono text-[12px] text-green">{customTokenMeta.address}</p>
                        </div>
                      )}
                      {customTokenError && (
                        <p className="mt-3 rounded-xl border border-red/25 bg-red/10 px-3 py-2 text-[13px] text-red">{customTokenError}</p>
                      )}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Reward amount">
                      <NumberInput value={amount} onChange={setAmount} suffix={rewardLabel} />
                    </Field>
                    <Field label="Number of winners">
                      <NumberInput value={winners} onChange={setWinners} />
                    </Field>
                  </div>
                  <div className="rounded-xl border border-green/20 bg-green/8 p-4">
                    <p className="text-[12px] text-faint">Total reward pool (est.)</p>
                    <p className="font-mono text-2xl font-bold text-green">{fmtUsd(pool)}</p>
                    <p className="mt-0.5 text-[12px] text-muted">
                      {token === "CUSTOM" ? "Custom token campaigns keep token rewards without a USD estimate." : `≈ ${fmtUsd(Math.round(pool / winners))} per winner`}
                    </p>
                  </div>
                  <Field label="Duration">
                    <Chips
                      options={durationOptions.map((option) => option.value)}
                      value={duration}
                      onChange={setDuration}
                      render={(value) => durationOptions.find((option) => option.value === value)?.label || "Custom"}
                    />
                    {duration === "custom" && (
                      <div className="mt-3 max-w-xs">
                        <NumberInput value={customDays} onChange={setCustomDays} suffix="days" />
                      </div>
                    )}
                  </Field>
                </>
              )}

              {step === 2 && (
                <>
                  <Field label="Submission type">
                    <div className="grid grid-cols-2 gap-2">
                      {subTypes.map((s) => (
                        <button
                          key={s}
                          onClick={() => {
                            setSubmissionTypes((prev) =>
                              prev.includes(s)
                                ? prev.filter((type) => type !== s)
                                : [...prev, s],
                            );
                          }}
                          className={cn(
                            "rounded-xl border px-3 py-3 text-left text-[13px] font-medium transition-colors",
                            submissionTypes.includes(s) ? "border-gold/40 bg-gold/12 text-gold-bright" : "border-border bg-surface text-muted hover:text-text",
                          )}
                        >
                          <span className="flex items-center gap-2">
                            <span className={cn(
                              "grid h-4 w-4 place-items-center rounded border",
                              submissionTypes.includes(s) ? "border-gold bg-gold text-black" : "border-border-strong",
                            )}>
                              {submissionTypes.includes(s) && <Check size={11} />}
                            </span>
                            {s}
                          </span>
                        </button>
                      ))}
                    </div>
                  </Field>
                  <div className="rounded-xl border border-gold/20 bg-gold/8 p-3.5">
                    <p className="text-[12px] font-medium uppercase tracking-wider text-gold-bright">Required rule</p>
                    <p className="mt-1 text-sm text-muted">{requiredMoonshillRule}</p>
                  </div>
                  <Field label="Rules (one per line)">
                    <textarea
                      value={rules}
                      onChange={(e) => setRules(e.target.value)}
                      rows={4}
                      className="w-full resize-none rounded-xl border border-border bg-surface p-3.5 text-sm outline-none focus:border-gold/50"
                    />
                  </Field>
                  <Field label="Required X tags (optional)">
                    <Input value={tags} onChange={setTags} placeholder="@project #hashtag" />
                  </Field>
                </>
              )}
            </motion.div>
          </AnimatePresence>

          {/* nav */}
          <div className="mt-8 flex items-center justify-between">
            <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
              <ChevronLeft size={16} /> Back
            </Button>
            {step < steps.length - 1 ? (
              <Button magnetic onClick={() => setStep((s) => s + 1)} disabled={!canNext}>
                Continue <ChevronRight size={16} />
              </Button>
            ) : (
              <Button magnetic onClick={publish} disabled={publishing}>
                {publishing ? "Creating..." : "Launch campaign 🚀"}
              </Button>
            )}
          </div>
          {error && <p className="mt-3 rounded-xl border border-red/25 bg-red/10 px-3 py-2 text-[13px] text-red">{error}</p>}
        </div>

        {/* live preview */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <p className="mb-3 flex items-center gap-2 text-[12px] font-medium uppercase tracking-wider text-faint">
            <ImageIcon size={13} /> Live preview
          </p>
          <div className="ring-grad overflow-hidden rounded-[22px] bg-surface">
            <div className="relative aspect-[16/11] overflow-hidden">
              <img src={coverSrc} alt="" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/30 to-transparent" />
              <div className="absolute inset-x-3 top-3 flex justify-between">
                <Badge tone="neutral" className="bg-black/45 backdrop-blur border-white/10 text-white">{category}</Badge>
                {creator?.accountType === "project" && <Badge tone="blue" className="bg-black/45 backdrop-blur">{creator.projectVerified ? "Verified project" : "Project"}</Badge>}
              </div>
              <div className="absolute bottom-3 left-3">
                <span className="text-[11px] uppercase tracking-wider text-white/60">Reward pool</span>
                <p className="font-mono text-2xl font-bold text-white">{fmtUsd(pool)}</p>
                <p className="text-[12px] font-medium text-green">{amount} {rewardLabel} · {winners} winners</p>
              </div>
            </div>
            <div className="space-y-3 p-4">
              <h3 className="font-display text-[17px] font-semibold leading-snug">
                {title || "Your campaign title"}
              </h3>
              <div className="flex items-center gap-2">
                <Avatar
                  src={creator?.avatar || `https://api.dicebear.com/9.x/glass/svg?seed=${encodeURIComponent(user?.wallet || "moonshill")}&backgroundType=gradientLinear`}
                  alt={creator?.name || "Connected wallet"}
                  size={22}
                  verified={creator?.accountType === "project" ? !!creator?.projectVerified : !!creator?.xConnected}
                />
                <span className="text-[13px] text-muted">{creator?.name || "Connected wallet"}</span>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-3 text-[12px] text-muted">
                <span className="flex items-center gap-1.5"><Users size={13} /> 0</span>
                <span className="flex items-center gap-1.5"><Clock size={13} /> {days}d</span>
                <span className="rounded-full bg-gold/12 px-3 py-1 font-semibold text-gold-bright">Join</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-[13px] font-medium text-muted">{label}</label>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="h-12 w-full rounded-xl border border-border bg-surface px-3.5 text-sm outline-none placeholder:text-faint focus:border-gold/50"
    />
  );
}

function NumberInput({ value, onChange, suffix }: { value: number; onChange: (v: number) => void; suffix?: string }) {
  return (
    <div className="flex h-12 items-center rounded-xl border border-border bg-surface px-3.5 focus-within:border-gold/50">
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value)))}
        className="h-full flex-1 bg-transparent font-mono text-sm outline-none"
      />
      {suffix && <span className="text-[13px] font-medium text-faint">{suffix}</span>}
    </div>
  );
}

function Chips<T extends string | number>({
  options, value, onChange, render,
}: {
  options: readonly T[]; value: T; onChange: (v: T) => void; render?: (v: T) => string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={String(o)}
          onClick={() => onChange(o)}
          className={cn(
            "rounded-full border px-4 py-2 text-[13px] font-medium transition-colors",
            value === o ? "border-gold/40 bg-gold/12 text-gold-bright" : "border-border bg-surface text-muted hover:text-text",
          )}
        >
          {render ? render(o) : o}
        </button>
      ))}
    </div>
  );
}
