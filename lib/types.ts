export type Category =
  | "Memes"
  | "Threads"
  | "Videos"
  | "AI"
  | "Design"
  | "Research";

export type SubmissionType =
  | "X Post"
  | "Thread"
  | "Quote"
  | "Video"
  | "X Thread"
  | "Quote Post"
  | "Video Link"
  | "Image Upload"
  | "Multiple Links";

export type PresetRewardToken = "BNB" | "USDT" | "MEME" | "CAKE" | "ETH";
export type RewardTokenOption = PresetRewardToken | "CUSTOM";
export type RewardToken = string;
export type AccountType = "user" | "project";

export type SubmissionStatus = "Pending Review" | "Approved" | "Rejected" | "Winner";

export interface TokenMetadata {
  name: string;
  symbol: string;
  decimals: number;
  address: string;
}

export interface Creator {
  id: string;
  type: AccountType;
  name: string;
  handle: string;
  avatar: string;
  verified: boolean;
  xHandle?: string | null;
  website?: string | null;
  ownerWallet?: string | null;
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
  rewardTokenMeta?: TokenMetadata | null;
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
  accountType: "project";
  name: string;
  handle: string;
  avatar: string;
  banner: string;
  verified: boolean;
  description: string;
  website: string;
  contract: string;
  ownerWallet: string;
  xHandle?: string | null;
  totalSponsored: number;
  activeChallenges: number;
  completedChallenges: number;
}

export interface UserProfile {
  id: string;
  accountType: AccountType;
  name: string;
  handle: string;
  avatar: string;
  banner: string;
  wallet: string;
  bio: string;
  website?: string;
  projectVerified?: boolean;
  xConnected: boolean;
  xHandle?: string | null;
  xUserId?: string | null;
  joined: number;
  created: number;
  wins: number;
  earned: number;
  isAdmin?: boolean;
}

export interface PublicUserProfile extends UserProfile {
  joinedCampaigns: Challenge[];
  createdCampaigns: Challenge[];
  submissions: Submission[];
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
  accountType?: AccountType;
  value: number; // earnings / contributions / sponsored
  wins: number;
  delta: number; // rank change
}
