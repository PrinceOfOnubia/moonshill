"use client";

import { useEffect, useRef, useState } from "react";
import { Link } from "next-view-transitions";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  Check,
  CheckCheck,
  Clock,
  Coins,
  Sparkles,
  Trophy,
  X,
  XCircle,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { notifications as seed } from "@/lib/mock";
import type { AppNotification, NotificationKind } from "@/lib/types";
import { cn, timeAgo } from "@/lib/utils";

const kindMeta: Record<NotificationKind, { icon: typeof Bell; tint: string }> = {
  win: { icon: Trophy, tint: "text-gold-bright" },
  reward: { icon: Coins, tint: "text-gold-bright" },
  approved: { icon: Check, tint: "text-emerald-400" },
  rejected: { icon: XCircle, tint: "text-rose-400" },
  review: { icon: Clock, tint: "text-sky-400" },
  ending: { icon: Clock, tint: "text-amber-400" },
  new: { icon: Sparkles, tint: "text-violet-400" },
};

export function NotificationsMenu() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>(seed);
  const wrapRef = useRef<HTMLDivElement>(null);

  const unread = items.filter((n) => n.unread).length;

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const markAll = () => setItems((prev) => prev.map((n) => ({ ...n, unread: false })));
  const markOne = (id: string) =>
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, unread: false } : n)));

  return (
    <div ref={wrapRef} className="relative">
      <button
        aria-label="Notifications"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "relative grid h-10 w-10 place-items-center rounded-full border text-muted transition-colors hover:text-text",
          open ? "border-border-strong bg-surface-2 text-text" : "border-border",
        )}
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-gold px-1 text-[10px] font-bold text-black ring-2 ring-bg">
            {unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Mobile scrim */}
            <motion.div
              className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm sm:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.div
              role="dialog"
              aria-label="Notifications"
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 360, damping: 28 }}
              className={cn(
                "glass-strong glow-soft z-[95] flex flex-col overflow-hidden border border-border-strong",
                // Mobile: bottom sheet
                "fixed inset-x-2 bottom-2 max-h-[80dvh] rounded-[22px]",
                // Desktop: dropdown anchored to the bell
                "sm:absolute sm:inset-x-auto sm:bottom-auto sm:right-0 sm:top-12 sm:w-[380px] sm:max-h-[70vh]",
              )}
            >
              <div className="flex shrink-0 items-center justify-between border-b border-border bg-bg-2/70 px-4 py-3 backdrop-blur">
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-base font-semibold">Notifications</h3>
                  {unread > 0 && (
                    <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[11px] font-semibold text-gold-bright">
                      {unread} new
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {unread > 0 && (
                    <button
                      onClick={markAll}
                      className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-medium text-muted transition-colors hover:bg-surface-2 hover:text-text"
                    >
                      <CheckCheck size={14} />
                      <span>Mark all read</span>
                    </button>
                  )}
                  <button
                    aria-label="Close"
                    onClick={() => setOpen(false)}
                    className="grid h-8 w-8 place-items-center rounded-full text-faint transition-colors hover:bg-surface-2 hover:text-text sm:hidden"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto">
                {items.length === 0 ? (
                  <div className="grid place-items-center gap-2 px-6 py-16 text-center">
                    <Bell size={28} className="text-faint" />
                    <p className="text-sm text-muted">You&apos;re all caught up.</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-border">
                    {items.map((n) => {
                      const meta = kindMeta[n.kind];
                      const Icon = meta.icon;
                      const body = (
                        <div className="flex gap-3">
                          <div className="relative shrink-0">
                            {n.actor ? (
                              <Avatar src={n.actor.avatar} alt={n.actor.name} size={40} />
                            ) : (
                              <span className="grid h-10 w-10 place-items-center rounded-full bg-surface-2">
                                <Icon size={18} className={meta.tint} />
                              </span>
                            )}
                            <span className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-bg ring-2 ring-bg">
                              <Icon size={12} className={meta.tint} />
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start gap-2">
                              <p className="text-[13.5px] font-semibold leading-snug text-text">
                                {n.title}
                              </p>
                              {n.unread && (
                                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gold" />
                              )}
                            </div>
                            <p className="mt-0.5 text-[12.5px] leading-snug text-faint line-clamp-2">
                              {n.body}
                            </p>
                            <p className="mt-1 text-[11px] text-faint">{timeAgo(n.at)}</p>
                          </div>
                        </div>
                      );

                      const cls = cn(
                        "block px-4 py-3 text-left transition-colors hover:bg-surface/60",
                        n.unread && "bg-gold/[0.04]",
                      );

                      return (
                        <li key={n.id}>
                          {n.href ? (
                            <Link
                              href={n.href}
                              className={cls}
                              onClick={() => {
                                markOne(n.id);
                                setOpen(false);
                              }}
                            >
                              {body}
                            </Link>
                          ) : (
                            <button className={cn(cls, "w-full")} onClick={() => markOne(n.id)}>
                              {body}
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <div className="shrink-0 border-t border-border bg-bg-2/70 px-4 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] backdrop-blur">
                <Link
                  href="/profile"
                  onClick={() => setOpen(false)}
                  className="block w-full rounded-full py-1.5 text-center text-[13px] font-medium text-muted transition-colors hover:text-text"
                >
                  View activity in profile
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
