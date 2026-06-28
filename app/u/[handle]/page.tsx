import { notFound } from "next/navigation";
import { PublicUserProfileClient } from "@/components/profile/PublicUserProfileClient";
import type { PublicUserProfile } from "@/lib/types";

async function getUser(handle: string) {
  const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
  try {
    const res = await fetch(`${base.replace(/\/$/, "")}/api/users/${encodeURIComponent(handle)}`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) return null;
    return (await res.json()) as { user: PublicUserProfile };
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const data = await getUser(handle);
  return { title: data?.user ? `${data.user.name} — Moonshill` : "User — Moonshill" };
}

export default async function PublicUserPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const data = await getUser(handle);
  if (!data) notFound();
  return <PublicUserProfileClient profile={data.user} />;
}
