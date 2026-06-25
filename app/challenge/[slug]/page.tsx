import { notFound } from "next/navigation";
import { ChallengeDetail } from "@/components/challenge/ChallengeDetail";
import { challenges, getChallenge } from "@/lib/mock";

export function generateStaticParams() {
  return challenges.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = getChallenge(slug);
  return { title: c ? `${c.title} — Memebook` : "Challenge — Memebook" };
}

export default async function ChallengePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = getChallenge(slug);
  if (!c) notFound();
  return <ChallengeDetail c={c} />;
}
