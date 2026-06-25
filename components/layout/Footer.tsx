import Link from "next/link";
import { Logo } from "./Logo";

const cols = [
  { title: "Platform", links: [["Explore", "/explore"], ["Create", "/create"], ["Leaderboard", "/leaderboard"], ["Profile", "/profile"]] },
  { title: "Get started", links: [["Get verified", "/verify"], ["Project verification", "/verify"], ["Admin", "/admin"]] },
  { title: "Resources", links: [["How it works", "/"], ["Featured", "/explore"], ["BNB Chain", "/project/BNBCHAIN"]] },
];

export function Footer() {
  return (
    <footer className="relative z-10 mt-8 border-t border-border bg-bg-2/60">
      <div className="mx-auto grid max-w-[1240px] gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-[13px] leading-relaxed text-faint">
            The community-first crypto arena. Create on X, submit your link, compete for funded rewards.
          </p>
          <p className="mt-4 text-[12px] text-faint">Dark mode · Mobile-first · Powered by BNB Chain</p>
        </div>
        {cols.map((c) => (
          <div key={c.title}>
            <p className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-muted">{c.title}</p>
            <ul className="space-y-2.5">
              {c.links.map(([label, href]) => (
                <li key={label}>
                  <Link href={href} className="text-[14px] text-faint transition-colors hover:text-text">{label}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-[1240px] flex-col items-center justify-between gap-2 px-4 py-5 text-[12px] text-faint sm:flex-row sm:px-6">
          <span>© {new Date().getFullYear()} Memebook. Every card is a challenge to join.</span>
          <span className="flex gap-4">
            <Link href="/" className="hover:text-text">Terms</Link>
            <Link href="/" className="hover:text-text">Privacy</Link>
            <Link href="/" className="hover:text-text">𝕏</Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
