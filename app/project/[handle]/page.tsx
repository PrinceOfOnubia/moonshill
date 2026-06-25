import { notFound } from "next/navigation";
import { ProjectProfileClient } from "@/components/profile/ProjectProfileClient";
import { getProject, projects } from "@/lib/mock";

export function generateStaticParams() {
  return projects.map((p) => ({ handle: p.handle }));
}

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const p = getProject(handle);
  return { title: p ? `${p.name} — Memebook` : "Project — Memebook" };
}

export default async function ProjectPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const p = getProject(handle);
  if (!p) notFound();
  return <ProjectProfileClient p={p} />;
}
