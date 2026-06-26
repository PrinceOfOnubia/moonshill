"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/layout/Logo";
import { useAuth } from "@/components/providers/AuthProvider";
import { SOCIALS, TelegramIcon, XIcon } from "./social";

const navLinks = [
  { label: "Docs", href: "/docs" },
  { label: "Token", href: "/token" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
];

export function LandingHeader() {
  const { openConnect } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-50 glass-strong border-b border-border">
      <div className="mx-auto flex h-16 max-w-[1240px] items-center gap-4 px-4 sm:px-6">
        <Logo />

        {/* Desktop nav */}
        <nav className="ml-6 hidden items-center gap-1 md:flex">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-full px-3.5 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-text"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto hidden items-center gap-2 md:flex">
          <SocialButton href={SOCIALS.x} label="X">
            <XIcon size={16} />
          </SocialButton>
          <SocialButton href={SOCIALS.telegram} label="Telegram">
            <TelegramIcon size={18} />
          </SocialButton>
          <button
            onClick={openConnect}
            className="ml-1 h-10 rounded-full bg-gradient-to-b from-gold-bright to-gold px-5 text-sm font-semibold text-black transition-shadow hover:shadow-[0_8px_30px_-6px_rgba(240,185,11,0.6)]"
          >
            Enter Memebook
          </button>
        </div>

        {/* Mobile hamburger */}
        <button
          aria-label="Menu"
          onClick={() => setOpen(true)}
          className="ml-auto grid h-10 w-10 place-items-center rounded-full border border-border text-muted transition-colors hover:text-text md:hidden"
        >
          <Menu size={20} />
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[60] md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 360, damping: 34 }}
              className="absolute right-0 top-0 flex h-full w-[82%] max-w-xs flex-col glass-strong border-l border-border-strong"
            >
              <div className="flex h-16 items-center justify-between border-b border-border px-5">
                <Logo />
                <button
                  aria-label="Close menu"
                  onClick={() => setOpen(false)}
                  className="grid h-9 w-9 place-items-center rounded-full text-faint transition-colors hover:bg-surface-2 hover:text-text"
                >
                  <X size={20} />
                </button>
              </div>

              <nav className="flex flex-col gap-1 p-4">
                {navLinks.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className="rounded-xl px-4 py-3 text-[15px] font-medium text-muted transition-colors hover:bg-surface-2 hover:text-text"
                  >
                    {l.label}
                  </Link>
                ))}
              </nav>

              <div className="mt-auto space-y-4 border-t border-border p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
                <div className="flex items-center gap-3">
                  <SocialButton href={SOCIALS.x} label="X">
                    <XIcon size={16} />
                  </SocialButton>
                  <SocialButton href={SOCIALS.telegram} label="Telegram">
                    <TelegramIcon size={18} />
                  </SocialButton>
                </div>
                <button
                  onClick={() => {
                    setOpen(false);
                    openConnect();
                  }}
                  className="h-12 w-full rounded-2xl bg-gradient-to-b from-gold-bright to-gold text-[15px] font-semibold text-black"
                >
                  Enter Memebook
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

function SocialButton({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      className="grid h-10 w-10 place-items-center rounded-full border border-border text-muted transition-colors hover:border-border-strong hover:text-text"
    >
      {children}
    </a>
  );
}
