import Link from "next/link";
import { Logo } from "@/components/layout/Logo";
import { SOCIALS, TelegramIcon, XIcon } from "./social";

const quickLinks = [
  ["Docs", "/docs"],
  ["Token", "/token"],
  ["Privacy", "/privacy"],
  ["Terms", "/terms"],
];

export function LandingFooter() {
  return (
    <footer className="relative z-10 mt-12 border-t border-border bg-bg-2/60">
      <div className="mx-auto grid max-w-[1240px] gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.6fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-[14px] leading-relaxed text-faint">
            The leading platform for crypto communities to compete, earn and grow together.
          </p>
        </div>

        <div>
          <p className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-muted">
            Quick links
          </p>
          <ul className="space-y-2.5">
            {quickLinks.map(([label, href]) => (
              <li key={label}>
                <Link href={href} className="text-[14px] text-faint transition-colors hover:text-text">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-muted">Socials</p>
          <div className="flex items-center gap-3">
            <Social href={SOCIALS.x} label="X">
              <XIcon size={16} />
            </Social>
            <Social href={SOCIALS.telegram} label="Telegram">
              <TelegramIcon size={18} />
            </Social>
          </div>
        </div>
      </div>

      <div className="border-t border-border">
        <div className="mx-auto max-w-[1240px] px-4 py-5 text-[12px] text-faint sm:px-6">
          © {new Date().getFullYear()} Moonshill. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

function Social({
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
      className="grid h-11 w-11 place-items-center rounded-xl border border-border bg-surface text-muted transition-colors hover:border-border-strong hover:text-text"
    >
      {children}
    </a>
  );
}
