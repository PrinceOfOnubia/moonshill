"use client";

import { Link } from "next-view-transitions";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { BadgeCheck, LogOut, Plus, Search, User, Wallet } from "lucide-react";
import { Logo } from "./Logo";
import { NotificationsMenu } from "./NotificationsMenu";
import { Avatar } from "@/components/ui/Avatar";
import { useAuth } from "@/components/providers/AuthProvider";
import { getCampaigns } from "@/lib/api";
import type { Challenge } from "@/lib/types";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/", label: "Home" },
  { href: "/explore", label: "Explore" },
  { href: "/leaderboard", label: "Leaderboard" },
];

export function TopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { disconnect, user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [campaigns, setCampaigns] = useState<Challenge[]>([]);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLFormElement>(null);
  const accountName = user?.name || "Moonshill user";
  const accountMeta = user?.email || (user?.xHandle ? `@${user.xHandle}` : "@moonshill");
  const accountAvatar = user?.avatar || `https://api.dicebear.com/9.x/glass/svg?seed=${encodeURIComponent(user?.handle || user?.email || "moonshill")}&backgroundType=gradientLinear`;
  const accountVerified = !!user?.xConnected;
  const isCreatorAccount = user?.accountType === "user";
  const pointsBalance = "0 PTS";
  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];
    return campaigns
      .filter((campaign) =>
        campaign.title.toLowerCase().includes(needle) ||
        campaign.creator.name.toLowerCase().includes(needle) ||
        campaign.category.toLowerCase().includes(needle),
      )
      .slice(0, 5);
  }, [campaigns, query]);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  useEffect(() => {
    let cancelled = false;
    getCampaigns({ limit: 50 })
      .then(({ campaigns: next }) => {
        if (!cancelled) setCampaigns(next);
      })
      .catch(() => {
        if (!cancelled) setCampaigns([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!searchOpen) return;
    const onClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [searchOpen]);

  function submitSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const target = matches[0];
    if (!target) return;
    setSearchOpen(false);
    setQuery("");
    router.push(`/challenge/${target.slug}`);
  }

  return (
    <header className="sticky top-0 z-50 glass-strong border-b border-border">
      <div className="mx-auto flex h-16 max-w-[1240px] items-center gap-4 px-4 sm:px-6">
        <Logo />

        <nav className="ml-4 hidden items-center gap-1 md:flex">
          {nav.map((n) => {
            const active = n.href === "/" ? pathname === "/" : pathname.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  "relative rounded-full px-4 py-2 text-sm font-medium transition-colors",
                  active ? "text-text" : "text-muted hover:text-text",
                )}
              >
                {active && <span className="absolute inset-0 rounded-full bg-surface-2" />}
                <span className="relative">{n.label}</span>
              </Link>
            );
          })}
        </nav>

        <form
          ref={searchRef}
          onSubmit={submitSearch}
          className="relative ml-auto hidden lg:block"
        >
          <div className="flex h-10 w-64 items-center gap-2.5 rounded-full border border-border bg-surface/70 px-4 text-sm text-faint transition-colors focus-within:border-gold/50 hover:border-border-strong">
          <Search size={16} />
            <input
              value={query}
              onFocus={() => setSearchOpen(true)}
              onChange={(e) => {
                setQuery(e.target.value);
                setSearchOpen(true);
              }}
              placeholder="Search campaigns..."
              className="h-full flex-1 bg-transparent text-sm text-text outline-none placeholder:text-faint"
            />
            <kbd className="ml-auto rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-muted">/</kbd>
          </div>
          {searchOpen && query.trim() && (
            <div className="absolute right-0 top-12 z-[95] w-[360px] overflow-hidden rounded-2xl border border-border-strong glass-strong">
              {matches.length ? (
                <div className="p-1.5">
                  {matches.map((campaign) => (
                    <Link
                      key={campaign.id}
                      href={`/challenge/${campaign.slug}`}
                      onClick={() => {
                        setSearchOpen(false);
                        setQuery("");
                      }}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-surface-2"
                    >
                      <img src={campaign.cover} alt="" className="h-10 w-10 rounded-lg object-cover" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-text">{campaign.title}</span>
                        <span className="block truncate text-[12px] text-faint">{campaign.category} · {campaign.creator.name}</span>
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="px-4 py-5 text-center text-sm text-muted">No campaigns found.</p>
              )}
            </div>
          )}
        </form>

        <div className="ml-auto flex items-center gap-2 lg:ml-2">
          <button
            aria-label="Search"
            onClick={() => router.push("/explore")}
            className="grid h-10 w-10 place-items-center rounded-full border border-border text-muted transition-colors hover:text-text lg:hidden"
          >
            <Search size={18} />
          </button>
          <NotificationsMenu />
          {(user?.accountType === "project" || user?.isAdmin) && (
            <Link
              href="/create"
              className="hidden h-10 items-center gap-1.5 rounded-full bg-gradient-to-b from-gold-bright to-gold px-4 text-sm font-semibold text-black transition-shadow hover:shadow-[0_8px_30px_-6px_rgba(240,185,11,0.6)] md:flex"
            >
              <Plus size={16} strokeWidth={2.6} />
              Create
            </Link>
          )}
          {isCreatorAccount && (
            <button className="hidden h-10 items-center gap-2 rounded-full border border-border-strong bg-surface px-3 text-sm font-medium transition-colors hover:border-gold/50 sm:flex">
              <Wallet size={16} className="text-gold-bright" />
              <span className="font-mono">{pointsBalance}</span>
            </button>
          )}

          <div ref={menuRef} className="relative">
            <button
              aria-label="Account"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
              className="block rounded-full transition-opacity hover:opacity-90"
            >
              <Avatar src={accountAvatar} alt={accountName} size={38} verified={accountVerified} ring />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-12 z-[95] w-60 overflow-hidden rounded-2xl border border-border-strong glass-strong">
                <div className="border-b border-border px-4 py-3">
                  <p className="text-sm font-semibold text-text">{accountName}</p>
                  <p className="mt-0.5 text-[12px] text-faint">
                    {accountMeta}
                  </p>
                </div>
                <div className="p-1.5">
                  {isCreatorAccount && (
                    <div className="mb-1.5 rounded-xl border border-border bg-surface/70 px-3 py-2.5">
                      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-faint">Points</p>
                      <p className="mt-1 font-mono text-sm text-text">0 POINTS</p>
                    </div>
                  )}
                  <Link
                    href="/profile"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[14px] text-muted transition-colors hover:bg-surface-2 hover:text-text"
                  >
                    <User size={16} /> Profile
                  </Link>
                  <Link
                    href="/verify"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[14px] text-muted transition-colors hover:bg-surface-2 hover:text-text"
                  >
                    <BadgeCheck size={16} /> Get Verified
                  </Link>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      disconnect();
                      router.push("/");
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-[14px] text-rose-400 transition-colors hover:bg-rose-500/10"
                  >
                    <LogOut size={16} /> Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
