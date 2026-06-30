import { LegalLayout, type DocSection } from "@/components/legal/LegalLayout";

export const metadata = {
  title: "Terms of Service — Moonshill",
  description: "The terms that govern your use of Moonshill.",
};

const sections: DocSection[] = [
  {
    id: "acceptance",
    heading: "Acceptance of terms",
    body: [
      "By accessing or using Moonshill (the \"Platform\"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Platform.",
      "You must be at least 18 years old (or the age of majority in your jurisdiction) and legally able to enter into these terms.",
    ],
  },
  {
    id: "accounts",
    heading: "Accounts & reward wallets",
    body: [
      "Access to the authenticated app requires an email or X-based account. You are responsible for maintaining access to that account and for any reward wallets you later add to your profile.",
      "We never take custody of your funds and cannot recover lost keys or reverse on-chain transactions tied to the wallets you provide for payouts.",
    ],
  },
  {
    id: "campaigns",
    heading: "Campaigns & submissions",
    body: [
      "Campaigns are created by projects and creators. When you submit an entry, you confirm that:",
      {
        list: [
          "The content is yours or you have the rights to submit it.",
          "It complies with the campaign's rules, required tags, and proof requirements.",
          "It does not infringe third-party rights or violate any law.",
          "It is not misleading, fraudulent, or artificially boosted.",
        ],
      },
      "Projects review and rank entries against their stated rules. We may remove submissions that violate these terms.",
    ],
  },
  {
    id: "rewards",
    heading: "Rewards",
    body: [
      "Reward pools are funded and distributed by campaign creators via smart contracts. Moonshill does not guarantee any reward amount, eligibility, or payout timing, and is not responsible for a creator's failure to fund or distribute rewards.",
      "You are responsible for any taxes arising from rewards you receive.",
    ],
  },
  {
    id: "conduct",
    heading: "Acceptable use",
    body: [
      "You agree not to:",
      {
        list: [
          "Use bots, sybil accounts, or manipulation to game campaigns or leaderboards.",
          "Post unlawful, hateful, infringing, or NSFW content where prohibited.",
          "Attempt to exploit, attack, or disrupt the Platform or its smart contracts.",
          "Impersonate others or misrepresent your affiliation.",
        ],
      },
    ],
  },
  {
    id: "ip",
    heading: "Intellectual property",
    body: [
      "You retain ownership of content you create. By submitting to a campaign, you grant Moonshill and the campaign creator a non-exclusive license to display, promote, and distribute your entry in connection with the Platform and the campaign.",
    ],
  },
  {
    id: "risk",
    heading: "Crypto risk disclosure",
    body: [
      "Blockchain transactions are irreversible and digital assets are volatile. You use the Platform at your own risk and accept the possibility of total loss. Nothing on Moonshill is financial, legal, or tax advice.",
    ],
  },
  {
    id: "disclaimer",
    heading: "Disclaimers & liability",
    body: [
      "The Platform is provided \"as is\" without warranties of any kind. To the maximum extent permitted by law, Moonshill is not liable for any indirect, incidental, or consequential damages, or for losses arising from your use of the Platform, smart contracts, or third-party wallets.",
    ],
  },
  {
    id: "changes",
    heading: "Changes & contact",
    body: [
      "We may update these terms from time to time. Continued use after changes means you accept the updated terms.",
      "Questions? Email hello@moonshill.xyz or reach us on 𝕏.",
    ],
  },
];

export default function TermsPage() {
  return (
    <LegalLayout
      eyebrow="Legal"
      title="Terms of Service"
      intro="The rules that govern your use of Moonshill, campaigns, rewards, and on-chain interactions."
      updated="June 26, 2026"
      sections={sections}
    />
  );
}
