import Link from "next/link";
import { ExternalLink } from "lucide-react";
import type { Submission, SubmissionStatus } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { timeAgo } from "@/lib/utils";

const dot: Record<SubmissionStatus, string> = {
  "Pending Review": "bg-gold",
  Approved: "bg-blue",
  Winner: "bg-green",
  Rejected: "bg-red",
};
const tone: Record<SubmissionStatus, "gold" | "blue" | "green" | "red"> = {
  "Pending Review": "gold",
  Approved: "blue",
  Winner: "green",
  Rejected: "red",
};

export function SubmissionRow({ s }: { s: Submission }) {
  return (
    <div className="group flex items-center gap-3.5 rounded-2xl border border-border bg-surface/50 p-3 transition-colors hover:border-border-strong">
      <img src={s.cover} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{s.challengeTitle}</p>
        <div className="mt-1 flex items-center gap-2 text-[12px] text-faint">
          <span>{s.type}</span>
          <span>·</span>
          <span suppressHydrationWarning>{timeAgo(s.submittedAt)}</span>
          {s.reward && <span className="font-mono font-semibold text-green">+{s.reward}</span>}
        </div>
      </div>
      <Badge tone={tone[s.status]}>
        <span className={`h-1.5 w-1.5 rounded-full ${dot[s.status]}`} /> {s.status}
      </Badge>
      <Link href={s.link.startsWith("http") ? s.link : "#"} className="text-faint opacity-0 transition-opacity group-hover:opacity-100">
        <ExternalLink size={16} />
      </Link>
    </div>
  );
}
