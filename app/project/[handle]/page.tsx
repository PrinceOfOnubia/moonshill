import { notFound } from "next/navigation";
import { ProjectProfileClient } from "@/components/profile/ProjectProfileClient";
import type { Challenge, ProjectProfile } from "@/lib/types";

async function getProject(handle: string) {
  const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
  try {
    const res = await fetch(`${base.replace(/\/$/, "")}/api/projects/${encodeURIComponent(handle)}`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) return null;
    return (await res.json()) as { project: ProjectProfile; campaigns: Challenge[] };
  } catch {
    return null;
  }
}

export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const data = await getProject(handle);
  return { title: data?.project ? `${data.project.name} — Moonshill` : "Project — Moonshill" };
}

export default async function ProjectPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const data = await getProject(handle);
  if (!data) notFound();
  return <ProjectProfileClient p={data.project} campaigns={data.campaigns} />;
}
