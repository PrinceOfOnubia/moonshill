import type { AppNotification, Challenge, LeaderRow, ProjectProfile, PublicUserProfile, Submission, TokenMetadata, UserProfile } from "./types";

const DEFAULT_BASE_URL = "http://localhost:8080";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function baseUrl() {
  return (process.env.NEXT_PUBLIC_API_URL || DEFAULT_BASE_URL).replace(/\/$/, "");
}

async function parseResponse<T>(res: Response): Promise<T> {
  const contentType = res.headers.get("content-type") || "";
  const body = contentType.includes("application/json") ? await res.json() : { error: await res.text() };
  if (!res.ok) {
    throw new ApiError(body?.error || res.statusText || "Request failed", res.status);
  }
  return body as T;
}

export async function apiFetch<T>(path: string, init: RequestInit = {}) {
  const res = await fetch(`${baseUrl()}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  return parseResponse<T>(res);
}

export interface MeResponse extends UserProfile {
  joinedCampaigns: Challenge[];
  createdCampaigns: Challenge[];
  submissions: Submission[];
  isAdmin?: boolean;
}

export async function getMe() {
  return apiFetch<MeResponse>("/api/me");
}

export async function walletChallenge(address: string) {
  return apiFetch<{ address: string; nonce: string; message: string; expiresAt: string }>(`/api/auth/wallet/challenge?address=${encodeURIComponent(address)}`);
}

export async function walletVerify(address: string, signature: string) {
  return apiFetch<{ user: MeResponse; session: { expiresAt: string } }>("/api/auth/wallet/verify", {
    method: "POST",
    body: JSON.stringify({ address, signature }),
  });
}

export async function logout() {
  return apiFetch<{ ok: true }>("/api/auth/logout", { method: "POST" });
}

export async function updateMe(patch: { name?: string; bio?: string; avatar?: string; banner?: string; handle?: string; accountType?: "user" | "project"; website?: string }) {
  return apiFetch<{ user: MeResponse }>("/api/me", {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export async function submitProjectVerification() {
  return apiFetch<{ user: MeResponse }>("/api/me/project-verification", {
    method: "POST",
  });
}

export async function startXConnect(returnTo?: string) {
  const url = `/api/auth/x/start?format=json${returnTo ? `&returnTo=${encodeURIComponent(returnTo)}` : ""}`;
  return apiFetch<{ redirectUrl: string }>(url, {
    method: "GET",
  });
}

export async function getCampaigns(params?: { category?: string; limit?: number }) {
  const search = new URLSearchParams();
  if (params?.category) search.set("category", params.category);
  if (params?.limit) search.set("limit", String(params.limit));
  return apiFetch<{ campaigns: Challenge[] }>(`/api/campaigns${search.toString() ? `?${search}` : ""}`);
}

export async function getCampaign(slug: string) {
  return apiFetch<{ campaign: Challenge }>(`/api/campaigns/${encodeURIComponent(slug)}`);
}

export async function getPublicData() {
  return apiFetch<{
    appName: string;
    platformStats: { activeChallenges: number; totalRewards: number; creators: number; submissions: number; winners: number };
    tickerItems: string[];
    leaderboard: { winners: LeaderRow[]; contributors: LeaderRow[]; projects: LeaderRow[] };
    featuredCampaigns: Challenge[];
  }>("/api/public");
}

export async function getBnbMarketPrice() {
  return apiFetch<{ symbol: "BNB"; currency: "USD"; price: number; source: string; updatedAt: string }>("/api/market/bnb");
}

export async function getTokenMetadata(address: string) {
  return apiFetch<{ token: TokenMetadata }>(`/api/token-metadata?address=${encodeURIComponent(address)}`);
}

export async function getLeaderboard() {
  return apiFetch<{ winners: LeaderRow[]; contributors: LeaderRow[]; projects: LeaderRow[] }>("/api/leaderboard");
}

export async function getNotifications() {
  return apiFetch<{ notifications: AppNotification[] }>("/api/notifications");
}

export async function getProject(handle: string) {
  return apiFetch<{ project: ProjectProfile; campaigns: Challenge[] }>(`/api/projects/${encodeURIComponent(handle)}`);
}

export async function getPublicUser(handle: string) {
  return apiFetch<{ user: PublicUserProfile }>(`/api/users/${encodeURIComponent(handle)}`);
}

export async function createCampaign(payload: Record<string, unknown>) {
  return apiFetch<{ campaign: Challenge }>("/api/campaigns", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function joinCampaign(campaignId: string) {
  return apiFetch<{ ok: true }>(`/api/campaigns/${campaignId}/join`, { method: "POST" });
}

export async function submitCampaign(campaignId: string, payload: Record<string, unknown>) {
  return apiFetch<{ submission: Submission }>(`/api/campaigns/${campaignId}/submissions`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getAdminSummary() {
  return apiFetch<{
    counts: { users: number; campaigns: number; submissions: number; joins: number; pendingProjects: number; flagged: number };
    pendingSubmissions: Submission[];
    accounts: UserProfile[];
    projectVerificationRequests: UserProfile[];
    featuredCampaigns: Challenge[];
  }>("/api/admin/summary");
}

export async function updateSubmissionStatus(submissionId: string, status: "Pending Review" | "Approved" | "Rejected" | "Winner") {
  return apiFetch<{ submission: Submission }>(`/api/admin/submissions/${encodeURIComponent(submissionId)}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function updateProjectVerificationStatus(userId: string, status: "approved" | "rejected") {
  return apiFetch<{ user: MeResponse }>(`/api/admin/projects/${encodeURIComponent(userId)}/verification`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}
