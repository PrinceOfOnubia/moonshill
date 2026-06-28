"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ChallengeDetail } from "@/components/challenge/ChallengeDetail";
import { getCampaign } from "@/lib/api";
import type { Challenge } from "@/lib/types";

export default function ChallengePage() {
  const params = useParams<{ slug: string }>();
  const slug = typeof params?.slug === "string" ? params.slug : "";
  const [campaign, setCampaign] = useState<Challenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) {
      setCampaign(null);
      setLoading(false);
      setError("Campaign not found.");
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    getCampaign(slug)
      .then(({ campaign: nextCampaign }) => {
        if (cancelled) return;
        setCampaign(nextCampaign);
      })
      .catch((err) => {
        if (cancelled) return;
        setCampaign(null);
        setError(err instanceof Error ? err.message : "Campaign not found.");
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-surface/40 p-10 text-center text-muted">
        Loading campaign...
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="rounded-2xl border border-border bg-surface/40 p-10 text-center">
        <h1 className="font-display text-2xl font-bold text-text">Campaign not found</h1>
        <p className="mt-3 text-muted">{error || "This campaign could not be loaded."}</p>
      </div>
    );
  }

  return <ChallengeDetail c={campaign} />;
}
