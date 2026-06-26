export type Category =
  | "Memes"
  | "Threads"
  | "Videos"
  | "AI"
  | "Design"
  | "Research";

export type SubmissionType =
  | "X Post"
  | "X Thread"
  | "Quote Post"
  | "Video Link"
  | "Image Upload"
  | "Multiple Links";

export type RewardToken = "BNB" | "USDT" | "MEME" | "CAKE" | "ETH";

export type SubmissionStatus = "Pending Review" | "Approved" | "Rejected" | "Winner";

export interface Creator {
  id: string;
  type: "project" | "user";
  name: string;
  handle: string; // X handle
  avatar: string;
  verified: boolean;
}

export interface Challenge {
  id: string;
  slug: string;
  title: string;
  cover: string;
  category: Category;
  rewardPool: number; // USD value
  rewardToken: RewardToken;
  rewardAmount: number; // token amount
  winners: number;
  creator: Creator;
  participants: number;
  endsAt: string; // ISO
  startsAt: string; // ISO
  submissionType: SubmissionType;
  description: string;
  rules: string[];
  proof: string[];
  requiredTags?: string[];
  official: boolean;
  trending: number; // momentum score for sorting
}

export interface Submission {
  id: string;
  challengeId: string;
  challengeTitle: string;
  cover: string;
  user: Creator;
  link: string;
  type: SubmissionType;
  status: SubmissionStatus;
  submittedAt: string; // ISO
  reward?: number;
}

export interface ProjectProfile {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  banner: string;
  verified: boolean;
  description: string;
  website: string;
  contract: string;
  totalSponsored: number;
  activeChallenges: number;
  completedChallenges: number;
}

export interface UserProfile {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  banner: string;
  wallet: string;
  bio: string;
  xConnected: boolean;
  joined: number;
  created: number;
  wins: number;
  earned: number;
}

export type NotificationKind =
  | "win"
  | "approved"
  | "rejected"
  | "review"
  | "new"
  | "ending"
  | "reward";

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  at: string; // ISO
  unread: boolean;
  href?: string;
  actor?: Creator;
}

export interface LeaderRow {
  id: string;
  rank: number;
  name: string;
  handle: string;
  avatar: string;
  verified: boolean;
  value: number; // earnings / contributions / sponsored
  wins: number;
  delta: number; // rank change
}
