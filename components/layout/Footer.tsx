import Link from "next/link";
import { Logo } from "./Logo";

const cols = [
  { title: "Platform", links: [["Explore", "/explore"], ["Create", "/create"], ["Leaderboard", "/leaderboard"]] },
  { title: "Get started", links: [["Docs", "/docs"], ["How it Works", "/docs#how-it-works"], ["BNB Chain", "/project/BNBCHAIN"]] },
  { title: "Resources", links: [["Token", "/token"], ["Privacy", "/privacy"], ["Terms", "/terms"]] },
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
          <p className="mt-4 text-[12px] text-faint">Powered by BNB Chain</p>
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
        <div className="mx-auto flex max-w-[1240px] flex-col items-center justify-between gap-2 px-4 py-5 pb-28 text-[12px] text-faint sm:flex-row sm:px-6 md:pb-5">
          <span>© {new Date().getFullYear()} Moonshill. Grow. Engage. Earn.</span>
          <span className="flex gap-4">
            <Link href="/docs" className="hover:text-text">Docs</Link>
            <Link href="/token" className="hover:text-text">Token</Link>
            <Link href="/privacy" className="hover:text-text">Privacy</Link>
            <Link href="/terms" className="hover:text-text">Terms</Link>
            <a href="https://x.com/moonshillfun" target="_blank" rel="noreferrer" className="hover:text-text">𝕏</a>
          </span>
        </div>
      </div>
    </footer>
  );
}
