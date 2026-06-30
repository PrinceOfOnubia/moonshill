"use client";

import { useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { HowItWorks } from "@/components/home/HowItWorks";
import { useAuth } from "@/components/providers/AuthProvider";
import { LandingHero } from "./LandingHero";

export function LandingPage() {
  const { openConnect } = useAuth();
  const [pathway, setPathway] = useState<"creator" | "project">("creator");
  const cta = useMemo(() => pathway === "creator"
    ? {
      title: <>Ready to <span className="text-gold-grad">start shilling</span>?</>,
      body: "Launch App to find live campaigns, submit your best work, and grow into a top Moonshill creator.",
      action: () => openConnect("/home"),
      actionLabel: "Launch App",
    }
    : {
      title: <>Ready to <span className="text-gold-grad">launch growth</span>?</>,
      body: "Jump into the project path to verify your brand, create campaigns, and reward the creators driving attention for you.",
      action: () => openConnect("/build"),
      actionLabel: "Start Campaign",
    }, [openConnect, pathway]);

  return (
    <>
      <LandingHero pathway={pathway} onPathwayChange={setPathway} />
      <HowItWorks pathway={pathway} />

      {/* closing CTA */}
      <section className="mt-20">
        <div className="relative overflow-hidden rounded-[28px] border border-gold/20 bg-gradient-to-br from-bg-2 to-surface p-8 text-center sm:p-14">
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-gold/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 left-1/3 h-64 w-64 rounded-full bg-green/10 blur-3xl" />
          <div className="relative mx-auto max-w-xl">
            <h2 className="font-display text-3xl font-bold leading-tight text-balance sm:text-4xl">
              {cta.title}
            </h2>
            <p className="mx-auto mt-3 max-w-md text-[15px] text-muted">
              {cta.body}
            </p>
            <button
              onClick={cta.action}
              className="group mt-7 inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-gold-bright to-gold px-8 text-[15px] font-semibold text-black transition-shadow hover:shadow-[0_12px_44px_-8px_rgba(240,185,11,0.65)]"
            >
              {cta.actionLabel}
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
