import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { Button } from "@/components/ui/Button";

export function CtaBand() {
  return (
    <Reveal className="mt-16">
      <div className="relative overflow-hidden rounded-[28px] border border-gold/20 bg-gradient-to-br from-bg-2 to-surface p-8 sm:p-12">
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-gold/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 h-64 w-64 rounded-full bg-green/10 blur-3xl" />
        <div className="relative flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div>
            <h2 className="font-display text-3xl font-bold leading-tight text-balance sm:text-4xl">
              Got a community?{" "}
              <span className="text-gold-grad">Fund a challenge.</span>
            </h2>
            <p className="mt-3 max-w-lg text-[15px] text-muted">
              Launch a contest in minutes, set the reward pool, and let the timeline
              do the work. Verified projects get the blue badge.
            </p>
          </div>
          <Link href="/create" className="shrink-0">
            <Button size="lg" magnetic>
              Launch a challenge <ArrowUpRight size={18} />
            </Button>
          </Link>
        </div>
      </div>
    </Reveal>
  );
}
