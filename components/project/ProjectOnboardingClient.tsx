"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, BadgeCheck, Building2, Check, Rocket, ShieldCheck } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { startProjectAccount } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export function ProjectOnboardingClient() {
  const { connected, openConnect, refreshUser, user } = useAuth();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const isProject = user?.accountType === "project";
  const projectHandle = user?.handle || "";

  async function continueAsProject() {
    setPending(true);
    setMessage(null);
    try {
      await startProjectAccount();
      await refreshUser();
      setMessage("Project onboarding unlocked.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not start project onboarding.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[28px] border border-gold/20 bg-gradient-to-br from-bg-2 via-surface to-bg p-8 sm:p-10">
        <Badge tone="gold">For projects</Badge>
        <h1 className="mt-4 max-w-3xl font-display text-4xl font-bold leading-tight sm:text-5xl">
          Build with Moonshill
        </h1>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-muted">
          This is the project onboarding path. Verify your project, launch campaigns, and manage your builder profile without mixing it into the regular user flow.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          {!connected ? (
            <Button size="lg" onClick={() => openConnect("/build")}>
              <Building2 size={18} /> Connect project wallet
            </Button>
          ) : !isProject ? (
            <Button size="lg" onClick={continueAsProject} disabled={pending}>
              {pending ? "Starting..." : <><Rocket size={18} /> Continue as project</>}
            </Button>
          ) : (
            <>
              <Link href="/verify">
                <Button size="lg">
                  <ShieldCheck size={18} /> Get verified
                </Button>
              </Link>
              <Link href="/create">
                <Button size="lg" variant="outline">
                  <Rocket size={18} /> Create campaign
                </Button>
              </Link>
              <Link href={`/project/${projectHandle}`}>
                <Button size="lg" variant="ghost">
                  <BadgeCheck size={18} /> Project profile
                </Button>
              </Link>
            </>
          )}
        </div>

        {message && (
          <p className="mt-4 text-sm text-green">{message}</p>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card
          icon={<ShieldCheck size={18} className="text-gold-bright" />}
          title="Project verification"
          body="Access the project verification flow from here once your project wallet is connected."
          done={!!(isProject && user?.projectVerified)}
          href={isProject ? "/verify" : undefined}
        />
        <Card
          icon={<Rocket size={18} className="text-gold-bright" />}
          title="Campaign creation"
          body="Launch verified or community campaigns from the existing create flow."
          done={!!(isProject && (user?.created || 0) > 0)}
          href={isProject ? "/create" : undefined}
        />
        <Card
          icon={<Building2 size={18} className="text-gold-bright" />}
          title="Project dashboard"
          body="View your public project profile and the campaigns linked to your project account."
          done={!!isProject}
          href={isProject && projectHandle ? `/project/${projectHandle}` : undefined}
        />
      </section>
    </div>
  );
}

function Card({
  icon,
  title,
  body,
  done,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  done?: boolean;
  href?: string;
}) {
  const content = (
    <div className="rounded-[22px] border border-border bg-surface/50 p-5 transition-colors hover:border-border-strong">
      <div className="flex items-center justify-between">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-surface-2">
          {icon}
        </span>
        {done ? <Check size={16} className="text-green" /> : <ArrowRight size={16} className="text-faint" />}
      </div>
      <h2 className="mt-4 font-display text-xl font-semibold">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
    </div>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}
