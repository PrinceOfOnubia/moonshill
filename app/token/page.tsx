import Link from "next/link";
import { ArrowLeft, Coins, Flame, Lock, Users } from "lucide-react";
import { ContractAddress } from "@/components/landing/ContractAddress";

export const metadata = {
  title: "Token — Memebook",
  description: "$MEME token utility, allocation, and contract address.",
};

const allocation = [
  { label: "Community & rewards", value: "50%" },
  { label: "Liquidity", value: "20%" },
  { label: "Treasury", value: "15%" },
  { label: "Team (vested)", value: "10%" },
  { label: "Marketing", value: "5%" },
];

const utility = [
  { icon: Coins, title: "Reward pools", body: "Projects fund challenges in $MEME and other tokens; winners are paid on-chain." },
  { icon: Users, title: "Creator boosts", body: "Hold $MEME to boost submission reach and unlock featured placement." },
  { icon: Lock, title: "Staking", body: "Stake to earn a share of platform fees and governance weight." },
  { icon: Flame, title: "Deflationary", body: "A portion of platform fees is used to buy back and burn supply." },
];

export default function TokenPage() {
  return (
    <div className="mx-auto max-w-[900px]">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-[13px] text-faint transition-colors hover:text-text"
      >
        <ArrowLeft size={15} /> Back
      </Link>

      <header className="mt-5 border-b border-border pb-8">
        <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-gold-bright">
          The Memebook token
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">
          $MEME powers the arena
        </h1>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-muted">
          $MEME is the utility token behind Memebook — used to fund challenges, reward
          creators, and align the community around the on-chain creator economy.
        </p>
        <ContractAddress className="mt-6 max-w-md" />
      </header>

      <section className="mt-10">
        <h2 className="font-display text-xl font-semibold">Utility</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {utility.map((u) => (
            <div
              key={u.title}
              className="rounded-2xl border border-border bg-surface/50 p-5 transition-colors hover:border-border-strong"
            >
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-gold/12 text-gold-bright">
                <u.icon size={20} />
              </div>
              <h3 className="mt-3 font-display text-[17px] font-semibold">{u.title}</h3>
              <p className="mt-1.5 text-[14px] leading-relaxed text-muted">{u.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-xl font-semibold">Allocation</h2>
        <div className="mt-4 overflow-hidden rounded-2xl border border-border">
          {allocation.map((a, i) => (
            <div
              key={a.label}
              className={
                "flex items-center justify-between px-5 py-4 " +
                (i % 2 ? "bg-bg-2/40" : "bg-surface/40")
              }
            >
              <span className="text-[14.5px] text-muted">{a.label}</span>
              <span className="font-mono text-[15px] font-bold text-text">{a.value}</span>
            </div>
          ))}
        </div>
        <p className="mt-4 text-[12px] text-faint">
          Token details are indicative and subject to change before launch. Nothing here is
          financial advice.
        </p>
      </section>
    </div>
  );
}
