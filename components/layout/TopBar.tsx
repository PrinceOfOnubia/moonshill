"use client";

import { Link } from "next-view-transitions";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Plus, Search, Wallet } from "lucide-react";
import { Logo } from "./Logo";
import { Avatar } from "@/components/ui/Avatar";
import { me } from "@/lib/mock";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/", label: "Home" },
  { href: "/explore", label: "Explore" },
  { href: "/leaderboard", label: "Leaderboard" },
];

export function TopBar() {
  const pathname = usePathname();
  const router = useRouter();

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

        <button
          onClick={() => router.push("/explore")}
          className="ml-auto hidden h-10 w-64 items-center gap-2.5 rounded-full border border-border bg-surface/70 px-4 text-sm text-faint transition-colors hover:border-border-strong lg:flex"
        >
          <Search size={16} />
          <span>Search challenges…</span>
          <kbd className="ml-auto rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-muted">/</kbd>
        </button>

        <div className="ml-auto flex items-center gap-2 lg:ml-2">
          <button
            aria-label="Search"
            onClick={() => router.push("/explore")}
            className="grid h-10 w-10 place-items-center rounded-full border border-border text-muted transition-colors hover:text-text lg:hidden"
          >
            <Search size={18} />
          </button>
          <button
            aria-label="Notifications"
            className="relative grid h-10 w-10 place-items-center rounded-full border border-border text-muted transition-colors hover:text-text"
          >
            <Bell size={18} />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-gold ring-2 ring-bg" />
          </button>
          <Link
            href="/create"
            className="hidden h-10 items-center gap-1.5 rounded-full bg-gradient-to-b from-gold-bright to-gold px-4 text-sm font-semibold text-black transition-shadow hover:shadow-[0_8px_30px_-6px_rgba(240,185,11,0.6)] md:flex"
          >
            <Plus size={16} strokeWidth={2.6} />
            Create
          </Link>
          <button className="hidden h-10 items-center gap-2 rounded-full border border-border-strong bg-surface px-3 text-sm font-medium transition-colors hover:border-gold/50 sm:flex">
            <Wallet size={16} className="text-gold-bright" />
            <span className="font-mono">2.41 BNB</span>
          </button>
          <Link href="/profile" aria-label="Profile">
            <Avatar src={me.avatar} alt={me.name} size={38} verified={me.xConnected} ring />
          </Link>
        </div>
      </div>
    </header>
  );
}
