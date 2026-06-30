# Moonshill

Moonshill is a community-first Web3 campaign platform. The frontend is a Next.js app and this repo now also includes the production backend service used for email/X auth, profile persistence, project verification, campaign creation, submissions, and admin data.

## Stack

- Next.js 16, React 19, Tailwind CSS 4
- Native Node HTTP backend in `backend/server.mjs`
- PostgreSQL via `pg`
- Email/X session auth plus wallet storage for payouts
- Cookie session/JWT auth

## Local Setup

Install dependencies:

```bash
npm install
```

Create local env files:

```bash
cp .env.example .env.local
cp backend/.env.example backend/.env
```

Start the backend:

```bash
npm run backend
```

Start the frontend in a second terminal:

```bash
npm run dev
```

Default local URLs:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:8080`
- Health: `http://localhost:8080/health`
- Public API: `http://localhost:8080/api/public`

## Backend Environment

Backend envs live in `backend/.env.example`.

Required for production:

```bash
APP_NAME=Moonshill
PORT=8080
DATABASE_URL=
JWT_SECRET=
SESSION_SECRET=
CLIENT_ORIGIN=https://moonshill.vercel.app
CORS_ORIGIN=https://moonshill.vercel.app
CHAIN_ID=56
BNB_RPC_URL=https://bsc-dataseed.binance.org/
ADMIN_WALLET=
X_CLIENT_ID=
X_CLIENT_SECRET=
X_CALLBACK_URL=https://<railway-backend-url>/api/auth/x/callback
X_HANDLE=moonshillfun
SEED_DEMO_DATA=false
```

Do not commit real secrets. Generate long random values for `JWT_SECRET` and `SESSION_SECRET`.

## Frontend Environment

Frontend envs live in `.env.example`.

Required for production:

```bash
NEXT_PUBLIC_SITE_URL=https://moonshill.vercel.app
NEXT_PUBLIC_APP_NAME=Moonshill
NEXT_PUBLIC_API_URL=https://<railway-backend-url>
NEXT_PUBLIC_CHAIN_ID=56
NEXT_PUBLIC_CHAIN_NAME=BNB Smart Chain Mainnet
NEXT_PUBLIC_BSC_RPC_URL=https://bsc-dataseed.binance.org/
NEXT_PUBLIC_X_URL=https://x.com/moonshillfun
```

## Backend API

Implemented endpoints:

- `GET /health`
- `GET /api/public`
- `POST /api/auth/email`
- `GET /api/auth/x/login/start`
- `GET /api/auth/wallet/challenge?address=0x...`
- `POST /api/auth/wallet/verify`
- `POST /api/auth/logout`
- `GET /api/me`
- `PATCH /api/me`
- `PATCH /api/me/wallets`
- `GET /api/auth/x/start`
- `GET /api/auth/x/callback`
- `GET /api/project-application`
- `PATCH /api/project-application`
- `POST /api/project-application/submit`
- `GET /api/leaderboard`
- `GET /api/notifications`
- `GET /api/projects/:handle`
- `GET /api/campaigns`
- `POST /api/campaigns`
- `GET /api/campaigns/:slug`
- `POST /api/campaigns/:id/join`
- `POST /api/campaigns/:id/submissions`
- `GET /api/admin/summary`

## Deployment

### Railway Backend

1. Create a Railway project/service named `moonshill-backend`.
2. Attach a PostgreSQL database and set `DATABASE_URL`.
3. Set all backend env vars from `backend/.env.example`.
4. Set the start command to `npm run backend`.
5. After deploy, confirm:

```bash
curl https://<railway-backend-url>/health
curl https://<railway-backend-url>/api/public
```

The included `railway.json` sets the backend start command and healthcheck path.

### Vercel Frontend

1. Create a Vercel project named `moonshill`.
2. Set all frontend env vars from `.env.example`.
3. Set `NEXT_PUBLIC_API_URL` to the Railway backend URL.
4. Deploy the Next.js app.
5. After deploy, confirm `/`, `/profile`, `/create`, `/verify`, `/explore`, and `/admin`.

## Validation

Useful local checks:

```bash
npm run lint
npm run build
curl http://localhost:8080/health
curl http://localhost:8080/api/public
```

## Notes

- The backend only seeds demo data when `SEED_DEMO_DATA=true` in production.
- `lib/mock.ts` and `backend/seed-data.json` are demo/seed assets only; live app flows are API-backed.
- X OAuth will report a clean not-configured state until `X_CLIENT_ID`, `X_CLIENT_SECRET`, and `X_CALLBACK_URL` are set.
- Creators now authenticate with email or X immediately; reward wallets are added later from profile settings.
- Project accounts authenticate with email or X, then complete the existing verification flow before admin approval unlocks project-only features.
