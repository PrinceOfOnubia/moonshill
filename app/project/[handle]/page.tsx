"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ProjectProfileClient } from "@/components/profile/ProjectProfileClient";
import { PublicUserProfileClient } from "@/components/profile/PublicUserProfileClient";
import { getProject, getPublicUser } from "@/lib/api";
import type { Challenge, ProjectProfile, PublicUserProfile } from "@/lib/types";

export default function ProjectPage() {
  const params = useParams<{ handle: string }>();
  const handle = typeof params?.handle === "string" ? params.handle : "";
  const [project, setProject] = useState<ProjectProfile | null>(null);
  const [campaigns, setCampaigns] = useState<Challenge[]>([]);
  const [userProfile, setUserProfile] = useState<PublicUserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!handle) {
      setLoading(false);
      setError("Project not found.");
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setUserProfile(null);
    getProject(handle)
      .then((data) => {
        if (cancelled) return;
        setProject(data.project);
        setCampaigns(data.campaigns);
      })
      .catch(async (err) => {
        if (cancelled) return;
        try {
          const data = await getPublicUser(handle);
          if (cancelled) return;
          setProject(null);
          setCampaigns([]);
          setUserProfile(data.user);
          setError(null);
        } catch {
          setProject(null);
          setCampaigns([]);
          setUserProfile(null);
          setError(err instanceof Error ? err.message : "Project not found.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [handle]);

  if (loading) {
    return <div className="rounded-2xl border border-border bg-surface/40 p-10 text-center text-muted">Loading project...</div>;
  }

  if (!project) {
    if (userProfile) {
      return <PublicUserProfileClient profile={userProfile} />;
    }
    return (
      <div className="rounded-2xl border border-border bg-surface/40 p-10 text-center">
        <h1 className="font-display text-2xl font-bold text-text">Project not found</h1>
        <p className="mt-3 text-muted">{error || "This project profile could not be loaded."}</p>
      </div>
    );
  }

  return <ProjectProfileClient p={project} campaigns={campaigns} />;
}
