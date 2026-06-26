"use client";

import { Link } from "next-view-transitions";
import { motion } from "framer-motion";
import { Clock, Flame, Users } from "lucide-react";
import type { Challenge } from "@/lib/types";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { useTimeLeft } from "@/components/ui/useTimeLeft";
import { compact, fmtUsd } from "@/lib/utils";

export function ChallengeCard({ c, index = 0 }: { c: Challenge; index?: number }) {
  const t = useTimeLeft(c.endsAt);

  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.55, delay: (index % 6) * 0.06, ease: [0.21, 0.47, 0.32, 0.98] }}
    >
      <Link
        href={`/challenge/${c.slug}`}
        className="group relative block overflow-hidden rounded-[22px] border border-border bg-surface transition-colors duration-200 hover:border-border-strong hover:bg-surface-2 hover:shadow-[0_8px_30px_-12px_rgba(0,0,0,0.6)]"
      >
        {/* cover */}
        <div className="relative aspect-[16/11] overflow-hidden">
          <img
            src={c.cover}
            alt={c.title}
            style={{ viewTransitionName: `cover-${c.slug}` }}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/30 to-transparent" />

          {/* top row chips */}
          <div className="absolute inset-x-3 top-3 flex items-center justify-between">
            <Badge tone="neutral" className="bg-black/45 backdrop-blur border-white/10 text-white">
              {c.category}
            </Badge>
            {c.trending > 85 ? (
              <Badge tone="gold" className="bg-black/45 backdrop-blur border-gold/30">
                <Flame size={11} /> Hot
              </Badge>
            ) : c.official ? (
              <Badge tone="blue" className="bg-black/45 backdrop-blur">
                Official
              </Badge>
            ) : null}
          </div>

          {/* reward pool, floating */}
          <div className="absolute bottom-3 left-3 flex flex-col">
            <span className="text-[11px] font-medium uppercase tracking-wider text-white/60">Reward pool</span>
            <span className="font-mono text-2xl font-bold leading-none text-white drop-shadow">
              {fmtUsd(c.rewardPool)}
            </span>
            <span className="mt-0.5 text-[12px] font-medium text-green">
              {compact(c.rewardAmount)} {c.rewardToken} · {c.winners} winners
            </span>
          </div>
        </div>

        {/* body */}
        <div className="space-y-3 p-4">
          <h3 className="font-display text-[17px] font-semibold leading-snug text-text line-clamp-2">
            {c.title}
          </h3>

          <div className="flex items-center gap-2">
            <Avatar src={c.creator.avatar} alt={c.creator.name} size={22} verified={c.creator.verified} />
            <span className="text-[13px] text-muted truncate">{c.creator.name}</span>
          </div>

          <div className="flex items-center justify-between border-t border-border pt-3 text-[12px]">
            <span className="flex items-center gap-1.5 text-muted">
              <Users size={13} /> {compact(c.participants)}
            </span>
            <span
              className={`flex items-center gap-1.5 font-medium ${t.urgent ? "text-gold-bright" : "text-muted"}`}
            >
              <Clock size={13} /> {t.label}
            </span>
            <span className="rounded-full bg-gold/12 px-3 py-1 text-[12px] font-semibold text-gold-bright transition-colors group-hover:bg-gold group-hover:text-black">
              Join
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
