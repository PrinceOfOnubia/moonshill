import { notFound } from "next/navigation";
import { ChallengeDetail } from "@/components/challenge/ChallengeDetail";
import type { Challenge } from "@/lib/types";

async function getApiChallenge(slug: string) {
  const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
  try {
    const res = await fetch(`${base.replace(/\/$/, "")}/api/campaigns/${encodeURIComponent(slug)}`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { campaign?: Challenge };
    return body.campaign ?? null;
  } catch {
    return null;
  }
}

export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = await getApiChallenge(slug);
  return { title: c ? `${c.title} — Moonshill` : "Campaign — Moonshill" };
}

export default async function ChallengePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = await getApiChallenge(slug);
  if (!c) notFound();
  return <ChallengeDetail c={c} />;
}
