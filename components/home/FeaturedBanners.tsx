"use client";

import { useEffect, useRef, useState } from "react";
import { Link } from "next-view-transitions";
import { ChevronLeft, ChevronRight, Clock, Trophy } from "lucide-react";
import type { Challenge } from "@/lib/types";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { useTimeLeft } from "@/components/ui/useTimeLeft";
import { compact, displayRewardToken, fmtUsd } from "@/lib/utils";
import { getCampaigns } from "@/lib/api";

export function FeaturedBanners() {
  const [active, setActive] = useState(0);
  const [featured, setFeatured] = useState<Challenge[]>([]);
  const trackRef = useRef<HTMLDivElement>(null);
  const desktopTrackRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ down: boolean; x: number; scrollLeft: number }>({ down: false, x: 0, scrollLeft: 0 });

  useEffect(() => {
    let cancelled = false;
    getCampaigns({ limit: 2 })
      .then(({ campaigns }) => {
        if (!cancelled) setFeatured(campaigns.slice(0, 2));
      })
      .catch(() => {
        if (!cancelled) setFeatured([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function onScroll() {
    const el = trackRef.current;
    if (!el) return;
    setActive(Math.round(el.scrollLeft / el.clientWidth));
  }

  function scrollDesktop(direction: -1 | 1) {
    const el = desktopTrackRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * Math.max(360, el.clientWidth * 0.72), behavior: "smooth" });
  }

  function startDesktopDrag(e: React.MouseEvent<HTMLDivElement>) {
    const el = desktopTrackRef.current;
    if (!el) return;
    dragRef.current = { down: true, x: e.pageX, scrollLeft: el.scrollLeft };
  }

  function moveDesktopDrag(e: React.MouseEvent<HTMLDivElement>) {
    const el = desktopTrackRef.current;
    if (!el || !dragRef.current.down) return;
    e.preventDefault();
    el.scrollLeft = dragRef.current.scrollLeft - (e.pageX - dragRef.current.x);
  }

  function stopDesktopDrag() {
    dragRef.current.down = false;
  }

  return (
    <section>
      <div className="mb-4 flex items-end justify-between">
        <h2 className="font-display text-xl font-bold sm:text-2xl">Featured campaigns</h2>
        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-1 md:flex">
            <button
              type="button"
              aria-label="Previous featured campaign"
              onClick={() => scrollDesktop(-1)}
              className="grid h-9 w-9 place-items-center rounded-full border border-border text-muted transition-colors hover:border-border-strong hover:text-text"
            >
              <ChevronLeft size={17} />
            </button>
            <button
              type="button"
              aria-label="Next featured campaign"
              onClick={() => scrollDesktop(1)}
              className="grid h-9 w-9 place-items-center rounded-full border border-border text-muted transition-colors hover:border-border-strong hover:text-text"
            >
              <ChevronRight size={17} />
            </button>
          </div>
          <Link href="/explore" className="text-[13px] font-medium text-muted transition-colors hover:text-text">
            View all
          </Link>
        </div>
      </div>

      {/* Desktop carousel */}
      <div
        ref={desktopTrackRef}
        onMouseDown={startDesktopDrag}
        onMouseMove={moveDesktopDrag}
        onMouseUp={stopDesktopDrag}
        onMouseLeave={stopDesktopDrag}
        className="no-scrollbar hidden cursor-grab snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth active:cursor-grabbing md:flex"
      >
        {featured.length ? (
          featured.map((c) => (
            <div key={c.id} className="w-[calc(50%_-_10px)] min-w-[calc(50%_-_10px)] snap-start">
              <FeaturedBanner c={c} />
            </div>
          ))
        ) : (
          <div className="w-full rounded-2xl border border-border bg-surface/40 p-8 text-center text-muted">
            No featured campaigns yet.
          </div>
        )}
      </div>

      {/* Mobile: swipeable slider */}
      <div className="md:hidden">
        <div
          ref={trackRef}
          onScroll={onScroll}
          className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-1"
        >
          {featured.length ? (
            featured.map((c) => (
              <div key={c.id} className="w-full shrink-0 snap-center">
                <FeaturedBanner c={c} />
              </div>
            ))
          ) : (
            <div className="w-full shrink-0 rounded-2xl border border-border bg-surface/40 p-8 text-center text-muted">
              No featured campaigns yet.
            </div>
          )}
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
  const rewardTicker = displayRewardToken(c.rewardToken);

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
              {compact(c.rewardAmount)} {rewardTicker} · {c.winners} winners
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
