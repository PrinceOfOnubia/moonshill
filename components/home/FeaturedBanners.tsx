"use client";

import { useRef, useState } from "react";
import { Link } from "next-view-transitions";
import { Clock, Trophy } from "lucide-react";
import type { Challenge } from "@/lib/types";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { useTimeLeft } from "@/components/ui/useTimeLeft";
import { challenges } from "@/lib/mock";
import { compact, fmtUsd } from "@/lib/utils";

const featured = challenges.slice(0, 2);

export function FeaturedBanners() {
  const [active, setActive] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);

  function onScroll() {
    const el = trackRef.current;
    if (!el) return;
    setActive(Math.round(el.scrollLeft / el.clientWidth));
  }

  return (
    <section>
      <div className="mb-4 flex items-end justify-between">
        <h2 className="font-display text-xl font-bold sm:text-2xl">Featured challenges</h2>
        <Link href="/explore" className="text-[13px] font-medium text-muted transition-colors hover:text-text">
          View all
        </Link>
      </div>

      {/* Desktop: two large banners side by side */}
      <div className="hidden gap-5 md:grid md:grid-cols-2">
        {featured.map((c) => (
          <FeaturedBanner key={c.id} c={c} />
        ))}
      </div>

      {/* Mobile: swipeable slider */}
      <div className="md:hidden">
        <div
          ref={trackRef}
          onScroll={onScroll}
          className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-1"
        >
          {featured.map((c) => (
            <div key={c.id} className="w-full shrink-0 snap-center">
              <FeaturedBanner c={c} />
            </div>
          ))}
        </div>
        <div className="mt-3 flex justify-center gap-1.5">
          {featured.map((c, i) => (
            <span
              key={c.id}
              className={
                "h-1.5 rounded-full transition-all " +
                (i === active ? "w-5 bg-gold-bright" : "w-1.5 bg-border-strong")
              }
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturedBanner({ c }: { c: Challenge }) {
  const t = useTimeLeft(c.endsAt);

  return (
    <Link
      href={`/challenge/${c.slug}`}
      className="group relative block h-full min-h-[320px] overflow-hidden rounded-[24px] border border-border transition-colors hover:border-border-strong sm:min-h-[360px]"
    >
      <img
        src={c.cover}
        alt={c.title}
        style={{ viewTransitionName: `cover-${c.slug}` }}
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-black/10" />

      <div className="absolute inset-x-5 top-5 flex items-center justify-between">
        <Badge tone="gold" className="bg-black/50 backdrop-blur border-gold/30">
          <Trophy size={11} /> Featured
        </Badge>
        <Badge tone="neutral" className="bg-black/50 backdrop-blur border-white/10 text-white">
          {c.category}
        </Badge>
      </div>

      <div className="absolute inset-x-5 bottom-5">
        <div className="mb-3 flex items-center gap-2">
          <Avatar src={c.creator.avatar} alt={c.creator.name} size={26} verified={c.creator.verified} />
          <span className="text-sm font-medium text-white/90">{c.creator.name}</span>
        </div>
        <h3 className="font-display text-2xl font-bold leading-tight text-white text-balance sm:text-3xl">
          {c.title}
        </h3>

        <div className="mt-4 flex items-end justify-between rounded-2xl bg-black/45 p-4 backdrop-blur">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-white/50">Reward pool</p>
            <p className="font-mono text-2xl font-bold text-white sm:text-3xl">{fmtUsd(c.rewardPool)}</p>
            <p className="text-[12px] font-medium text-green">
              {compact(c.rewardAmount)} {c.rewardToken} · {c.winners} winners
            </p>
          </div>
          <div className="text-right">
            <p className="flex items-center justify-end gap-1 text-[11px] uppercase tracking-wider text-white/50">
              <Clock size={11} /> Ends in
            </p>
            <p className="font-mono text-lg font-bold text-gold-bright sm:text-xl">{t.label}</p>
            <p className="text-[12px] text-white/60">{compact(c.participants)} joined</p>
          </div>
        </div>
      </div>
    </Link>
  );
}
