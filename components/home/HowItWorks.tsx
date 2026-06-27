"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { PenLine, Send, Trophy } from "lucide-react";

const steps = [
  { icon: PenLine, title: "Create on X", body: "Post your meme, thread, video or design straight to X — your audience lives there.", n: "01" },
  { icon: Send, title: "Submit the link", body: "Drop your post link into the challenge. We verify it belongs to your connected X account.", n: "02" },
  { icon: Trophy, title: "Win rewards", body: "Get approved, climb the board, and split the funded reward pool with the top creators.", n: "03" },
];

export function HowItWorks() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 80%", "end 60%"] });
  const lineH = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  return (
    <section ref={ref} className="mt-20">
      <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
        {/* sticky heading */}
        <div className="lg:sticky lg:top-28 lg:self-start">
          <p className="text-[12px] font-medium uppercase tracking-[0.2em] text-gold-bright">How it works</p>
          <h2 className="mt-2 font-display text-4xl font-bold leading-[1.05] text-balance sm:text-5xl">
            Three steps to the <span className="text-gold-grad">pool</span>.
          </h2>
          <p className="mt-4 max-w-sm text-muted">
            No new social network to learn. Moonshill plugs straight into X — you keep your audience, we handle the rest.
          </p>
        </div>

        {/* progress track */}
        <div className="relative pl-10">
          <div className="absolute left-[14px] top-2 bottom-2 w-0.5 bg-border">
            <motion.div style={{ height: lineH }} className="w-full bg-gradient-to-b from-gold-bright to-gold" />
          </div>
          <div className="space-y-5">
            {steps.map((s, i) => (
              <motion.div
                key={s.n}
                initial={{ opacity: 0, x: 24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.6, delay: i * 0.05, ease: [0.21, 0.47, 0.32, 0.98] }}
                className="group relative overflow-hidden rounded-[20px] border border-border bg-surface p-6 transition-colors hover:border-border-strong"
              >
                <span className="absolute left-[-26px] top-7 grid h-7 w-7 -translate-x-1/2 place-items-center rounded-full border border-gold/40 bg-bg text-[11px] font-bold text-gold-bright">
                  {i + 1}
                </span>
                <span className="pointer-events-none absolute -right-2 -top-5 font-display text-7xl font-bold text-surface-3/60 transition-colors group-hover:text-gold/10">
                  {s.n}
                </span>
                <div className="relative">
                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-gold/12 text-gold-bright">
                    <s.icon size={20} />
                  </div>
                  <h3 className="mt-4 font-display text-xl font-semibold">{s.title}</h3>
                  <p className="mt-2 max-w-md text-[15px] leading-relaxed text-muted">{s.body}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
