import { LegalLayout, type DocSection } from "@/components/legal/LegalLayout";

export const metadata = {
  title: "Docs — Memebook",
  description: "How Memebook works: challenges, submissions, rewards and verification.",
};

const sections: DocSection[] = [
  {
    id: "what-is-memebook",
    heading: "What is Memebook",
    body: [
      "Memebook is a community-first crypto arena. Projects and creators post challenges with funded reward pools; anyone can join, submit their work, and compete for a share of the rewards.",
      "Everything is mobile-first and dark by default, powered by BNB Chain. Each challenge card is a direct invitation to participate.",
    ],
  },
  {
    id: "how-it-works",
    heading: "How it works",
    body: [
      "The core loop takes you from discovery to reward in four steps:",
      {
        list: [
          "Discover — browse the home feed or Explore to find challenges by category, reward, or how soon they end.",
          "Join — open a challenge to read its rules, required tags, and proof requirements, then tap Join.",
          "Submit — create your content (an X post, thread, video, or image) and submit the link or upload.",
          "Win — approved entries are ranked by the community and project; winners split the reward pool on-chain.",
        ],
      },
    ],
  },
  {
    id: "challenges",
    heading: "Challenges",
    body: [
      "A challenge defines what to create, who can win, and how rewards are split. Before submitting, read these fields carefully:",
      {
        list: [
          "Reward pool & winners — the total prize and how many entrants share it.",
          "Submission type — X Post, X Thread, Quote Post, Video Link, Image Upload, or Multiple Links.",
          "Rules — hard requirements such as original content, tags, or format. Breaking a rule can disqualify an entry.",
          "Required tags — handles or hashtags that must appear in your post for it to count.",
          "Timeline — challenges have a start and an end; submissions close when the timer hits zero.",
        ],
      },
    ],
  },
  {
    id: "creating",
    heading: "Creating a challenge",
    body: [
      "Verified projects and creators can launch their own challenges from the Create page. You set the title, category, cover image, reward pool and token, number of winners, submission type, rules, and proof requirements.",
      "Reward pools are funded up front so participants can trust that prizes are real and will be paid out on settlement.",
    ],
  },
  {
    id: "submissions",
    heading: "Submissions & review",
    body: [
      "Each submission moves through a clear status so you always know where you stand:",
      {
        list: [
          "Pending Review — received and waiting on the project's check.",
          "Approved — meets the rules and is live in the gallery for the community.",
          "Rejected — didn't meet a rule; you can read why and submit a new entry.",
          "Winner — selected for a payout from the reward pool.",
        ],
      },
      "You can track all of your entries and their statuses from your profile.",
    ],
  },
  {
    id: "rewards",
    heading: "Rewards & payouts",
    body: [
      "Rewards are paid in the challenge's token — BNB, USDT, MEME, CAKE, or ETH — directly to your connected wallet when a challenge settles.",
      "The live reward ticker and leaderboards show recent payouts and the top earners across the platform.",
    ],
  },
  {
    id: "verification",
    heading: "Verification",
    body: [
      "Connecting your X account and verifying your wallet unlocks submitting, creating, and receiving rewards. Projects can apply for project verification to launch official challenges with a verified badge.",
      "Verification helps keep entries authentic — submissions must come from the verified account that owns them.",
    ],
  },
  {
    id: "faq",
    heading: "FAQ",
    body: [
      {
        list: [
          "Is it free to join? Yes — joining and submitting to challenges is free. Gas may apply to on-chain actions.",
          "Can I edit a submission? You can submit a new entry if your previous one was rejected, subject to the challenge's one-entry rules.",
          "How are winners chosen? By a mix of community signal and the project's review against the stated rules.",
          "When do I get paid? Payouts are sent to your wallet when the challenge ends and settles.",
        ],
      },
    ],
  },
];

export default function DocsPage() {
  return (
    <LegalLayout
      eyebrow="Documentation"
      title="How Memebook works"
      intro="Everything you need to discover challenges, submit your best work, and earn funded crypto rewards on BNB Chain."
      updated="June 26, 2026"
      sections={sections}
    />
  );
}
