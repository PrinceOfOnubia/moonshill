"use client";

import { Link } from "next-view-transitions";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Compass, Home, Plus, Trophy, User } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/", label: "Home", icon: Home },
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/create", label: "Create", icon: Plus, primary: true },
  { href: "/leaderboard", label: "Ranks", icon: Trophy },
  { href: "/profile", label: "Profile", icon: User },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 md:hidden">
      <div className="mx-auto mb-3 max-w-md px-4">
        <div className="glass-strong glow-soft flex items-center justify-around rounded-[22px] px-2 py-2">
          {items.map(({ href, label, icon: Icon, primary }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);

            if (primary) {
              return (
                <Link
                  key={href}
                  href={href}
                  aria-label={label}
                  className="relative -mt-7 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-b from-gold-bright to-gold text-black glow-gold"
                >
                  <Icon size={26} strokeWidth={2.5} />
                </Link>
              );
            }

            return (
              <Link
                key={href}
                href={href}
                aria-label={label}
                className="relative flex w-14 flex-col items-center gap-1 py-1.5"
              >
                {active && (
                  <motion.span
                    layoutId="bottomnav-pill"
                    className="absolute inset-0 rounded-2xl bg-surface-2"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                )}
                <Icon
                  size={21}
                  className={cn("relative transition-colors", active ? "text-gold-bright" : "text-faint")}
                  strokeWidth={active ? 2.4 : 2}
                />
                <span className={cn("relative text-[10px] font-medium", active ? "text-text" : "text-faint")}>
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
