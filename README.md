# Moonshill 🏆

> Every card is a challenge to join.

**Moonshill** is a community-first crypto arena where projects and users create funded
missions, challenges and contests. Creators make content on **X**, submit the post link
on Moonshill, and compete for real rewards. Moonshill is not a social network — X stays the
distribution layer while Moonshill handles discovery, submissions, verification and rewards.

This repo is the **V1 frontend** — an awwwards-style, dark-mode, mobile-first, image-first
experience built on mock data.

## ✨ Highlights

- **Design system "THE ARENA"** — warm near-black canvas, BNB gold accents, reward-green &
  verified X-blue signals, film grain, cursor spotlight, glass surfaces, mono numerics.
- **Lenis** smooth inertial scroll + scroll-driven parallax, pinned sections and a draggable
  category rail.
- **View Transitions** shared-element morph (challenge cover → detail banner) via
  `next-view-transitions`.
- **Custom morphing cursor** (JOIN / arrow / DRAG).
- Live reward ticker, animated counters, magnetic CTAs.

## 🗺️ Routes

| Route | Description |
|---|---|
| `/` | Home feed — hero, category rail, For You / Trending / Official / Newest tabs |
| `/explore` | Search + category & sort filters |
| `/create` | 3-step challenge creation wizard with live preview |
| `/challenge/[slug]` | Challenge details — Join / Submit / Share, submission flow |
| `/leaderboard` | Top Winners / Contributors / Projects × Weekly / Monthly / All-Time |
| `/profile` · `/project/[handle]` | User & project profiles |
| `/verify` | X-account and project verification flows |
| `/admin` | Moderation dashboard — approvals, winners, featured |

## 🧱 Stack

- [Next.js 16](https://nextjs.org) (App Router, Turbopack) · React 19
- Tailwind CSS 4
- Framer Motion · Lenis · next-view-transitions
- lucide-react · clsx · tailwind-merge

## 🚀 Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
npm run build   # production build
npm run start   # serve the production build
```

> All data is mocked in `lib/mock.ts`. There is no backend in V1.
