"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PublicUserProfileClient } from "@/components/profile/PublicUserProfileClient";
import { ProjectProfileClient } from "@/components/profile/ProjectProfileClient";
import { getProject, getPublicUser } from "@/lib/api";
import type { Challenge, ProjectProfile, PublicUserProfile } from "@/lib/types";

export default function PublicUserPage() {
  const params = useParams<{ handle: string }>();
  const handle = typeof params?.handle === "string" ? params.handle : "";
  const [profile, setProfile] = useState<PublicUserProfile | null>(null);
  const [project, setProject] = useState<ProjectProfile | null>(null);
  const [campaigns, setCampaigns] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!handle) {
      setLoading(false);
      setError("User not found.");
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setProject(null);
    setCampaigns([]);
    getPublicUser(handle)
      .then(({ user }) => {
        if (!cancelled) setProfile(user);
      })
      .catch(async (err) => {
        if (cancelled) return;
        try {
          const data = await getProject(handle);
          if (cancelled) return;
          setProfile(null);
          setProject(data.project);
          setCampaigns(data.campaigns);
          setError(null);
        } catch {
          setProfile(null);
          setProject(null);
          setCampaigns([]);
          setError(err instanceof Error ? err.message : "User not found.");
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
    return <div className="rounded-2xl border border-border bg-surface/40 p-10 text-center text-muted">Loading profile...</div>;
  }

  if (!profile) {
    if (project) {
      return <ProjectProfileClient p={project} campaigns={campaigns} />;
    }
    return (
      <div className="rounded-2xl border border-border bg-surface/40 p-10 text-center">
        <h1 className="font-display text-2xl font-bold text-text">User not found</h1>
        <p className="mt-3 text-muted">{error || "This user profile could not be loaded."}</p>
      </div>
    );
  }

  return <PublicUserProfileClient profile={profile} />;
}
