import type { AppNotification, Challenge, LeaderRow, ProjectApplication, ProjectProfile, PublicUserProfile, RewardWallet, Submission, TokenMetadata, UserProfile } from "./types";

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
    cache: "no-store",
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

export async function startEmailAuth(email: string, accountType: "user" | "project") {
  return apiFetch<{ ok: true; email: string; accountType: "user" | "project"; expiresAt: string; resendAfterSeconds: number }>(
    "/api/auth/email/start",
    {
      method: "POST",
      body: JSON.stringify({ email, accountType }),
    },
  );
}

export async function verifyEmailAuth(email: string, code: string, accountType: "user" | "project") {
  return apiFetch<{ user?: MeResponse; application?: ProjectApplication; session?: { expiresAt: string }; status?: ProjectApplication["status"] }>(
    "/api/auth/email/verify",
    {
      method: "POST",
      body: JSON.stringify({ email, code, accountType }),
    },
  );
}

export async function resendEmailAuth(email: string, accountType: "user" | "project") {
  return apiFetch<{ ok: true; email: string; accountType: "user" | "project"; expiresAt: string; resendAfterSeconds: number }>(
    "/api/auth/email/resend",
    {
      method: "POST",
      body: JSON.stringify({ email, accountType }),
    },
  );
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

export async function updateMe(patch: { name?: string; bio?: string; avatar?: string; banner?: string; handle?: string; email?: string; website?: string; projectCategory?: string; telegramUrl?: string }) {
  return apiFetch<{ user: MeResponse }>("/api/me", {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export async function updateRewardWallets(wallets: Array<Pick<RewardWallet, "chain" | "address" | "isPrimary">>) {
  return apiFetch<{ wallets: RewardWallet[]; primaryWallet?: string | null }>("/api/me/wallets", {
    method: "PATCH",
    body: JSON.stringify({ wallets }),
  });
}

export async function startProjectAccount() {
  return apiFetch<{ user: MeResponse; session: { expiresAt: string } }>("/api/me/project-account", {
    method: "POST",
  });
}

export async function activateProjectAccount() {
  return apiFetch<{ user: MeResponse; session: { expiresAt: string } }>("/api/me/project-account/activate", {
    method: "POST",
  });
}

export async function submitProjectVerification() {
  return apiFetch<{ user: MeResponse }>("/api/me/project-verification", {
    method: "POST",
  });
}

export async function verifyProjectWallet(address: string, signature: string) {
  return apiFetch<{ application?: ProjectApplication; status?: ProjectApplication["status"]; user?: MeResponse; session?: { expiresAt: string } }>(
    "/api/project-auth/wallet/verify",
    {
      method: "POST",
      body: JSON.stringify({ address, signature }),
    },
  );
}

export async function getProjectApplication() {
  return apiFetch<{ application: ProjectApplication }>("/api/project-application");
}

export async function updateProjectApplication(patch: Partial<ProjectApplication>) {
  return apiFetch<{ application: ProjectApplication }>("/api/project-application", {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export async function submitProjectApplication() {
  return apiFetch<{ application: ProjectApplication }>("/api/project-application/submit", {
    method: "POST",
  });
}

export async function startProjectXConnect(returnTo?: string) {
  const url = `/api/project-auth/x/start${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`;
  return apiFetch<{ redirectUrl: string }>(url, { method: "GET" });
}

export async function startXConnect(returnTo?: string) {
  const url = `/api/auth/x/start?format=json${returnTo ? `&returnTo=${encodeURIComponent(returnTo)}` : ""}`;
  return apiFetch<{ redirectUrl: string }>(url, {
    method: "GET",
  });
}

export async function startXAuth(accountType: "user" | "project", returnTo?: string) {
  const url = `/api/auth/x/login/start?accountType=${encodeURIComponent(accountType)}${returnTo ? `&returnTo=${encodeURIComponent(returnTo)}` : ""}`;
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

export async function getTokenMetadata(address: string, provider: "dexscreener" | "chain" = "dexscreener") {
  return apiFetch<{ token: TokenMetadata }>(`/api/token-metadata?address=${encodeURIComponent(address)}&provider=${encodeURIComponent(provider)}`);
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

export async function getCampaignSubmissions(campaignId: string) {
  return apiFetch<{ submissions: Submission[] }>(`/api/campaigns/${campaignId}/submissions`);
}

export async function updateCampaignSubmissionStatus(campaignId: string, submissionId: string, status: "Pending Review" | "Approved" | "Rejected" | "Winner") {
  return apiFetch<{ submission: Submission }>(`/api/campaigns/${campaignId}/submissions/${encodeURIComponent(submissionId)}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function getAdminSummary() {
  return apiFetch<{
    counts: { users: number; campaigns: number; submissions: number; joins: number; pendingProjects: number; flagged: number };
    pendingSubmissions: Submission[];
    accounts: UserProfile[];
    projectVerificationRequests: ProjectApplication[];
    featuredCampaigns: Challenge[];
  }>("/api/admin/summary");
}

export async function updateSubmissionStatus(submissionId: string, status: "Pending Review" | "Approved" | "Rejected" | "Winner") {
  return apiFetch<{ submission: Submission }>(`/api/admin/submissions/${encodeURIComponent(submissionId)}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function updateProjectVerificationStatus(applicationId: string, status: "approved" | "rejected", reason?: string) {
  return apiFetch<{ application?: ProjectApplication; user?: MeResponse }>(`/api/admin/projects/${encodeURIComponent(applicationId)}/verification`, {
    method: "PATCH",
    body: JSON.stringify({ status, reason }),
  });
}
