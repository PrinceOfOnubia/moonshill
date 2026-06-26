import { LegalLayout, type DocSection } from "@/components/legal/LegalLayout";

export const metadata = {
  title: "Privacy Policy — Memebook",
  description: "How Memebook collects, uses, and protects your data.",
};

const sections: DocSection[] = [
  {
    id: "overview",
    heading: "Overview",
    body: [
      "This Privacy Policy explains what information Memebook (\"we\", \"us\") collects when you use the platform, how we use it, and the choices you have. By using Memebook you agree to the practices described here.",
      "We aim to collect as little as possible and to be clear about what we do with it.",
    ],
  },
  {
    id: "information-we-collect",
    heading: "Information we collect",
    body: [
      "We collect information needed to run challenges and pay out rewards:",
      {
        list: [
          "Account data — your X handle and public profile details when you connect your account.",
          "Wallet data — your public wallet address, used to verify ownership and send rewards.",
          "Submissions — the links, posts, and uploads you submit to challenges, plus their review status.",
          "Usage data — basic analytics such as pages viewed and actions taken, to improve the product.",
          "Device data — browser type, approximate region, and similar technical details.",
        ],
      },
    ],
  },
  {
    id: "how-we-use",
    heading: "How we use your information",
    body: [
      {
        list: [
          "To operate challenges — display entries, run reviews, and rank winners.",
          "To pay rewards — send tokens to your verified wallet when a challenge settles.",
          "To verify authenticity — confirm that submissions come from the account that owns them.",
          "To improve Memebook — understand what's working and fix what isn't.",
          "To communicate — send essential notices about your entries, rewards, and account.",
        ],
      },
    ],
  },
  {
    id: "on-chain",
    heading: "On-chain & public data",
    body: [
      "Memebook is built on public blockchains. Transactions such as reward payouts are recorded on-chain and are permanent and publicly visible. Your wallet address and any associated activity may be viewable by anyone.",
      "Submissions you make public (for example an X post) are visible to other users and are surfaced in challenge galleries and leaderboards.",
    ],
  },
  {
    id: "sharing",
    heading: "Sharing your information",
    body: [
      "We do not sell your personal information. We share data only as needed to run the service:",
      {
        list: [
          "With challenge creators — so they can review and judge entries to their challenges.",
          "With service providers — infrastructure, analytics, and security partners under confidentiality terms.",
          "For legal reasons — where required by law or to protect the rights and safety of users.",
        ],
      },
    ],
  },
  {
    id: "cookies",
    heading: "Cookies & analytics",
    body: [
      "We use a small number of cookies and similar technologies to keep you signed in, remember preferences, and measure aggregate usage. You can control cookies through your browser settings, though some features may not work without them.",
    ],
  },
  {
    id: "security",
    heading: "Data security & retention",
    body: [
      "We use reasonable technical and organizational measures to protect your information. No method of transmission or storage is fully secure, and we cannot guarantee absolute security.",
      "We keep information for as long as needed to provide the service and meet legal obligations, after which it is deleted or anonymized. Note that on-chain records cannot be deleted.",
    ],
  },
  {
    id: "your-rights",
    heading: "Your rights & choices",
    body: [
      "Depending on your location, you may have rights to access, correct, or delete your personal data, and to disconnect your X account or wallet at any time. To exercise these rights, contact us using the details below.",
    ],
  },
  {
    id: "children",
    heading: "Children",
    body: [
      "Memebook is not directed to anyone under 18 (or the age of majority in your jurisdiction). We do not knowingly collect data from children.",
    ],
  },
  {
    id: "changes",
    heading: "Changes & contact",
    body: [
      "We may update this policy from time to time. Material changes will be reflected by the \"Last updated\" date, and significant updates may be announced in-app.",
      "Questions about privacy? Email hello@memebook.xyz or reach us on 𝕏.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <LegalLayout
      eyebrow="Legal"
      title="Privacy Policy"
      intro="What we collect, how we use it, and the control you have over your data on Memebook."
      updated="June 26, 2026"
      sections={sections}
    />
  );
}
