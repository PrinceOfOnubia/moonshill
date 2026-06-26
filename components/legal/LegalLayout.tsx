import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export interface DocSection {
  id: string;
  heading: string;
  /** Paragraphs and/or bullet lists. */
  body: Array<string | { list: string[] }>;
}

export function LegalLayout({
  eyebrow,
  title,
  intro,
  updated,
  sections,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  updated: string;
  sections: DocSection[];
}) {
  return (
    <div className="mx-auto max-w-[1000px]">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-[13px] text-faint transition-colors hover:text-text"
      >
        <ArrowLeft size={15} />
        Back home
      </Link>

      <header className="mt-5 border-b border-border pb-8">
        <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-gold-bright">
          {eyebrow}
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">
          {title}
        </h1>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-muted">{intro}</p>
        <p className="mt-4 text-[12px] text-faint">Last updated · {updated}</p>
      </header>

      <div className="mt-8 grid gap-10 md:grid-cols-[220px_1fr]">
        {/* TOC */}
        <nav className="hidden md:block">
          <div className="sticky top-24">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-faint">
              On this page
            </p>
            <ul className="space-y-1.5 border-l border-border">
              {sections.map((s, i) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className="-ml-px block border-l border-transparent py-1 pl-3 text-[13px] text-faint transition-colors hover:border-gold hover:text-text"
                  >
                    {i + 1}. {s.heading}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        {/* Content */}
        <article className="min-w-0 space-y-10">
          {sections.map((s, i) => (
            <section key={s.id} id={s.id} className="scroll-mt-24">
              <h2 className="font-display text-xl font-semibold tracking-tight">
                <span className="mr-2 text-gold-bright">{String(i + 1).padStart(2, "0")}</span>
                {s.heading}
              </h2>
              <div className="mt-3 space-y-3">
                {s.body.map((block, j) =>
                  typeof block === "string" ? (
                    <p key={j} className="text-[14.5px] leading-relaxed text-muted">
                      {block}
                    </p>
                  ) : (
                    <ul key={j} className="space-y-2">
                      {block.list.map((li, k) => (
                        <li
                          key={k}
                          className="flex gap-2.5 text-[14.5px] leading-relaxed text-muted"
                        >
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                          <span>{li}</span>
                        </li>
                      ))}
                    </ul>
                  ),
                )}
              </div>
            </section>
          ))}

          <div className="rounded-2xl border border-border bg-surface/50 p-5">
            <p className="text-[13px] text-faint">
              Questions? Reach the team on{" "}
              <a
                href="https://x.com"
                target="_blank"
                rel="noreferrer"
                className="text-gold-bright hover:underline"
              >
                𝕏
              </a>{" "}
              or email{" "}
              <span className="text-text">hello@memebook.xyz</span>.
            </p>
          </div>
        </article>
      </div>
    </div>
  );
}
