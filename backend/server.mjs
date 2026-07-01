import http from "node:http";
import fs from "node:fs/promises";
import crypto from "node:crypto";
import { Pool } from "pg";
import { verifyMessage } from "ethers";

const PORT = Number(process.env.PORT || 8080);
const APP_NAME = process.env.APP_NAME || "Moonshill";
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || process.env.CORS_ORIGIN || "http://localhost:3000";
const CORS_ORIGIN = process.env.CORS_ORIGIN || CLIENT_ORIGIN;
const DEFAULT_CORS_ORIGIN = CORS_ORIGIN.split(",")[0].trim() || CLIENT_ORIGIN;
const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || "moonshill-dev-secret";
const DATABASE_URL = process.env.DATABASE_URL;
const COOKIE_NAME = "moonshill_session";
const PROJECT_APP_COOKIE_NAME = "moonshill_project_application";
const SESSION_DAYS = 30;
const PROJECT_APPLICATION_DAYS = 14;
const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 10;
const OTP_RESEND_COOLDOWN_SECONDS = 60;
const OTP_MAX_ATTEMPTS = 5;
const X_AUTHORIZE_URL = "https://x.com/i/oauth2/authorize";
const X_TOKEN_URL = "https://api.x.com/2/oauth2/token";
const X_ME_URL = "https://api.x.com/2/users/me?user.fields=profile_image_url,verified,username";
const X_HANDLE = process.env.X_HANDLE || "moonshillfun";
const REQUIRED_X_RULE = `Must follow @${X_HANDLE} on X`;
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const EMAIL_FROM = process.env.EMAIL_FROM || process.env.RESEND_FROM_EMAIL || "";
const BNB_PRICE_TTL_MS = 60_000;
const BNB_RPC_URL = process.env.BNB_RPC_URL || "https://bsc-dataseed1.bnbchain.org/";
const BNB_RPC_URLS = Array.from(
  new Set(
    [
      BNB_RPC_URL,
      "https://bsc-dataseed1.bnbchain.org/",
      "https://bsc-dataseed.binance.org/",
      "https://binance.llamarpc.com",
    ].filter(Boolean),
  ),
);
let bnbPriceCache = { price: 600, source: "fallback", updatedAt: 0 };
const isProd = process.env.NODE_ENV === "production";
const shouldSeedDemoData = process.env.SEED_DEMO_DATA === "true" || (!isProd && process.env.SEED_DEMO_DATA !== "false");
const allowedCorsOrigins = new Set(
  CORS_ORIGIN.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
);
if (!isProd) {
  allowedCorsOrigins.add("http://localhost:3000");
  allowedCorsOrigins.add("http://localhost:3001");
  allowedCorsOrigins.add("http://127.0.0.1:3000");
  allowedCorsOrigins.add("http://127.0.0.1:3001");
}

const seedPath = new URL("./seed-data.json", import.meta.url);
const seed = JSON.parse(await fs.readFile(seedPath, "utf8"));
const seedUserIds = new Set([
  ...(Object.values(seed.creators || {}).map((creator) => creator.id)),
  ...((seed.users || []).map((user) => user.id)),
  seed.me?.id,
].filter(Boolean));
const seedCampaignIds = new Set((seed.challenges || []).map((campaign) => campaign.id).filter(Boolean));
const seedSubmissionIds = new Set((seed.submissions || []).map((submission) => submission.id).filter(Boolean));

const pool = DATABASE_URL
  ? new Pool({
      connectionString: DATABASE_URL,
      ssl: /sslmode=require/i.test(DATABASE_URL) ? { rejectUnauthorized: false } : undefined,
    })
  : new Pool({
      host: process.env.PGHOST || "/tmp",
      port: Number(process.env.PGPORT || 5432),
      database: process.env.PGDATABASE || "postgres",
      user: process.env.PGUSER || process.env.USER || process.env.USERNAME || "postgres",
    });

function normalizeAddress(address = "") {
  return String(address).trim().toLowerCase();
}

function normalizeEmail(email = "") {
  return String(email).trim().toLowerCase();
}

function nowIso() {
  return new Date().toISOString();
}

function isAddress(value = "") {
  return /^0x[a-fA-F0-9]{40}$/.test(String(value).trim());
}

function sanitizeHandle(value = "") {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]+/g, "")
    .replace(/^_+|_+$/g, "")
    .slice(0, 32);
}

function isValidEmail(value = "") {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value));
}

function seedWalletAddress(id = "") {
  return `0x${crypto.createHash("sha256").update(`moonshill-seed:${id}`).digest("hex").slice(0, 40)}`;
}

function base64url(input) {
  return Buffer.from(input).toString("base64url");
}

function otpHash(email, accountType, code) {
  return crypto
    .createHmac("sha256", JWT_SECRET)
    .update(`${normalizeEmail(email)}:${accountType}:${String(code).trim()}`)
    .digest("hex");
}

function generateOtpCode() {
  return crypto.randomInt(0, 10 ** OTP_LENGTH).toString().padStart(OTP_LENGTH, "0");
}

function json(res, status, body, extraHeaders = {}) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": res.getHeader("Access-Control-Allow-Origin") || DEFAULT_CORS_ORIGIN,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Project-Application",
    "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
    ...extraHeaders,
  });
  res.end(JSON.stringify(body));
}

function text(res, status, body, extraHeaders = {}) {
  res.writeHead(status, {
    "Content-Type": "text/plain; charset=utf-8",
    "Access-Control-Allow-Origin": res.getHeader("Access-Control-Allow-Origin") || DEFAULT_CORS_ORIGIN,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Project-Application",
    "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
    ...extraHeaders,
  });
  res.end(body);
}

function redirect(res, location, extraHeaders = {}) {
  res.writeHead(302, {
    Location: location,
    "Access-Control-Allow-Origin": res.getHeader("Access-Control-Allow-Origin") || DEFAULT_CORS_ORIGIN,
    "Access-Control-Allow-Credentials": "true",
    ...extraHeaders,
  });
  res.end();
}

function resolveClientRedirect(target, fallbackPath = "/home") {
  const fallback = new URL(fallbackPath, CLIENT_ORIGIN).toString();
  if (!target) return fallback;
  try {
    return new URL(String(target), CLIENT_ORIGIN).toString();
  } catch {
    return fallback;
  }
}

function withRedirectParam(redirectTo, key, value) {
  const url = new URL(redirectTo);
  url.searchParams.set(key, value);
  return url.toString();
}

function withRedirectHashParam(redirectTo, key, value) {
  const url = new URL(redirectTo);
  const hashParams = new URLSearchParams(url.hash.startsWith("#") ? url.hash.slice(1) : url.hash);
  hashParams.set(key, value);
  url.hash = hashParams.toString();
  return url.toString();
}

function normalizeApprovedProjectRedirect(redirectTo) {
  try {
    const url = new URL(redirectTo);
    if (url.pathname === "/build") {
      return resolveClientRedirect("/home", "/home");
    }
    return url.toString();
  } catch {
    return resolveClientRedirect("/home", "/home");
  }
}

function applyCors(req, res) {
  const origin = req.headers.origin;
  const allowedOrigin = origin && allowedCorsOrigins.has(origin) ? origin : DEFAULT_CORS_ORIGIN;
  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Project-Application");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
}

function parseCookies(req) {
  const header = req.headers.cookie || "";
  const out = {};
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (!k) continue;
    out[k] = decodeURIComponent(rest.join("="));
  }
  return out;
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return Object.fromEntries(new URLSearchParams(raw));
  }
}

function signJwt(payload) {
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64url(JSON.stringify(payload));
  const sig = crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${sig}`;
}

function verifyJwt(token) {
  const parts = String(token || "").split(".");
  if (parts.length !== 3) return null;
  const [header, body, sig] = parts;
  const expected = crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest("base64url");
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (payload.exp && Date.now() > payload.exp * 1000) return null;
    return payload;
  } catch {
    return null;
  }
}

function sessionCookie(token) {
  const maxAge = SESSION_DAYS * 24 * 60 * 60;
  const sameSite = isProd ? "None" : "Lax";
  const secure = isProd ? "; Secure" : "";
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=${sameSite}${secure}`;
}

function projectApplicationCookie(token) {
  const maxAge = PROJECT_APPLICATION_DAYS * 24 * 60 * 60;
  const sameSite = isProd ? "None" : "Lax";
  const secure = isProd ? "; Secure" : "";
  return `${PROJECT_APP_COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=${sameSite}${secure}`;
}

function clearCookie(name) {
  return `${name}=; HttpOnly; Path=/; Max-Age=0; SameSite=${isProd ? "None" : "Lax"}${isProd ? "; Secure" : ""}`;
}

async function query(textSql, params = []) {
  const client = await pool.connect();
  try {
    return await client.query(textSql, params);
  } finally {
    client.release();
  }
}

async function ensureSchema() {
  await query(`
    create table if not exists users (
      id text primary key,
      wallet_address text,
      email text not null default '',
      display_name text not null,
      handle text not null,
      account_type text not null default 'user',
      auth_provider text not null default 'email',
      avatar text not null,
      banner text not null,
      bio text not null default '',
      website text not null default '',
      project_category text,
      telegram_url text not null default '',
      project_verified boolean not null default false,
      project_verification_status text not null default 'unverified',
      x_connected boolean not null default false,
      x_user_id text,
      x_handle text,
      joined integer not null default 0,
      created integer not null default 0,
      wins integer not null default 0,
      earned numeric not null default 0,
      is_admin boolean not null default false,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `);
  await query(`alter table users alter column wallet_address drop not null;`);
  await query(`alter table users add column if not exists account_type text not null default 'user';`);
  await query(`alter table users add column if not exists email text not null default '';`);
  await query(`alter table users add column if not exists auth_provider text not null default 'email';`);
  await query(`alter table users add column if not exists website text not null default '';`);
  await query(`alter table users add column if not exists project_category text;`);
  await query(`alter table users add column if not exists telegram_url text not null default '';`);
  await query(`alter table users add column if not exists project_verified boolean not null default false;`);
  await query(`alter table users add column if not exists project_verification_status text not null default 'unverified';`);
  await query(`alter table users drop constraint if exists users_wallet_address_key;`);
  await query(`create unique index if not exists users_wallet_address_account_type_idx on users (lower(wallet_address), account_type);`);
  await query(`create unique index if not exists users_email_account_type_idx on users (lower(email), account_type) where trim(email) <> '';`);
  await query(`
    update users
    set project_verification_status = case
      when project_verified = true then 'approved'
      when account_type = 'project' and project_verification_status not in ('pending', 'approved', 'rejected') then 'unverified'
      else coalesce(project_verification_status, 'unverified')
    end
  `);
  await query(`
    create table if not exists wallet_challenges (
      address text primary key,
      nonce text not null,
      message text not null,
      expires_at timestamptz not null,
      created_at timestamptz not null default now()
    );
  `);
  await query(`
    create table if not exists sessions (
      id text primary key,
      user_id text not null references users(id) on delete cascade,
      expires_at timestamptz not null,
      revoked_at timestamptz,
      created_at timestamptz not null default now()
    );
  `);
  await query(`
    create table if not exists email_auth_codes (
      id text primary key,
      email text not null,
      account_type text not null,
      code_hash text not null,
      expires_at timestamptz not null,
      used_at timestamptz,
      attempt_count integer not null default 0,
      send_count integer not null default 1,
      last_sent_at timestamptz not null default now(),
      created_at timestamptz not null default now()
    );
  `);
  await query(`create index if not exists email_auth_codes_lookup_idx on email_auth_codes (lower(email), account_type, created_at desc);`);
  await query(`
    create table if not exists x_oauth_states (
      state text primary key,
      user_id text not null references users(id) on delete cascade,
      code_verifier text not null,
      redirect_to text not null,
      expires_at timestamptz not null,
      created_at timestamptz not null default now()
    );
  `);
  await query(`
    create table if not exists auth_x_oauth_states (
      state text primary key,
      account_type text not null,
      code_verifier text not null default '',
      redirect_to text not null,
      expires_at timestamptz not null,
      created_at timestamptz not null default now()
    );
  `);
  await query(`alter table auth_x_oauth_states add column if not exists code_verifier text not null default '';`);
  await query(`
    create table if not exists project_applications (
      id text primary key,
      wallet_address text,
      email text not null default '',
      project_name text not null default '',
      project_handle text not null default '',
      token_name text not null default '',
      token_ticker text not null default '',
      token_contract text not null default '',
      chain text not null default '',
      website text not null default '',
      telegram_url text not null default '',
      discord_url text not null default '',
      description text not null default '',
      logo text not null default '',
      banner text not null default '',
      project_category text,
      verification_notes text not null default '',
      x_connected boolean not null default false,
      x_user_id text,
      x_handle text,
      status text not null default 'draft',
      rejection_reason text not null default '',
      approved_project_id text references users(id) on delete set null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `);
  await query(`create unique index if not exists project_applications_wallet_address_idx on project_applications (lower(wallet_address));`);
  await query(`create unique index if not exists project_applications_email_idx on project_applications (lower(email)) where trim(email) <> '';`);
  await query(`
    create table if not exists reward_wallets (
      id text primary key,
      user_id text not null references users(id) on delete cascade,
      chain text not null,
      wallet_address text not null,
      is_primary boolean not null default false,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `);
  await query(`create unique index if not exists reward_wallets_user_chain_idx on reward_wallets (user_id, chain);`);
  await query(`
    create table if not exists project_x_oauth_states (
      state text primary key,
      project_application_id text not null references project_applications(id) on delete cascade,
      code_verifier text not null,
      redirect_to text not null,
      expires_at timestamptz not null,
      created_at timestamptz not null default now()
    );
  `);
  await query(`
    create table if not exists campaigns (
      id text primary key,
      slug text unique not null,
      title text not null,
      cover text not null,
      category text not null,
      reward_pool numeric not null,
      reward_token text not null,
      reward_token_meta jsonb,
      reward_amount numeric not null,
      winners integer not null,
      creator jsonb not null,
      holder_requirement jsonb,
      creator_requirements jsonb,
      participants integer not null default 0,
      starts_at timestamptz not null,
      ends_at timestamptz not null,
      submission_type text not null,
      description text not null,
      rules jsonb not null default '[]'::jsonb,
      proof jsonb not null default '[]'::jsonb,
      required_tags jsonb,
      official boolean not null default false,
      trending integer not null default 0,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `);
  await query(`alter table campaigns add column if not exists reward_token_meta jsonb;`);
  await query(`alter table campaigns add column if not exists holder_requirement jsonb;`);
  await query(`alter table campaigns add column if not exists creator_requirements jsonb;`);
  await query(`
    create table if not exists campaign_members (
      campaign_id text not null references campaigns(id) on delete cascade,
      user_id text not null references users(id) on delete cascade,
      created_at timestamptz not null default now(),
      primary key (campaign_id, user_id)
    );
  `);
  await query(`
    create table if not exists submissions (
      id text primary key,
      campaign_id text not null references campaigns(id) on delete cascade,
      user_id text not null,
      challenge_title text not null,
      cover text not null,
      "user" jsonb not null,
      link text not null,
      type text not null,
      status text not null,
      submitted_at timestamptz not null,
      reward numeric,
      created_at timestamptz not null default now()
    );
  `);
  await query(`alter table if exists submissions drop constraint if exists submissions_user_id_fkey;`);
  await query(`
    delete from submissions s
    using submissions dupe
    where s.id < dupe.id
      and s.campaign_id = dupe.campaign_id
      and s.user_id = dupe.user_id
  `);
  await query(`create unique index if not exists submissions_campaign_user_idx on submissions (campaign_id, user_id);`);
}

async function ensureSeed() {
  const projectMetaById = new Map((seed.projects || []).map((project) => [project.id, project]));
  for (const creator of Object.values(seed.creators || {})) {
    const projectMeta = projectMetaById.get(creator.id);
    const accountType = creator.type === "project" ? "project" : "user";
    const wins = (seed.submissions || [])
      .filter((submission) => submission.user?.id === creator.id && submission.status === "Winner")
      .length;
    const earned = (seed.submissions || [])
      .filter((submission) => submission.user?.id === creator.id)
      .reduce((sum, submission) => sum + Number(submission.reward || 0), 0);
    const created = (seed.challenges || [])
      .filter((campaign) => campaign.creator?.id === creator.id)
      .length;
    await query(
      `
      insert into users (
        id, wallet_address, display_name, handle, account_type, avatar, banner, bio, website,
        project_category, telegram_url,
        project_verified, project_verification_status, x_connected, x_user_id, x_handle, joined,
        created, wins, earned, is_admin
      )
      values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,false,null,null,0,$13,$14,$15,false)
      on conflict (id) do update set
        handle = excluded.handle,
        display_name = excluded.display_name,
        account_type = excluded.account_type,
        avatar = excluded.avatar,
        banner = excluded.banner,
        bio = excluded.bio,
        website = excluded.website,
        project_category = excluded.project_category,
        telegram_url = excluded.telegram_url,
        project_verified = excluded.project_verified,
        project_verification_status = excluded.project_verification_status,
        created = excluded.created,
        wins = excluded.wins,
        earned = excluded.earned,
        updated_at = now()
      `,
      [
        creator.id,
        seedWalletAddress(creator.id),
        creator.name,
        sanitizeHandle(creator.handle || creator.name),
        accountType,
        creator.avatar,
        projectMeta?.banner || seed.me?.banner || "https://images.unsplash.com/photo-1639322537228-f710d846310a?auto=format&fit=crop&w=1400&q=80",
        projectMeta?.description || `${creator.name} ${accountType === "project" ? "project" : "creator"} profile.`,
        projectMeta?.website || "",
        projectMeta?.category || null,
        projectMeta?.telegramUrl || "",
        Boolean(projectMeta?.verified || creator.verified),
        Boolean(projectMeta?.verified || creator.verified) ? "approved" : "unverified",
        created,
        wins,
        earned,
      ],
    );
  }

  const me = seed.me;
  await query(
    `
    insert into users (id, wallet_address, display_name, handle, avatar, banner, bio, project_verification_status, x_connected, x_user_id, x_handle, joined, created, wins, earned, is_admin)
    values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
    on conflict (id) do update set
      wallet_address = excluded.wallet_address,
      display_name = excluded.display_name,
      handle = excluded.handle,
      avatar = excluded.avatar,
      banner = excluded.banner,
      bio = excluded.bio,
      project_verification_status = excluded.project_verification_status,
      x_connected = excluded.x_connected,
      x_user_id = excluded.x_user_id,
      x_handle = excluded.x_handle,
      joined = excluded.joined,
      created = excluded.created,
      wins = excluded.wins,
      earned = excluded.earned,
      is_admin = excluded.is_admin,
      updated_at = now()
    `,
    [
      me.id,
      me.wallet,
      me.name,
      me.handle,
      me.avatar,
      me.banner,
      me.bio,
      "unverified",
      me.xConnected,
      "seed_x_user",
      me.handle,
      me.joined,
      me.created,
      me.wins,
      me.earned,
      true,
    ],
  );

  const campaignCount = await query("select count(*)::int as count from campaigns");
  if (campaignCount.rows[0].count === 0) {
    for (const c of seed.challenges) {
      await query(
        `
        insert into campaigns
          (id, slug, title, cover, category, reward_pool, reward_token, reward_amount, winners, creator, participants, starts_at, ends_at, submission_type, description, rules, proof, required_tags, official, trending)
        values
          ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,$12,$13,$14,$15,$16::jsonb,$17::jsonb,$18::jsonb,$19,$20)
        `,
        [
          c.id,
          c.slug,
          c.title,
          c.cover,
          c.category,
          c.rewardPool,
          c.rewardToken,
          c.rewardAmount,
          c.winners,
          JSON.stringify(c.creator),
          c.participants,
          c.startsAt,
          c.endsAt,
          c.submissionType,
          c.description,
          JSON.stringify(c.rules),
          JSON.stringify(c.proof),
          JSON.stringify(c.requiredTags ?? null),
          c.official,
          c.trending,
        ],
      );
    }
  }

  const submissionsCount = await query("select count(*)::int as count from submissions");
  if (submissionsCount.rows[0].count === 0) {
    for (const s of seed.submissions) {
      await query(
        `
        insert into submissions
          (id, campaign_id, user_id, challenge_title, cover, "user", link, type, status, submitted_at, reward)
        values
          ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9,$10,$11)
        `,
        [
          s.id,
          s.challengeId,
          s.user.id,
          s.challengeTitle,
          s.cover,
          JSON.stringify(s.user),
          s.link,
          s.type,
          s.status,
          s.submittedAt,
          s.reward ?? null,
        ],
      );
    }
  }
}

function campaignRow(row) {
  const creator = row.creator || {};
  const accountType = creator.type === "project" ? "project" : "user";
  const verified = accountType === "project" ? !!creator.verified : !!creator.xConnected;
  const rewardToken = String(row.reward_token || "");
  const displayRewardToken = rewardToken === "MEME" || rewardToken === "SHILL" ? "$SHILL" : rewardToken;
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    cover: row.cover,
    category: row.category,
    rewardPool: Number(row.reward_pool),
    rewardToken: displayRewardToken,
    rewardTokenMeta: row.reward_token_meta || null,
    rewardAmount: Number(row.reward_amount),
    winners: row.winners,
    creator: {
      id: creator.id || "",
      type: accountType,
      name: creator.name || "Unknown",
      handle: creator.handle || "unknown",
      avatar: creator.avatar || `https://api.dicebear.com/9.x/glass/svg?seed=${encodeURIComponent(creator.id || row.id)}&backgroundType=gradientLinear`,
      verified,
      xHandle: creator.xHandle || null,
      website: creator.website || null,
      ownerWallet: creator.ownerWallet || null,
      telegramUrl: creator.telegramUrl || null,
      projectCategory: creator.projectCategory || null,
    },
    participants: row.participants,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    submissionType: row.submission_type,
    description: row.description,
    rules: row.rules || [],
    proof: row.proof || [],
    requiredTags: row.required_tags || undefined,
    holderRequirement: row.holder_requirement || null,
    creatorRequirements: row.creator_requirements || null,
    official: row.official,
    trending: row.trending,
  };
}

function userRow(row) {
  const accountType = row.account_type === "project" ? "project" : "user";
  const projectVerificationStatus =
    row.project_verification_status === "pending"
    || row.project_verification_status === "approved"
    || row.project_verification_status === "rejected"
      ? row.project_verification_status
      : accountType === "project"
        ? (row.project_verified ? "approved" : "unverified")
        : "unverified";
  const projectVerified = accountType === "project" && projectVerificationStatus === "approved";
  return {
    id: row.id,
    accountType,
    name: row.display_name,
    handle: row.handle,
    avatar: row.avatar,
    banner: row.banner,
    wallet: row.wallet_address || null,
    email: row.email || null,
    bio: row.bio,
    website: row.website || "",
    projectCategory: row.project_category || null,
    telegramUrl: row.telegram_url || "",
    projectVerified,
    projectVerificationStatus,
    xConnected: row.x_connected,
    xUserId: row.x_user_id ?? null,
    xHandle: row.x_handle ?? null,
    joined: row.joined,
    created: row.created,
    wins: row.wins,
    earned: Number(row.earned),
    isAdmin: row.is_admin,
  };
}

function rewardWalletRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    chain: row.chain,
    address: row.wallet_address,
    isPrimary: !!row.is_primary,
  };
}

function creatorFromUser(user) {
  const verifiedProject = user.accountType === "project" && user.projectVerificationStatus === "approved";
  return {
    id: user.id,
    type: user.accountType,
    name: user.name,
    handle: user.handle,
    avatar: user.avatar,
    verified: verifiedProject,
    xHandle: user.xHandle || null,
    website: user.website || null,
    ownerWallet: user.wallet || null,
    telegramUrl: user.telegramUrl || null,
    projectCategory: user.projectCategory || null,
  };
}

function projectProfileFromUser(user, campaigns = []) {
  const activeChallenges = Array.isArray(campaigns) ? campaigns.length : Number(campaigns || 0);
  const totalSponsored = Array.isArray(campaigns)
    ? campaigns.reduce((sum, campaign) => sum + Number(campaign.rewardPool || 0), 0)
    : Number(user.earned || 0);

  return {
    id: user.id,
    accountType: "project",
    name: user.name,
    handle: user.handle,
    avatar: user.avatar,
    banner: user.banner,
    verified: user.projectVerificationStatus === "approved",
    verificationStatus: user.projectVerificationStatus || "unverified",
    description: user.bio,
    category: user.projectCategory || null,
    website: user.website || "",
    contract: user.wallet || null,
    ownerWallet: user.wallet || null,
    xHandle: user.xHandle || null,
    telegramUrl: user.telegramUrl || null,
    totalSponsored,
    activeChallenges,
    completedChallenges: 0,
  };
}

function projectApplicationRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    wallet: row.wallet_address || null,
    email: row.email || null,
    projectName: row.project_name,
    projectHandle: row.project_handle,
    tokenName: row.token_name,
    tokenTicker: row.token_ticker,
    tokenContract: row.token_contract,
    chain: row.chain,
    website: row.website,
    telegramUrl: row.telegram_url,
    discordUrl: row.discord_url,
    description: row.description,
    logo: row.logo,
    banner: row.banner,
    projectCategory: row.project_category || null,
    verificationNotes: row.verification_notes || "",
    xConnected: row.x_connected,
    xUserId: row.x_user_id ?? null,
    xHandle: row.x_handle ?? null,
    status: row.status || "draft",
    rejectionReason: row.rejection_reason || "",
    approvedProjectId: row.approved_project_id || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function filterSeedUsers(rows) {
  return rows.filter((row) => !seedUserIds.has(row.id));
}

function filterSeedCampaigns(rows) {
  return rows.filter((row) => !seedCampaignIds.has(row.id));
}

function filterSeedSubmissions(rows) {
  return rows.filter((row) => !seedSubmissionIds.has(row.id));
}

async function fetchBnbUsd() {
  if (Date.now() - bnbPriceCache.updatedAt < BNB_PRICE_TTL_MS) return bnbPriceCache;

  const sources = [
    {
      name: "binance",
      url: "https://api.binance.com/api/v3/ticker/price?symbol=BNBUSDT",
      parse: (body) => Number(body.price),
    },
    {
      name: "coingecko",
      url: "https://api.coingecko.com/api/v3/simple/price?ids=binancecoin&vs_currencies=usd",
      parse: (body) => Number(body?.binancecoin?.usd),
    },
  ];

  for (const source of sources) {
    try {
      const response = await fetch(source.url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(4_000),
      });
      if (!response.ok) continue;
      const price = source.parse(await response.json());
      if (Number.isFinite(price) && price > 0) {
        bnbPriceCache = { price, source: source.name, updatedAt: Date.now() };
        return bnbPriceCache;
      }
    } catch {
      /* try next source */
    }
  }

  return bnbPriceCache;
}

async function rpcCall(method, params) {
  let lastError = null;
  for (const rpcUrl of BNB_RPC_URLS) {
    try {
      const response = await fetch(rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: crypto.randomUUID(),
          method,
          params,
        }),
        signal: AbortSignal.timeout(6_000),
      });
      if (!response.ok) {
        lastError = new Error(`BNB RPC request failed with ${response.status}`);
        continue;
      }
      const body = await response.json();
      if (body.error) {
        lastError = new Error(body.error.message || "BNB RPC request failed.");
        continue;
      }
      return body.result;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error("BNB RPC request failed.");
}

function decodeAbiString(hexValue) {
  const hex = String(hexValue || "").replace(/^0x/, "");
  if (!hex) return "";
  if (hex.length >= 128) {
    const length = Number.parseInt(hex.slice(64, 128), 16);
    if (Number.isFinite(length) && length >= 0) {
      const bytes = hex.slice(128, 128 + length * 2);
      return Buffer.from(bytes, "hex").toString("utf8").replace(/\0+$/g, "");
    }
  }
  return Buffer.from(hex.replace(/(00)+$/g, ""), "hex").toString("utf8").replace(/\0+$/g, "");
}

function decodeAbiUint(hexValue) {
  const hex = String(hexValue || "").replace(/^0x/, "");
  if (!hex) return 0;
  return Number.parseInt(hex.slice(-64), 16);
}

async function fetchTokenMetadataFromChain(address) {
  if (!isAddress(address)) {
    throw new Error("Enter a valid BNB Chain token contract address.");
  }

  const code = await rpcCall("eth_getCode", [address, "latest"]);
  if (!code || code === "0x") {
    throw new Error("No token contract found at that address.");
  }

  const [nameHex, symbolHex, decimalsHex] = await Promise.all([
    rpcCall("eth_call", [{ to: address, data: "0x06fdde03" }, "latest"]),
    rpcCall("eth_call", [{ to: address, data: "0x95d89b41" }, "latest"]),
    rpcCall("eth_call", [{ to: address, data: "0x313ce567" }, "latest"]),
  ]);

  const name = decodeAbiString(nameHex);
  const symbol = decodeAbiString(symbolHex);
  const decimals = decodeAbiUint(decimalsHex);

  if (!name || !symbol || !Number.isFinite(decimals)) {
    throw new Error("Could not read token metadata from BNB Chain.");
  }

  return {
    name,
    symbol,
    decimals,
    address,
    chain: "BNB Smart Chain",
    source: "BNB RPC",
  };
}

async function fetchTokenMetadataFromDexscreener(address) {
  if (!isAddress(address)) {
    throw new Error("Enter a valid BNB Chain token contract address.");
  }

  const normalized = normalizeAddress(address);
  const response = await fetch(`https://api.dexscreener.com/token-pairs/v1/bsc/${normalized}`);
  if (!response.ok) {
    throw new Error(`Dexscreener lookup failed with ${response.status}.`);
  }
  const body = await response.json();
  const pairs = Array.isArray(body) ? body : Array.isArray(body?.pairs) ? body.pairs : [];
  const bscPairs = pairs.filter((entry) => String(entry?.chainId || "").toLowerCase() === "bsc");
  const rankedPairs = (bscPairs.length ? bscPairs : pairs)
    .filter((entry) => {
      const baseAddress = normalizeAddress(entry?.baseToken?.address || "");
      const quoteAddress = normalizeAddress(entry?.quoteToken?.address || "");
      return baseAddress === normalized || quoteAddress === normalized;
    })
    .sort((a, b) => Number(b?.liquidity?.usd || 0) - Number(a?.liquidity?.usd || 0));
  const pair = rankedPairs[0];
  const matchedToken = normalizeAddress(pair?.baseToken?.address || "") === normalized
    ? pair?.baseToken
    : normalizeAddress(pair?.quoteToken?.address || "") === normalized
      ? pair?.quoteToken
      : null;
  if (!matchedToken?.name || !matchedToken?.symbol || !matchedToken?.address) {
    throw new Error("Token not found on Dexscreener.");
  }
  const priceUsd = Number(pair?.priceUsd || 0);
  const liquidityUsd = Number(pair?.liquidity?.usd || 0);
  return {
    name: String(matchedToken.name),
    symbol: String(matchedToken.symbol),
    decimals: 18,
    address: normalizeAddress(String(matchedToken.address)),
    chain: "BNB Smart Chain",
    source: "Dexscreener",
    priceUsd: Number.isFinite(priceUsd) && priceUsd > 0 ? priceUsd : null,
    liquidityUsd: Number.isFinite(liquidityUsd) && liquidityUsd > 0 ? liquidityUsd : null,
    logoUrl: pair?.info?.imageUrl || pair?.info?.openGraph || null,
    pairAddress: pair?.pairAddress || null,
    dexUrl: pair?.url || null,
  };
}

async function getUserById(id) {
  const result = await query("select * from users where id = $1", [id]);
  return result.rows[0] ? userRow(result.rows[0]) : null;
}

async function getRewardWalletsByUser(userId) {
  const result = await query(
    "select * from reward_wallets where user_id = $1 order by is_primary desc, chain asc, created_at asc",
    [userId],
  );
  return result.rows.map(rewardWalletRow);
}

async function buildMePayload(userId) {
  const result = await query("select * from users where id = $1 limit 1", [userId]);
  if (!result.rows[0]) return null;
  const user = userRow(result.rows[0]);
  const rewardWallets = await getRewardWalletsByUser(user.id);
  const primaryWallet = rewardWallets.find((wallet) => wallet.isPrimary) || rewardWallets[0] || null;
  const joined = await query(
    `
    select c.* from campaigns c
    join campaign_members m on m.campaign_id = c.id
    where m.user_id = $1
    order by m.created_at desc
    limit 12
    `,
    [user.id],
  );
  const created = await query(
    "select * from campaigns where creator->>'id' = $1 order by created_at desc limit 12",
    [user.id],
  );
  const mySubmissions = await query(
    "select * from submissions where user_id = $1 order by submitted_at desc limit 12",
    [user.id],
  );
  return {
    ...user,
    wallet: primaryWallet?.address || user.wallet || null,
    rewardWallets,
    joinedCampaigns: joined.rows.map(campaignRow),
    createdCampaigns: created.rows.map(campaignRow),
    submissions: mySubmissions.rows.map((s) => ({
      id: s.id,
      challengeId: s.campaign_id,
      challengeTitle: s.challenge_title,
      cover: s.cover,
      user: s.user,
      link: s.link,
      type: s.type,
      status: s.status,
      submittedAt: s.submitted_at,
      reward: s.reward == null ? undefined : Number(s.reward),
    })),
  };
}

async function getUserByWallet(address, accountType = "user") {
  const normalized = normalizeAddress(address);
  if (!normalized) return null;
  const existing = await query(
    "select * from users where lower(wallet_address) = lower($1) and account_type = $2 limit 1",
    [normalized, accountType],
  );
  return existing.rows[0] ? userRow(existing.rows[0]) : null;
}

async function getUserByEmail(email, accountType = "user") {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;
  const existing = await query(
    "select * from users where lower(email) = lower($1) and account_type = $2 limit 1",
    [normalized, accountType],
  );
  return existing.rows[0] ? userRow(existing.rows[0]) : null;
}

async function getUserByEmailAny(email) {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;
  const existing = await query(
    "select * from users where lower(email) = lower($1) limit 1",
    [normalized],
  );
  return existing.rows[0] ? userRow(existing.rows[0]) : null;
}

async function getUserByXUserIdAny(xUserId) {
  if (!xUserId) return null;
  const existing = await query(
    "select * from users where x_user_id = $1 limit 1",
    [xUserId],
  );
  return existing.rows[0] ? userRow(existing.rows[0]) : null;
}

async function getProjectApplicationById(id) {
  const result = await query("select * from project_applications where id = $1 limit 1", [id]);
  return result.rows[0] ? projectApplicationRow(result.rows[0]) : null;
}

async function getProjectApplicationByWallet(address) {
  const normalized = normalizeAddress(address);
  if (!normalized) return null;
  const result = await query("select * from project_applications where lower(wallet_address) = lower($1) limit 1", [normalized]);
  return result.rows[0] ? projectApplicationRow(result.rows[0]) : null;
}

async function getProjectApplicationByEmail(email) {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;
  const result = await query("select * from project_applications where lower(email) = lower($1) limit 1", [normalized]);
  return result.rows[0] ? projectApplicationRow(result.rows[0]) : null;
}

async function getProjectApplicationByXUserId(xUserId) {
  if (!xUserId) return null;
  const result = await query("select * from project_applications where x_user_id = $1 limit 1", [xUserId]);
  return result.rows[0] ? projectApplicationRow(result.rows[0]) : null;
}

function accountTypeConflictMessage(accountType, identity = "email") {
  const label = identity === "x" ? "X account" : "email";
  return accountType === "project"
    ? `This ${label} is already used for a project account.`
    : `This ${label} is already used for a creator account.`;
}

async function assertEmailAvailableForAccountType(email, desiredAccountType, currentUserId = null) {
  const existingUser = await getUserByEmailAny(email);
  if (existingUser && existingUser.id !== currentUserId && existingUser.accountType !== desiredAccountType) {
    throw new Error(accountTypeConflictMessage(existingUser.accountType, "email"));
  }

  const existingApplication = await getProjectApplicationByEmail(email);
  if (existingApplication && desiredAccountType === "user") {
    throw new Error("This email is already used for a project account.");
  }
}

async function assertXAvailableForAccountType(xUserId, desiredAccountType) {
  const existingUser = await getUserByXUserIdAny(xUserId);
  if (existingUser && existingUser.accountType !== desiredAccountType) {
    throw new Error(accountTypeConflictMessage(existingUser.accountType, "x"));
  }

  const existingApplication = await getProjectApplicationByXUserId(xUserId);
  if (existingApplication && desiredAccountType === "user") {
    throw new Error("This X account is already used for a project account.");
  }
}

async function assertXLinkAvailableForUser(user, xUserId) {
  const existingUser = await getUserByXUserIdAny(xUserId);
  if (existingUser && existingUser.id !== user.id) {
    throw new Error(accountTypeConflictMessage(existingUser.accountType, "x"));
  }

  const existingApplication = await getProjectApplicationByXUserId(xUserId);
  if (existingApplication && user.accountType !== "project") {
    throw new Error("This X account is already used for a project account.");
  }
  if (
    existingApplication
    && user.accountType === "project"
    && existingApplication.approvedProjectId !== user.id
  ) {
    throw new Error("This X account is already used for a project account.");
  }
}

async function assertXAvailableForProjectApplication(applicationId, xUserId) {
  const existingUser = await getUserByXUserIdAny(xUserId);
  if (existingUser?.accountType === "user") {
    throw new Error("This X account is already used for a creator account.");
  }
  if (existingUser?.accountType === "project") {
    throw new Error("This X account is already used for a project account.");
  }

  const existingApplication = await getProjectApplicationByXUserId(xUserId);
  if (existingApplication && existingApplication.id !== applicationId) {
    throw new Error("This X account is already used for a project account.");
  }
}

async function createDraftProjectApplication({ address = "", email = "", xConnected = false, xUserId = null, xHandle = null } = {}) {
  const normalizedAddress = normalizeAddress(address);
  const normalizedEmail = normalizeEmail(email);
  const existing = normalizedAddress
    ? await getProjectApplicationByWallet(normalizedAddress)
    : normalizedEmail
      ? await getProjectApplicationByEmail(normalizedEmail)
      : null;
  if (existing) return existing;
  const inserted = await query(
    `
    insert into project_applications (id, wallet_address, email, chain, x_connected, x_user_id, x_handle)
    values ($1,$2,$3,'BNB Chain',$4,$5,$6)
    returning *
    `,
    [crypto.randomUUID(), normalizedAddress || null, normalizedEmail, xConnected, xUserId, xHandle],
  );
  return projectApplicationRow(inserted.rows[0]);
}

async function updateProjectApplication(applicationId, patch) {
  const current = await query("select * from project_applications where id = $1 limit 1", [applicationId]);
  if (!current.rows[0]) return null;
  const row = current.rows[0];
  const next = {
    projectName: typeof patch.projectName === "string" ? patch.projectName.trim() : row.project_name,
    projectHandle: typeof patch.projectHandle === "string" ? sanitizeHandle(patch.projectHandle) : row.project_handle,
    tokenName: typeof patch.tokenName === "string" ? patch.tokenName.trim() : row.token_name,
    tokenTicker: typeof patch.tokenTicker === "string" ? patch.tokenTicker.trim().toUpperCase() : row.token_ticker,
    tokenContract: typeof patch.tokenContract === "string" ? patch.tokenContract.trim() : row.token_contract,
    chain: typeof patch.chain === "string" ? patch.chain.trim() : row.chain,
    website: typeof patch.website === "string" ? patch.website.trim() : row.website,
    telegramUrl: typeof patch.telegramUrl === "string" ? patch.telegramUrl.trim() : row.telegram_url,
    discordUrl: typeof patch.discordUrl === "string" ? patch.discordUrl.trim() : row.discord_url,
    description: typeof patch.description === "string" ? patch.description.trim() : row.description,
    logo: typeof patch.logo === "string" ? patch.logo.trim() : row.logo,
    banner: typeof patch.banner === "string" ? patch.banner.trim() : row.banner,
    projectCategory: typeof patch.projectCategory === "string" && patch.projectCategory.trim() ? patch.projectCategory.trim() : row.project_category,
    verificationNotes: typeof patch.verificationNotes === "string" ? patch.verificationNotes.trim() : row.verification_notes,
    rejectionReason: typeof patch.rejectionReason === "string" ? patch.rejectionReason.trim() : row.rejection_reason,
    status: typeof patch.status === "string" && patch.status.trim() ? patch.status.trim() : row.status,
    xConnected: typeof patch.xConnected === "boolean" ? patch.xConnected : row.x_connected,
    xUserId: typeof patch.xUserId === "string" ? patch.xUserId : row.x_user_id,
    xHandle: typeof patch.xHandle === "string" ? patch.xHandle : row.x_handle,
    approvedProjectId: typeof patch.approvedProjectId === "string" ? patch.approvedProjectId : row.approved_project_id,
  };
  const updated = await query(
    `
    update project_applications
    set project_name = $2,
        project_handle = $3,
        token_name = $4,
        token_ticker = $5,
        token_contract = $6,
        chain = $7,
        website = $8,
        telegram_url = $9,
        discord_url = $10,
        description = $11,
        logo = $12,
        banner = $13,
        project_category = $14,
        verification_notes = $15,
        rejection_reason = $16,
        status = $17,
        x_connected = $18,
        x_user_id = $19,
        x_handle = $20,
        approved_project_id = $21,
        updated_at = now()
    where id = $1
    returning *
    `,
    [
      applicationId,
      next.projectName,
      next.projectHandle,
      next.tokenName,
      next.tokenTicker,
      next.tokenContract,
      next.chain,
      next.website,
      next.telegramUrl,
      next.discordUrl,
      next.description,
      next.logo,
      next.banner,
      next.projectCategory,
      next.verificationNotes,
      next.rejectionReason,
      next.status,
      next.xConnected,
      next.xUserId,
      next.xHandle,
      next.approvedProjectId,
    ],
  );
  return updated.rows[0] ? projectApplicationRow(updated.rows[0]) : null;
}

async function sendEmailOtp(email, code, accountType) {
  if (!RESEND_API_KEY || !EMAIL_FROM) {
    throw new Error("Email authentication is not configured yet.");
  }

  const audience = accountType === "project" ? "project" : "creator";
  const subject = `${APP_NAME} verification code`;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#111827">
      <h2 style="margin:0 0 12px;font-size:22px;">Your ${APP_NAME} verification code</h2>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">
        Use the code below to continue as a ${audience}. This code expires in ${OTP_EXPIRY_MINUTES} minutes.
      </p>
      <div style="margin:0 0 20px;padding:16px 20px;border-radius:16px;background:#0b0b12;color:#facc15;font-size:32px;font-weight:700;letter-spacing:8px;text-align:center;">
        ${code}
      </div>
      <p style="margin:0;font-size:13px;line-height:1.6;color:#6b7280;">
        If you did not request this code, you can ignore this email.
      </p>
    </div>
  `;
  const textBody = `Your ${APP_NAME} verification code is ${code}. It expires in ${OTP_EXPIRY_MINUTES} minutes.`;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: [email],
      subject,
      html,
      text: textBody,
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Email provider failed: ${message || response.statusText}`);
  }
}

async function createEmailOtp(email, accountType) {
  const normalizedEmail = normalizeEmail(email);
  const latest = await query(
    `
    select * from email_auth_codes
    where lower(email) = lower($1)
      and account_type = $2
      and used_at is null
    order by created_at desc
    limit 1
    `,
    [normalizedEmail, accountType],
  );
  const current = latest.rows[0];
  if (current?.last_sent_at && (Date.now() - new Date(current.last_sent_at).getTime()) < OTP_RESEND_COOLDOWN_SECONDS * 1000) {
    const secondsLeft = Math.max(1, OTP_RESEND_COOLDOWN_SECONDS - Math.floor((Date.now() - new Date(current.last_sent_at).getTime()) / 1000));
    throw new Error(`Please wait ${secondsLeft}s before requesting another code.`);
  }

  const code = generateOtpCode();
  const codeHash = otpHash(normalizedEmail, accountType, code);
  await query(
    `
    update email_auth_codes
    set used_at = now()
    where lower(email) = lower($1)
      and account_type = $2
      and used_at is null
    `,
    [normalizedEmail, accountType],
  );
  const inserted = await query(
    `
    insert into email_auth_codes (
      id, email, account_type, code_hash, expires_at, used_at, attempt_count, send_count, last_sent_at
    )
    values ($1,$2,$3,$4, now() + interval '${OTP_EXPIRY_MINUTES} minutes', null, 0, 1, now())
    returning *
    `,
    [crypto.randomUUID(), normalizedEmail, accountType, codeHash],
  );
  await sendEmailOtp(normalizedEmail, code, accountType);
  return inserted.rows[0];
}

async function verifyEmailOtp(email, accountType, code) {
  const normalizedEmail = normalizeEmail(email);
  const current = await query(
    `
    select * from email_auth_codes
    where lower(email) = lower($1)
      and account_type = $2
      and used_at is null
    order by created_at desc
    limit 1
    `,
    [normalizedEmail, accountType],
  );
  const row = current.rows[0];
  if (!row) {
    throw new Error("Request a new verification code and try again.");
  }
  if (new Date(row.expires_at).getTime() < Date.now()) {
    await query("update email_auth_codes set used_at = now() where id = $1", [row.id]);
    throw new Error("That verification code has expired. Request a new one.");
  }
  if (Number(row.attempt_count || 0) >= OTP_MAX_ATTEMPTS) {
    await query("update email_auth_codes set used_at = now() where id = $1", [row.id]);
    throw new Error("Too many incorrect attempts. Request a new code.");
  }
  const expectedHash = otpHash(normalizedEmail, accountType, code);
  if (expectedHash !== row.code_hash) {
    await query(
      `
      update email_auth_codes
      set attempt_count = attempt_count + 1,
          used_at = case when attempt_count + 1 >= $2 then now() else used_at end
      where id = $1
      `,
      [row.id, OTP_MAX_ATTEMPTS],
    );
    throw new Error("That verification code is incorrect.");
  }
  await query("update email_auth_codes set used_at = now() where id = $1", [row.id]);
  return row;
}

async function sessionHeadersForUser(user) {
  const sessionId = crypto.randomUUID();
  const exp = Math.floor((Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000) / 1000);
  const token = signJwt({ sub: user.id, sid: sessionId, iat: Math.floor(Date.now() / 1000), exp });
  await query("insert into sessions (id, user_id, expires_at) values ($1,$2,to_timestamp($3))", [sessionId, user.id, exp]);
  return {
    headers: { "Set-Cookie": [sessionCookie(token), clearCookie(PROJECT_APP_COOKIE_NAME)] },
    expiresAt: new Date(exp * 1000).toISOString(),
    token,
  };
}

async function createSession(res, user) {
  const session = await sessionHeadersForUser(user);
  return json(
    res,
    200,
    { user: await buildMePayload(user.id) ?? user, session: { expiresAt: session.expiresAt, token: session.token } },
    session.headers,
  );
}

function projectApplicationSessionHeaders(applicationId) {
  const exp = Math.floor((Date.now() + PROJECT_APPLICATION_DAYS * 24 * 60 * 60 * 1000) / 1000);
  const token = signJwt({ aid: applicationId, iat: Math.floor(Date.now() / 1000), exp });
  return { headers: { "Set-Cookie": projectApplicationCookie(token) }, token };
}

async function createProjectApplicationFromLegacyProjectUser(user) {
  const existing = await getProjectApplicationByWallet(user.wallet);
  if (existing) return existing;
  const inserted = await query(
    `
    insert into project_applications (
      id, wallet_address, email, project_name, project_handle, website, telegram_url, description, logo, banner,
      project_category, x_connected, x_user_id, x_handle, status, rejection_reason, approved_project_id, chain
    )
    values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'',$16,'BNB Chain')
    returning *
    `,
    [
      crypto.randomUUID(),
      normalizeAddress(user.wallet),
      normalizeEmail(user.email || ""),
      user.name,
      user.handle,
      user.website || "",
      user.telegramUrl || "",
      user.bio || "",
      user.avatar || "",
      user.banner || "",
      user.projectCategory || null,
      !!user.xConnected,
      user.xUserId || null,
      user.xHandle || null,
      user.projectVerificationStatus === "approved" ? "approved" : user.projectVerificationStatus || "draft",
      user.projectVerificationStatus === "approved" ? user.id : null,
    ],
  );
  return projectApplicationRow(inserted.rows[0]);
}

async function upsertWalletUser(address) {
  const normalized = normalizeAddress(address);
  const existing = await getUserByWallet(normalized, "user");
  if (existing) return existing;
  const suffix = normalized.slice(-6);
  const id = crypto.randomUUID();
  const handle = sanitizeHandle(`user${suffix}`);
  const displayName = `Moonshill ${suffix.toUpperCase()}`;
  const avatar = `https://api.dicebear.com/9.x/glass/svg?seed=${encodeURIComponent(normalized)}&backgroundType=gradientLinear`;
  const banner = `https://images.unsplash.com/photo-1614851099511-773084f6911d?auto=format&fit=crop&w=1400&q=80`;
  const inserted = await query(
    `
    insert into users (id, wallet_address, display_name, handle, avatar, banner, bio, project_verification_status, x_connected, joined, created, wins, earned, is_admin)
    values ($1,$2,$3,$4,$5,$6,$7,'unverified',false,0,0,0,0,false)
    returning *
    `,
    [id, normalized, displayName, handle, avatar, banner, "New Moonshill wallet. Add your bio from Profile.",],
  );
  return userRow(inserted.rows[0]);
}

async function upsertEmailUser(email) {
  const normalized = normalizeEmail(email);
  await assertEmailAvailableForAccountType(normalized, "user");
  const existing = await getUserByEmail(normalized, "user");
  if (existing) return existing;
  const id = crypto.randomUUID();
  const localPart = normalized.split("@")[0] || "creator";
  const baseHandle = sanitizeHandle(localPart) || `user${id.slice(0, 6)}`;
  let nextHandle = baseHandle;
  let suffix = 1;
  while (true) {
    const taken = await query("select id from users where lower(handle) = lower($1) limit 1", [nextHandle]);
    if (!taken.rows[0]) break;
    nextHandle = sanitizeHandle(`${baseHandle}${suffix}`) || `${baseHandle}${suffix}`;
    suffix += 1;
  }
  const avatar = `https://api.dicebear.com/9.x/glass/svg?seed=${encodeURIComponent(normalized)}&backgroundType=gradientLinear`;
  const banner = `https://images.unsplash.com/photo-1614851099511-773084f6911d?auto=format&fit=crop&w=1400&q=80`;
  const inserted = await query(
    `
    insert into users (id, email, display_name, handle, auth_provider, avatar, banner, bio, project_verification_status, x_connected, joined, created, wins, earned, is_admin)
    values ($1,$2,$3,$4,'email',$5,$6,$7,'unverified',false,0,0,0,0,false)
    returning *
    `,
    [id, normalized, localPart, nextHandle, avatar, banner, "New Moonshill creator. Add your bio from Profile."],
  );
  return userRow(inserted.rows[0]);
}

async function upsertXUser({ xUserId, xHandle }) {
  await assertXAvailableForAccountType(xUserId, "user");
  const byX = await query(
    "select * from users where account_type = 'user' and x_user_id = $1 limit 1",
    [xUserId],
  );
  if (byX.rows[0]) return userRow(byX.rows[0]);
  const baseHandle = sanitizeHandle(xHandle || `user${String(xUserId || "").slice(-6)}`) || `user${String(xUserId || "").slice(-6)}`;
  let nextHandle = baseHandle;
  let suffix = 1;
  while (true) {
    const taken = await query("select id from users where lower(handle) = lower($1) limit 1", [nextHandle]);
    if (!taken.rows[0]) break;
    nextHandle = sanitizeHandle(`${baseHandle}${suffix}`) || `${baseHandle}${suffix}`;
    suffix += 1;
  }
  const inserted = await query(
    `
    insert into users (id, email, display_name, handle, auth_provider, avatar, banner, bio, project_verification_status, x_connected, x_user_id, x_handle, joined, created, wins, earned, is_admin)
    values ($1,'',$2,$3,'x',$4,$5,$6,'unverified',true,$7,$8,0,0,0,0,false)
    returning *
    `,
    [
      crypto.randomUUID(),
      xHandle || "Moonshill creator",
      nextHandle,
      `https://api.dicebear.com/9.x/glass/svg?seed=${encodeURIComponent(xHandle || xUserId)}&backgroundType=gradientLinear`,
      `https://images.unsplash.com/photo-1614851099511-773084f6911d?auto=format&fit=crop&w=1400&q=80`,
      "New Moonshill creator. Add your bio from Profile.",
      xUserId,
      xHandle || null,
    ],
  );
  return userRow(inserted.rows[0]);
}

async function authUserFromRequest(req) {
  const cookies = parseCookies(req);
  const token = cookies[COOKIE_NAME] || String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const payload = verifyJwt(token);
  if (!payload?.sub || !payload?.sid) return null;
  const session = await query(
    "select * from sessions where id = $1 and revoked_at is null and expires_at > now() limit 1",
    [payload.sid],
  );
  if (!session.rows[0]) return null;
  const user = await getUserById(payload.sub);
  return user;
}

async function authProjectApplicationFromRequest(req) {
  const cookies = parseCookies(req);
  const token = cookies[PROJECT_APP_COOKIE_NAME] || String(req.headers["x-project-application"] || "");
  if (!token) return null;
  const payload = verifyJwt(token);
  if (!payload?.aid) return null;
  return getProjectApplicationById(payload.aid);
}

async function requireUser(req, res) {
  const user = await authUserFromRequest(req);
  if (!user) {
    json(res, 401, { error: "Authentication required." });
    return null;
  }
  return user;
}

async function requireProjectApplication(req, res) {
  const application = await authProjectApplicationFromRequest(req);
  if (!application) {
    json(res, 401, { error: "Project application session required." });
    return null;
  }
  return application;
}

async function revokeSessionsByUser(userId) {
  await query("update sessions set revoked_at = now() where user_id = $1 and revoked_at is null", [userId]);
}

async function handleWalletChallenge(req, res, url) {
  const address = normalizeAddress(url.searchParams.get("address") || "");
  if (!address) return json(res, 400, { error: "Wallet address is required." });
  const nonce = crypto.randomBytes(16).toString("hex");
  const message = `${APP_NAME} wallet login\n\nAddress: ${address}\nNonce: ${nonce}\nIssued At: ${nowIso()}`;
  await query(
    `
    insert into wallet_challenges (address, nonce, message, expires_at)
    values ($1,$2,$3, now() + interval '15 minutes')
    on conflict (address) do update set nonce = excluded.nonce, message = excluded.message, expires_at = excluded.expires_at
    `,
    [address, nonce, message],
  );
  json(res, 200, { address, nonce, message, expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString() });
}

async function handleWalletVerify(req, res) {
  const body = await readBody(req);
  const address = normalizeAddress(body.address);
  const signature = String(body.signature || "");
  if (!address || !signature) {
    return json(res, 400, { error: "Address and signature are required." });
  }
  const challenge = await query("select * from wallet_challenges where lower(address) = lower($1) and expires_at > now() limit 1", [address]);
  if (!challenge.rows[0]) {
    return json(res, 400, { error: "Request a fresh login message and try again." });
  }
  let recovered;
  try {
    recovered = normalizeAddress(verifyMessage(challenge.rows[0].message, signature));
  } catch {
    return json(res, 400, { error: "Signature verification failed." });
  }
  if (recovered !== address) {
    return json(res, 401, { error: "Signature does not match the requested wallet." });
  }

  const user = await upsertWalletUser(address);
  await query("delete from wallet_challenges where lower(address) = lower($1)", [address]);
  return createSession(res, user);
}

async function handleEmailAuthStart(req, res) {
  const body = await readBody(req);
  const email = normalizeEmail(body.email);
  const accountType = String(body.accountType || "user").trim() === "project" ? "project" : "user";
  if (!isValidEmail(email)) {
    return json(res, 400, { error: "Enter a valid email address." });
  }
  try {
    await assertEmailAvailableForAccountType(email, accountType);
    const otp = await createEmailOtp(email, accountType);
    return json(res, 200, {
      ok: true,
      email,
      accountType,
      expiresAt: otp.expires_at,
      resendAfterSeconds: OTP_RESEND_COOLDOWN_SECONDS,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not send verification code.";
    const status = /wait \d+s/i.test(message) ? 429 : /not configured/i.test(message) ? 501 : 502;
    return json(res, status, { error: message });
  }
}

async function completeEmailAuth(res, email, accountType) {
  await assertEmailAvailableForAccountType(email, accountType);
  if (accountType === "project") {
    const approvedProject = await getUserByEmail(email, "project");
    if (approvedProject?.projectVerificationStatus === "approved") {
      return createSession(res, approvedProject);
    }
    let application = await getProjectApplicationByEmail(email);
    if (!application) {
      application = await createDraftProjectApplication({ email });
    }
    const projectSession = projectApplicationSessionHeaders(application.id);
    return json(
      res,
      200,
      { application, status: application.status, projectApplicationToken: projectSession.token },
      projectSession.headers,
    );
  }

  const user = await upsertEmailUser(email);
  return createSession(res, user);
}

async function handleEmailAuthVerify(req, res) {
  const body = await readBody(req);
  const email = normalizeEmail(body.email);
  const code = String(body.code || "").trim();
  const accountType = String(body.accountType || "user").trim() === "project" ? "project" : "user";
  if (!isValidEmail(email)) {
    return json(res, 400, { error: "Enter a valid email address." });
  }
  if (!/^\d{6}$/.test(code)) {
    return json(res, 400, { error: "Enter the 6-digit verification code." });
  }
  try {
    await verifyEmailOtp(email, accountType, code);
    return completeEmailAuth(res, email, accountType);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not verify code.";
    return json(res, 400, { error: message });
  }
}

async function handleEmailAuthResend(req, res) {
  const body = await readBody(req);
  const email = normalizeEmail(body.email);
  const accountType = String(body.accountType || "user").trim() === "project" ? "project" : "user";
  if (!isValidEmail(email)) {
    return json(res, 400, { error: "Enter a valid email address." });
  }
  try {
    const otp = await createEmailOtp(email, accountType);
    return json(res, 200, {
      ok: true,
      email,
      accountType,
      expiresAt: otp.expires_at,
      resendAfterSeconds: OTP_RESEND_COOLDOWN_SECONDS,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not resend verification code.";
    const status = /wait \d+s/i.test(message) ? 429 : /not configured/i.test(message) ? 501 : 502;
    return json(res, status, { error: message });
  }
}

async function handleMeGet(req, res) {
  const user = await requireUser(req, res);
  if (!user) return;
  json(res, 200, await buildMePayload(user.id));
}

async function handleMePatch(req, res) {
  const user = await requireUser(req, res);
  if (!user) return;
  const body = await readBody(req);
  const displayName = typeof body.name === "string" ? body.name.trim() : user.name;
  const bio = typeof body.bio === "string" ? body.bio.trim() : user.bio;
  const avatar = typeof body.avatar === "string" && body.avatar.trim() ? body.avatar.trim() : user.avatar;
  const banner = typeof body.banner === "string" && body.banner.trim() ? body.banner.trim() : user.banner;
  const nextHandle = typeof body.handle === "string" && body.handle.trim()
    ? sanitizeHandle(body.handle)
    : user.handle;
  const nextEmail = typeof body.email === "string" ? normalizeEmail(body.email) : (user.email || "");
  const website = typeof body.website === "string" ? body.website.trim() : user.website || "";
  const projectCategory = typeof body.projectCategory === "string" && body.projectCategory.trim()
    ? body.projectCategory.trim()
    : user.projectCategory || null;
  const telegramUrl = typeof body.telegramUrl === "string" ? body.telegramUrl.trim() : user.telegramUrl || "";

  if (!nextHandle) {
    return json(res, 400, { error: "A valid handle is required." });
  }
  if (nextEmail && !isValidEmail(nextEmail)) {
    return json(res, 400, { error: "Enter a valid email address." });
  }

  const taken = await query(
    "select id from users where lower(handle) = lower($1) and id <> $2 limit 1",
    [nextHandle, user.id],
  );
  if (taken.rows[0]) {
    return json(res, 409, { error: "That handle is already in use." });
  }
  if (nextEmail) {
    const emailTaken = await query(
      "select id from users where lower(email) = lower($1) and id <> $2 and account_type = $3 limit 1",
      [nextEmail, user.id, user.accountType],
    );
    if (emailTaken.rows[0]) {
      return json(res, 409, { error: "That email is already in use." });
    }
    try {
      await assertEmailAvailableForAccountType(nextEmail, user.accountType, user.id);
    } catch (error) {
      return json(res, 409, { error: error instanceof Error ? error.message : "That email is already in use." });
    }
  }

  const updated = await query(
    `
    update users
    set display_name = $2,
        bio = $3,
        avatar = $4,
        banner = $5,
        handle = $6,
        email = $7,
        website = $8,
        project_category = $9,
        telegram_url = $10,
        updated_at = now()
    where id = $1
    returning *
    `,
    [user.id, displayName, bio, avatar, banner, nextHandle, nextEmail, website, projectCategory, telegramUrl],
  );
  json(res, 200, { user: userRow(updated.rows[0]) });
}

async function handleMeWalletsPatch(req, res) {
  const user = await requireUser(req, res);
  if (!user) return;
  const body = await readBody(req);
  const wallets = Array.isArray(body.wallets) ? body.wallets : [];
  const normalized = wallets
    .map((wallet) => ({
      chain: String(wallet.chain || "").trim(),
      address: String(wallet.address || "").trim(),
      isPrimary: Boolean(wallet.isPrimary),
    }))
    .filter((wallet) => wallet.chain && wallet.address);

  const validChains = new Set(["BNB", "Ethereum/Base", "Solana", "TON"]);
  for (const wallet of normalized) {
    if (!validChains.has(wallet.chain)) {
      return json(res, 400, { error: `Unsupported reward wallet chain: ${wallet.chain}` });
    }
  }

  await query("delete from reward_wallets where user_id = $1", [user.id]);
  let primaryAddress = null;
  for (let index = 0; index < normalized.length; index += 1) {
    const wallet = normalized[index];
    const isPrimary = wallet.isPrimary || (!primaryAddress && index === 0);
    if (isPrimary) primaryAddress = wallet.address;
    await query(
      `
      insert into reward_wallets (id, user_id, chain, wallet_address, is_primary)
      values ($1,$2,$3,$4,$5)
      `,
      [crypto.randomUUID(), user.id, wallet.chain, wallet.address, isPrimary],
    );
  }

  await query(
    "update users set wallet_address = $2, updated_at = now() where id = $1",
    [user.id, primaryAddress],
  );
  const nextWallets = await getRewardWalletsByUser(user.id);
  return json(res, 200, {
    wallets: nextWallets,
    primaryWallet: primaryAddress,
  });
}

async function handleProjectAccountStart(req, res) {
  return json(res, 410, { error: "Project onboarding now uses project applications. Start from /build instead of upgrading a creator account." });
}

async function handleProjectAccountActivate(req, res) {
  return json(res, 410, { error: "Project account activation now happens only after admin approval of a project application." });
}

async function handleProjectVerificationRequest(req, res) {
  return json(res, 410, { error: "Project verification now happens through project application submission on /build." });
}

async function handleProjectWalletVerify(req, res) {
  const body = await readBody(req);
  const address = normalizeAddress(body.address);
  const signature = String(body.signature || "");
  if (!address || !signature) {
    return json(res, 400, { error: "Address and signature are required." });
  }
  const challenge = await query("select * from wallet_challenges where lower(address) = lower($1) and expires_at > now() limit 1", [address]);
  if (!challenge.rows[0]) {
    return json(res, 400, { error: "Request a fresh login message and try again." });
  }
  let recovered;
  try {
    recovered = normalizeAddress(verifyMessage(challenge.rows[0].message, signature));
  } catch {
    return json(res, 400, { error: "Signature verification failed." });
  }
  if (recovered !== address) {
    return json(res, 401, { error: "Signature does not match the requested wallet." });
  }
  await query("delete from wallet_challenges where lower(address) = lower($1)", [address]);

  const approvedProject = await getUserByWallet(address, "project");
  if (approvedProject?.projectVerificationStatus === "approved") {
    return createSession(res, approvedProject);
  }

  let application = await getProjectApplicationByWallet(address);
  if (!application) {
    const legacyProject = await getUserByWallet(address, "project");
    if (legacyProject && legacyProject.projectVerificationStatus !== "approved") {
      application = await createProjectApplicationFromLegacyProjectUser(legacyProject);
    }
  }
  if (!application) {
    application = await createDraftProjectApplication(address);
  }
  return json(
    res,
    200,
    { application, status: application.status },
    projectApplicationSessionHeaders(application.id).headers,
  );
}

async function handleProjectApplicationGet(req, res) {
  const application = await requireProjectApplication(req, res);
  if (!application) return;
  return json(res, 200, { application });
}

async function handleProjectApplicationPatch(req, res) {
  const application = await requireProjectApplication(req, res);
  if (!application) return;
  if (application.status === "pending") {
    return json(res, 400, { error: "Pending applications cannot be edited until review is complete." });
  }
  const body = await readBody(req);
  const updated = await updateProjectApplication(application.id, {
    projectName: body.projectName,
    projectHandle: body.projectHandle,
    tokenName: body.tokenName,
    tokenTicker: body.tokenTicker,
    tokenContract: body.tokenContract,
    chain: body.chain,
    website: body.website,
    telegramUrl: body.telegramUrl,
    discordUrl: body.discordUrl,
    description: body.description,
    logo: body.logo,
    banner: body.banner,
    projectCategory: body.projectCategory,
    verificationNotes: body.verificationNotes,
    status: application.status === "rejected" ? "draft" : application.status,
  });
  return json(res, 200, { application: updated }, projectApplicationSessionHeaders(application.id).headers);
}

async function handleProjectApplicationSubmit(req, res) {
  const application = await requireProjectApplication(req, res);
  if (!application) return;
  const latest = await getProjectApplicationById(application.id);
  if (!latest) return json(res, 404, { error: "Project application not found." });

  const requiredFields = [
    ["project name", latest.projectName],
    ["chain", latest.chain],
    ["description", latest.description],
  ];
  const missing = requiredFields.filter(([, value]) => !String(value || "").trim()).map(([label]) => label);
  if (missing.length) {
    return json(res, 400, { error: `Complete all required project fields before submitting: ${missing.join(", ")}.` });
  }
  if (!latest.xConnected || !latest.xHandle) {
    return json(res, 400, { error: "Connect your X account before submitting your project application." });
  }

  const preferredHandle = sanitizeHandle(latest.projectHandle || latest.projectName);
  if (!preferredHandle) {
    return json(res, 400, { error: "A valid project handle could not be generated from the project name." });
  }

  const updated = await updateProjectApplication(application.id, {
    projectHandle: preferredHandle,
    status: "pending",
    rejectionReason: "",
  });
  return json(res, 200, { application: updated }, projectApplicationSessionHeaders(application.id).headers);
}

async function handleProjectXStart(req, res, url) {
  const application = await requireProjectApplication(req, res);
  if (!application) return;
  if (xConfigMissing()) {
    return json(res, 501, { error: "X connection not configured yet." });
  }
  const state = crypto.randomUUID();
  const codeVerifier = crypto.randomBytes(32).toString("base64url");
  const challenge = crypto.createHash("sha256").update(codeVerifier).digest("base64url");
  const redirectTo = resolveClientRedirect(url.searchParams.get("returnTo"), "/build?x=connect");
  await query(
    `
    insert into project_x_oauth_states (state, project_application_id, code_verifier, redirect_to, expires_at)
    values ($1,$2,$3,$4, now() + interval '15 minutes')
    on conflict (state) do update set project_application_id = excluded.project_application_id, code_verifier = excluded.code_verifier, redirect_to = excluded.redirect_to, expires_at = excluded.expires_at
    `,
    [state, application.id, codeVerifier, redirectTo],
  );
  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.X_CLIENT_ID,
    redirect_uri: process.env.X_CALLBACK_URL,
    scope: "tweet.read users.read offline.access",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  });
  const redirectUrl = `${X_AUTHORIZE_URL}?${params.toString()}`;
  return json(res, 200, { redirectUrl });
}

async function handleLogout(req, res) {
  const user = await authUserFromRequest(req);
  if (user) {
    await revokeSessionsByUser(user.id);
  }
  json(
    res,
    200,
    { ok: true },
    { "Set-Cookie": [clearCookie(COOKIE_NAME), clearCookie(PROJECT_APP_COOKIE_NAME)] },
  );
}

function xConfigMissing() {
  return !process.env.X_CLIENT_ID || !process.env.X_CLIENT_SECRET || !process.env.X_CALLBACK_URL;
}

async function handleXStart(req, res, url) {
  const user = await requireUser(req, res);
  if (!user) return;
  if (xConfigMissing()) {
    return json(res, 501, { error: "X connection not configured yet." });
  }
  const state = crypto.randomUUID();
  const codeVerifier = crypto.randomBytes(32).toString("base64url");
  const challenge = crypto.createHash("sha256").update(codeVerifier).digest("base64url");
  const redirectTo = resolveClientRedirect(url.searchParams.get("returnTo"), "/profile?x=connect");
  await query(
    `
    insert into x_oauth_states (state, user_id, code_verifier, redirect_to, expires_at)
    values ($1,$2,$3,$4, now() + interval '15 minutes')
    on conflict (state) do update set user_id = excluded.user_id, code_verifier = excluded.code_verifier, redirect_to = excluded.redirect_to, expires_at = excluded.expires_at
    `,
    [state, user.id, codeVerifier, redirectTo],
  );
  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.X_CLIENT_ID,
    redirect_uri: process.env.X_CALLBACK_URL,
    scope: "tweet.read users.read offline.access",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  });
  const redirectUrl = `${X_AUTHORIZE_URL}?${params.toString()}`;
  if (url.searchParams.get("format") === "json") {
    return json(res, 200, { redirectUrl });
  }
  redirect(res, redirectUrl);
}

async function handleXLoginStart(req, res, url) {
  if (xConfigMissing()) {
    return json(res, 501, { error: "X connection not configured yet." });
  }
  const accountType = String(url.searchParams.get("accountType") || "user").trim() === "project" ? "project" : "user";
  const state = crypto.randomUUID();
  const codeVerifier = crypto.randomBytes(32).toString("base64url");
  const challenge = crypto.createHash("sha256").update(codeVerifier).digest("base64url");
  const redirectTo = resolveClientRedirect(
    url.searchParams.get("returnTo"),
    accountType === "project" ? "/build" : "/home",
  );
  await query(
    `
    insert into auth_x_oauth_states (state, account_type, code_verifier, redirect_to, expires_at)
    values ($1,$2,$3,$4, now() + interval '15 minutes')
    on conflict (state) do update set account_type = excluded.account_type, code_verifier = excluded.code_verifier, redirect_to = excluded.redirect_to, expires_at = excluded.expires_at
    `,
    [state, accountType, codeVerifier, redirectTo],
  );
  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.X_CLIENT_ID,
    redirect_uri: process.env.X_CALLBACK_URL,
    scope: "tweet.read users.read offline.access",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  });
  return json(res, 200, { redirectUrl: `${X_AUTHORIZE_URL}?${params.toString()}` });
}

async function exchangeXCode(code, codeVerifier) {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: process.env.X_CALLBACK_URL,
    client_id: process.env.X_CLIENT_ID,
    code_verifier: codeVerifier,
  });
  const auth = Buffer.from(`${process.env.X_CLIENT_ID}:${process.env.X_CLIENT_SECRET}`).toString("base64");
  const response = await fetch(X_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  if (!response.ok) {
    throw new Error(`X token exchange failed with ${response.status}`);
  }
  return response.json();
}

async function handleXCallback(req, res, url) {
  if (xConfigMissing()) {
    return redirect(res, `${CLIENT_ORIGIN}/profile?x=not-configured`);
  }
  const state = String(url.searchParams.get("state") || "");
  const code = String(url.searchParams.get("code") || "");
  const error = url.searchParams.get("error");
  const errorDesc = url.searchParams.get("error_description");
  const loginState = await query("select * from auth_x_oauth_states where state = $1 and expires_at > now() limit 1", [state]);
  if (loginState.rows[0]) {
    return handleXLoginCallback(req, res, url, loginState.rows[0]);
  }
  const stateRow = await query("select * from x_oauth_states where state = $1 and expires_at > now() limit 1", [state]);
  if (!stateRow.rows[0]) {
    const projectState = await query("select * from project_x_oauth_states where state = $1 and expires_at > now() limit 1", [state]);
    if (projectState.rows[0]) {
      return handleProjectXCallback(req, res, url);
    }
  }
  if (!stateRow.rows[0]) {
    return redirect(res, `${CLIENT_ORIGIN}/profile?x=invalid-state`);
  }
  const redirectTo = resolveClientRedirect(stateRow.rows[0].redirect_to, "/profile");
  if (error) {
    return redirect(res, withRedirectParam(withRedirectParam(redirectTo, "x", "error"), "reason", errorDesc || error));
  }
  if (!code) {
    return redirect(res, withRedirectParam(redirectTo, "x", "missing-code"));
  }
  try {
    const token = await exchangeXCode(code, stateRow.rows[0].code_verifier);
    const meRes = await fetch(X_ME_URL, {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });
    if (!meRes.ok) throw new Error(`X profile lookup failed with ${meRes.status}`);
    const meJson = await meRes.json();
    const xUser = meJson?.data || {};
    const targetUserResult = await query("select * from users where id = $1 limit 1", [stateRow.rows[0].user_id]);
    const targetUser = targetUserResult.rows[0] ? userRow(targetUserResult.rows[0]) : null;
    if (!targetUser) {
      throw new Error("User not found.");
    }
    await assertXLinkAvailableForUser(targetUser, xUser.id || null);
    await query(
      `
      update users
      set x_connected = true,
          x_user_id = $2,
          x_handle = $3,
          updated_at = now()
      where id = $1
      `,
      [stateRow.rows[0].user_id, xUser.id || null, xUser.username || null],
    );
    await query("delete from x_oauth_states where state = $1", [state]);
    redirect(res, withRedirectParam(redirectTo, "x", "connected"));
  } catch (err) {
    redirect(
      res,
      withRedirectParam(
        withRedirectParam(redirectTo, "x", "error"),
        "reason",
        err instanceof Error ? err.message : "x oauth failed",
      ),
    );
  }
}

async function handleXLoginCallback(req, res, url, stateRow) {
  const state = String(url.searchParams.get("state") || "");
  const code = String(url.searchParams.get("code") || "");
  const error = url.searchParams.get("error");
  const errorDesc = url.searchParams.get("error_description");
  const redirectTo = resolveClientRedirect(
    stateRow.redirect_to,
    stateRow.account_type === "project" ? "/build" : "/home",
  );
  const codeVerifier = String(stateRow.code_verifier || "");
  if (error) {
    await query("delete from auth_x_oauth_states where state = $1", [state]);
    return redirect(res, withRedirectParam(withRedirectParam(redirectTo, "x", "error"), "reason", errorDesc || error));
  }
  if (!code) {
    await query("delete from auth_x_oauth_states where state = $1", [state]);
    return redirect(res, withRedirectParam(redirectTo, "x", "missing-code"));
  }
  try {
    const token = await exchangeXCode(code, codeVerifier);
    const meRes = await fetch(X_ME_URL, {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });
    if (!meRes.ok) throw new Error(`X profile lookup failed with ${meRes.status}`);
    const meJson = await meRes.json();
    const xUser = meJson?.data || {};
    await query("delete from auth_x_oauth_states where state = $1", [state]);

    if (stateRow.account_type === "project") {
      await assertXAvailableForAccountType(xUser.id || null, "project");
      const approved = await query(
        "select * from users where account_type = 'project' and x_user_id = $1 limit 1",
        [xUser.id || null],
      );
      if (approved.rows[0] && approved.rows[0].project_verification_status === "approved") {
        const session = await sessionHeadersForUser(userRow(approved.rows[0]));
        return redirect(
          res,
          withRedirectHashParam(normalizeApprovedProjectRedirect(redirectTo), "session", session.token),
          session.headers,
        );
      }
      let application = await query(
        "select * from project_applications where x_user_id = $1 limit 1",
        [xUser.id || null],
      );
      let projectApplication = application.rows[0] ? projectApplicationRow(application.rows[0]) : null;
      if (!projectApplication) {
        projectApplication = await createDraftProjectApplication({
          xConnected: true,
          xUserId: xUser.id || null,
          xHandle: xUser.username || null,
        });
      } else {
        projectApplication = await updateProjectApplication(projectApplication.id, {
          xConnected: true,
          xUserId: xUser.id || null,
          xHandle: xUser.username || null,
        });
      }
      const projectSession = projectApplication ? projectApplicationSessionHeaders(projectApplication.id) : null;
      return redirect(
        res,
        projectSession
          ? withRedirectHashParam(withRedirectParam(redirectTo, "x", "connected"), "projectApplication", projectSession.token)
          : withRedirectParam(redirectTo, "x", "connected"),
        projectSession?.headers || {},
      );
    }

    await assertXAvailableForAccountType(xUser.id || null, "user");
    const creator = await upsertXUser({
      xUserId: xUser.id || null,
      xHandle: xUser.username || null,
    });
    const session = await sessionHeadersForUser(creator);
    return redirect(
      res,
      withRedirectHashParam(withRedirectParam(redirectTo, "x", "connected"), "session", session.token),
      session.headers,
    );
  } catch (err) {
    return redirect(
      res,
      withRedirectParam(
        withRedirectParam(redirectTo, "x", "error"),
        "reason",
        err instanceof Error ? err.message : "x oauth failed",
      ),
    );
  }
}

async function handleProjectXCallback(req, res, url) {
  if (xConfigMissing()) {
    return redirect(res, `${CLIENT_ORIGIN}/build?x=not-configured`);
  }
  const state = String(url.searchParams.get("state") || "");
  const code = String(url.searchParams.get("code") || "");
  const error = url.searchParams.get("error");
  const errorDesc = url.searchParams.get("error_description");
  const stateRow = await query("select * from project_x_oauth_states where state = $1 and expires_at > now() limit 1", [state]);
  if (!stateRow.rows[0]) {
    return redirect(res, `${CLIENT_ORIGIN}/build?x=invalid-state`);
  }
  const redirectTo = resolveClientRedirect(stateRow.rows[0].redirect_to, "/build");
  if (error) {
    return redirect(res, withRedirectParam(withRedirectParam(redirectTo, "x", "error"), "reason", errorDesc || error));
  }
  if (!code) {
    return redirect(res, withRedirectParam(redirectTo, "x", "missing-code"));
  }
  try {
    const token = await exchangeXCode(code, stateRow.rows[0].code_verifier);
    const meRes = await fetch(X_ME_URL, {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });
    if (!meRes.ok) throw new Error(`X profile lookup failed with ${meRes.status}`);
    const meJson = await meRes.json();
    const xUser = meJson?.data || {};
    await assertXAvailableForProjectApplication(stateRow.rows[0].project_application_id, xUser.id || null);
    const updated = await updateProjectApplication(stateRow.rows[0].project_application_id, {
      xConnected: true,
      xUserId: xUser.id || null,
      xHandle: xUser.username || null,
    });
    await query("delete from project_x_oauth_states where state = $1", [state]);
    const projectSession = updated ? projectApplicationSessionHeaders(updated.id) : null;
    redirect(
      res,
      projectSession
        ? withRedirectHashParam(withRedirectParam(redirectTo, "x", "connected"), "projectApplication", projectSession.token)
        : withRedirectParam(redirectTo, "x", "connected"),
      projectSession?.headers || {},
    );
  } catch (err) {
    redirect(
      res,
      withRedirectParam(
        withRedirectParam(redirectTo, "x", "error"),
        "reason",
        err instanceof Error ? err.message : "x oauth failed",
      ),
    );
  }
}

async function listCampaigns(url) {
  const limit = Math.min(Number(url.searchParams.get("limit") || 50), 100);
  const category = url.searchParams.get("category");
  let sql = "select * from campaigns";
  const params = [];
  if (category) {
    sql += " where category = $1";
    params.push(category);
  }
  sql += ` order by trending desc, created_at desc limit $${params.length + 1}`;
  params.push(limit);
  const result = await query(sql, params);
  return result.rows.map(campaignRow);
}

async function handleTokenMetadata(req, res, url) {
  const address = String(url.searchParams.get("address") || "").trim();
  const provider = String(url.searchParams.get("provider") || "dexscreener").trim().toLowerCase();
  if (!address) {
    return json(res, 400, { error: "Token contract address is required." });
  }
  try {
    const token = provider === "chain"
      ? await fetchTokenMetadataFromChain(address)
      : await fetchTokenMetadataFromDexscreener(address);
    return json(res, 200, { token });
  } catch (error) {
    return json(res, 400, { error: error instanceof Error ? error.message : "Could not fetch token metadata." });
  }
}

async function handleCampaigns(req, res, url) {
  if (req.method === "GET") {
    return json(res, 200, { campaigns: await listCampaigns(url) });
  }
  if (req.method === "POST") {
    const user = await requireUser(req, res);
    if (!user) return;
    if (user.accountType !== "project") {
      return json(res, 403, { error: "Only project accounts can create campaigns." });
    }
    if (user.projectVerificationStatus !== "approved") {
      return json(res, 403, { error: "Only approved projects can create campaigns." });
    }
    const body = await readBody(req);
    const title = String(body.title || "").trim();
    const description = String(body.description || "").trim();
    const category = String(body.category || "Memes");
    const cover = String(body.cover || seed.challenges[0]?.cover || "");
    const requestedRewardToken = String(body.rewardToken || "BNB").trim().toUpperCase();
    const rewardAmount = Number(body.rewardAmount || 1);
    const winners = Math.max(1, Number(body.winners || 1));
    const days = Math.max(1, Number(body.days || 1));
    const submissionType = String(body.submissionType || "X Post");
    const rawRules = Array.isArray(body.rules) ? body.rules : String(body.rules || "").split("\n").map((x) => x.trim()).filter(Boolean);
    const editableRules = rawRules.map((x) => String(x).trim()).filter((x) => x && x !== REQUIRED_X_RULE);
    const rules = [REQUIRED_X_RULE, ...editableRules];
    const proof = Array.isArray(body.proof) ? body.proof : String(body.proof || "").split("\n").map((x) => x.trim()).filter(Boolean);
    const requiredTags = Array.isArray(body.requiredTags)
      ? body.requiredTags
      : String(body.requiredTags || "").split(/\s+/).map((x) => x.trim()).filter(Boolean);
    const holderRequirement = body.holderRequirement && typeof body.holderRequirement === "object"
      ? {
        enabled: Boolean(body.holderRequirement.enabled),
        tokenAddress: String(body.holderRequirement.tokenAddress || "").trim() || undefined,
        tokenName: String(body.holderRequirement.tokenName || "").trim() || undefined,
        tokenSymbol: String(body.holderRequirement.tokenSymbol || "").trim() || undefined,
        minimumAmount: Number(body.holderRequirement.minimumAmount || 0) || undefined,
      }
      : null;
    const creatorRequirements = body.creatorRequirements && typeof body.creatorRequirements === "object"
      ? {
        minFollowers: Number(body.creatorRequirements.minFollowers || 0) || undefined,
        minViews: Number(body.creatorRequirements.minViews || 0) || undefined,
      }
      : null;
    if (!title || !description || !category || !cover || !requestedRewardToken || !rewardAmount || !winners) {
      return json(res, 400, { error: "Title, description, cover, reward, and winners are required." });
    }
    if (holderRequirement?.enabled && !holderRequirement.tokenAddress) {
      return json(res, 400, { error: "A valid holder requirement token is required." });
    }
    const slugBase = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    const slug = `${slugBase || "campaign"}-${crypto.randomUUID().slice(0, 8)}`;
    const creator = creatorFromUser(user);
    const bnbMarket = await fetchBnbUsd();
    let rewardToken = requestedRewardToken;
    let rewardTokenMeta = null;
    let rewardPool = 0;

    if (requestedRewardToken === "CUSTOM") {
      try {
        rewardTokenMeta = await fetchTokenMetadataFromDexscreener(
          String(body.rewardTokenAddress || body.rewardTokenMeta?.address || "").trim(),
        );
      } catch (error) {
        return json(res, 400, { error: error instanceof Error ? error.message : "Could not fetch token metadata." });
      }
      rewardToken = rewardTokenMeta.symbol;
    } else {
      rewardPool = Math.round(
        rewardAmount
        * (rewardToken === "USDT"
          ? 1
          : rewardToken === "USDC"
            ? 1
          : rewardToken === "BNB"
            ? bnbMarket.price
            : rewardToken === "SHILL" || rewardToken === "MEME"
              ? 0.002
            : rewardToken === "ETH"
              ? 3200
              : 0.002),
      );
    }

    let normalizedHolderRequirement = null;
    if (holderRequirement?.enabled) {
      try {
        const holderTokenMeta = await fetchTokenMetadataFromDexscreener(String(holderRequirement.tokenAddress || "").trim());
        normalizedHolderRequirement = {
          enabled: true,
          tokenAddress: holderTokenMeta.address,
          tokenName: holderTokenMeta.name,
          tokenSymbol: holderTokenMeta.symbol,
          minimumAmount: holderRequirement.minimumAmount,
        };
      } catch (error) {
        return json(res, 400, { error: error instanceof Error ? error.message : "Could not fetch holder token metadata." });
      }
    }

    const inserted = await query(
      `
      insert into campaigns
        (id, slug, title, cover, category, reward_pool, reward_token, reward_token_meta, reward_amount, winners, creator, holder_requirement, creator_requirements, participants, starts_at, ends_at, submission_type, description, rules, proof, required_tags, official, trending)
      values
        ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11::jsonb,$12::jsonb,$13::jsonb,0,now(), now() + ($14 || ' days')::interval, $15,$16,$17::jsonb,$18::jsonb,$19::jsonb,$20,50)
      returning *
      `,
      [
        crypto.randomUUID(),
        slug,
        title,
        cover,
        category,
        rewardPool,
        rewardToken,
        rewardTokenMeta ? JSON.stringify(rewardTokenMeta) : null,
        rewardAmount,
        winners,
        JSON.stringify(creator),
        normalizedHolderRequirement ? JSON.stringify(normalizedHolderRequirement) : null,
        creatorRequirements && (creatorRequirements.minFollowers || creatorRequirements.minViews)
          ? JSON.stringify(creatorRequirements)
          : null,
        days,
        submissionType,
        description,
        JSON.stringify(rules),
        JSON.stringify(proof),
        requiredTags.length ? JSON.stringify(requiredTags) : null,
        user.accountType === "project",
      ],
    );
    await query("update users set created = created + 1, updated_at = now() where id = $1", [user.id]);
    return json(res, 201, { campaign: campaignRow(inserted.rows[0]) });
  }
  return json(res, 405, { error: "Method not allowed." });
}

async function handleCampaignBySlug(req, res, slug) {
  const result = await query("select * from campaigns where slug = $1 or id = $1 limit 1", [slug]);
  if (!result.rows[0]) return json(res, 404, { error: "Campaign not found." });
  json(res, 200, { campaign: campaignRow(result.rows[0]) });
}

async function handleJoinCampaign(req, res, campaignId) {
  const user = await requireUser(req, res);
  if (!user) return;
  const campaign = await query("select * from campaigns where id = $1 limit 1", [campaignId]);
  if (!campaign.rows[0]) return json(res, 404, { error: "Campaign not found." });
  const creator = campaign.rows[0].creator || {};
  if (creator.id === user.id) {
    return json(res, 403, { error: "You created this campaign. Creators cannot join their own campaigns." });
  }
  const inserted = await query(
    `
    insert into campaign_members (campaign_id, user_id)
    values ($1,$2)
    on conflict (campaign_id, user_id) do nothing
    returning campaign_id
    `,
    [campaignId, user.id],
  );
  if (inserted.rowCount) {
    await query("update campaigns set participants = participants + 1, updated_at = now() where id = $1", [campaignId]);
    await query("update users set joined = joined + 1, updated_at = now() where id = $1", [user.id]);
  }
  json(res, 200, { ok: true });
}

async function handleSubmitCampaign(req, res, campaignId) {
  const user = await requireUser(req, res);
  if (!user) return;
  const campaign = await query("select * from campaigns where id = $1 limit 1", [campaignId]);
  if (!campaign.rows[0]) return json(res, 404, { error: "Campaign not found." });
  const creator = campaign.rows[0].creator || {};
  if (creator.id === user.id) {
    return json(res, 403, { error: "You created this campaign. Creators cannot submit entries to their own campaigns." });
  }
  const existing = await query(
    "select id from submissions where campaign_id = $1 and user_id = $2 limit 1",
    [campaignId, user.id],
  );
  if (existing.rows[0]) {
    return json(res, 409, { error: "You have already submitted an entry to this campaign." });
  }
  const body = await readBody(req);
  const link = String(body.link || body.links?.[0] || body.url || "").trim();
  if (!link) return json(res, 400, { error: "A submission link is required." });
  const inserted = await query(
    `
    insert into submissions
      (id, campaign_id, user_id, challenge_title, cover, "user", link, type, status, submitted_at)
    values
      ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,'Pending Review',now())
    returning *
    `,
    [
      crypto.randomUUID(),
      campaignId,
      user.id,
      campaign.rows[0].title,
      campaign.rows[0].cover,
      JSON.stringify({ id: user.id, type: "user", name: user.name, handle: user.handle, avatar: user.avatar, verified: user.xConnected }),
      link,
      String(body.type || campaign.rows[0].submission_type || "X Post"),
    ],
  );
  const s = inserted.rows[0];
  json(res, 201, {
    submission: {
      id: s.id,
      challengeId: s.campaign_id,
      challengeTitle: s.challenge_title,
      cover: s.cover,
      user: s.user,
      link: s.link,
      type: s.type,
      status: s.status,
      submittedAt: s.submitted_at,
      reward: s.reward == null ? undefined : Number(s.reward),
    },
  });
}

async function handleAdminSummary(req, res) {
  const user = await requireUser(req, res);
  if (!user) return;
  if (!user.isAdmin) {
    return json(res, 403, { error: "Admin access required." });
  }
  const [usersCount, campaignsCount, submissionsCount, membersCount] = await Promise.all([
    query("select count(*)::int as count from users"),
    query("select count(*)::int as count from campaigns"),
    query("select count(*)::int as count from submissions"),
    query("select count(*)::int as count from campaign_members"),
  ]);
  const pendingSubmissions = await query("select * from submissions where status = 'Pending Review' order by submitted_at desc limit 20");
  const accountRows = await query("select * from users order by updated_at desc limit 50");
  const applicationRows = await query(
    "select * from project_applications where status in ('pending', 'rejected') order by updated_at desc limit 50",
  );
  const featuredRows = await query("select * from campaigns where official = true order by trending desc, created_at desc limit 12");
  const pendingProjects = applicationRows.rows.filter((row) => row.status === "pending").length;
  json(res, 200, {
    counts: {
      users: usersCount.rows[0].count,
      campaigns: campaignsCount.rows[0].count,
      submissions: submissionsCount.rows[0].count,
      joins: membersCount.rows[0].count,
      pendingProjects,
      flagged: 0,
    },
    pendingSubmissions: pendingSubmissions.rows.map((s) => ({
      id: s.id,
      challengeId: s.campaign_id,
      challengeTitle: s.challenge_title,
      cover: s.cover,
      user: s.user,
      link: s.link,
      type: s.type,
      status: s.status,
      submittedAt: s.submitted_at,
      reward: s.reward == null ? undefined : Number(s.reward),
    })),
    accounts: accountRows.rows.map((u) => userRow(u)),
    projectVerificationRequests: applicationRows.rows.map((row) => projectApplicationRow(row)),
    featuredCampaigns: featuredRows.rows.map(campaignRow),
  });
}

async function handleAdminProjectVerification(req, res, applicationId) {
  const user = await requireUser(req, res);
  if (!user) return;
  if (!user.isAdmin) {
    return json(res, 403, { error: "Admin access required." });
  }
  const body = await readBody(req);
  const status = String(body.status || "").trim().toLowerCase();
  if (status !== "approved" && status !== "rejected") {
    return json(res, 400, { error: "Valid project verification status is required." });
  }
  const application = await query("select * from project_applications where id = $1 limit 1", [applicationId]);
  if (!application.rows[0]) {
    return json(res, 404, { error: "Project application not found." });
  }
  const row = application.rows[0];
  if (status === "approved") {
    const existing = row.wallet_address
      ? await getUserByWallet(row.wallet_address, "project")
      : row.email
        ? await getUserByEmail(row.email, "project")
        : null;
    let projectUser = existing;
    if (!projectUser) {
      let baseHandle = sanitizeHandle(row.project_handle || row.project_name || "project");
      if (!baseHandle) baseHandle = `project_${normalizeAddress(row.wallet_address).slice(-4)}`;
      let nextHandle = baseHandle;
      let suffix = 1;
      while (true) {
        const taken = await query("select id from users where lower(handle) = lower($1) and account_type = 'project' limit 1", [nextHandle]);
        if (!taken.rows[0]) break;
        nextHandle = sanitizeHandle(`${baseHandle}${suffix}`);
        suffix += 1;
      }
      const inserted = await query(
        `
        insert into users (
          id, wallet_address, email, display_name, handle, account_type, auth_provider, avatar, banner, bio, website,
          project_category, telegram_url, project_verified, project_verification_status,
          x_connected, x_user_id, x_handle, joined, created, wins, earned, is_admin
        )
        values ($1,$2,$3,$4,$5,'project',$6,$7,$8,$9,$10,$11,$12,true,'approved',$13,$14,$15,0,0,0,0,false)
        returning *
        `,
        [
          crypto.randomUUID(),
          row.wallet_address ? normalizeAddress(row.wallet_address) : null,
          normalizeEmail(row.email || ""),
          row.project_name,
          nextHandle,
          row.x_connected ? "x" : row.email ? "email" : "project_application",
          row.logo || `https://api.dicebear.com/9.x/glass/svg?seed=${encodeURIComponent(row.wallet_address || row.email || row.project_name || crypto.randomUUID())}&backgroundType=gradientLinear`,
          row.banner || "https://images.unsplash.com/photo-1639322537228-f710d846310a?auto=format&fit=crop&w=1400&q=80",
          row.description || "Verified Moonshill project.",
          row.website || "",
          row.project_category || null,
          row.telegram_url || "",
          !!row.x_connected,
          row.x_user_id || null,
          row.x_handle || null,
        ],
      );
      projectUser = userRow(inserted.rows[0]);
    } else if (projectUser.projectVerificationStatus !== "approved") {
      const updatedUser = await query(
        `
        update users
        set wallet_address = coalesce($2, wallet_address),
            email = case when trim(coalesce($3, '')) <> '' then $3 else email end,
            display_name = $4,
            avatar = $5,
            banner = $6,
            bio = $7,
            website = $8,
            project_category = $9,
            telegram_url = $10,
            project_verified = true,
            project_verification_status = 'approved',
            x_connected = $11,
            x_user_id = $12,
            x_handle = $13,
            updated_at = now()
        where id = $1
        returning *
        `,
        [
          projectUser.id,
          row.wallet_address ? normalizeAddress(row.wallet_address) : null,
          normalizeEmail(row.email || ""),
          row.project_name || projectUser.name,
          row.logo || projectUser.avatar,
          row.banner || projectUser.banner,
          row.description || projectUser.bio,
          row.website || projectUser.website || "",
          row.project_category || projectUser.projectCategory || null,
          row.telegram_url || projectUser.telegramUrl || "",
          !!row.x_connected,
          row.x_user_id || null,
          row.x_handle || null,
        ],
      );
      projectUser = userRow(updatedUser.rows[0]);
    }
    const updated = await updateProjectApplication(applicationId, {
      status: "approved",
      rejectionReason: "",
      approvedProjectId: projectUser.id,
    });
    return json(res, 200, { application: updated, user: projectUser });
  }
  const updated = await updateProjectApplication(applicationId, {
    status: "rejected",
    rejectionReason: typeof body.reason === "string" ? body.reason.trim() : "",
  });
  return json(res, 200, { application: updated });
}

async function handleAdminSubmissionStatus(req, res, submissionId) {
  const user = await requireUser(req, res);
  if (!user) return;
  if (!user.isAdmin) {
    return json(res, 403, { error: "Admin access required." });
  }
  const body = await readBody(req);
  const status = String(body.status || "").trim();
  const allowed = new Set(["Pending Review", "Approved", "Rejected", "Winner"]);
  if (!allowed.has(status)) {
    return json(res, 400, { error: "Valid submission status is required." });
  }
  const updated = await query(
    `
    update submissions
    set status = $2
    where id = $1
    returning *
    `,
    [submissionId, status],
  );
  if (!updated.rows[0]) return json(res, 404, { error: "Submission not found." });
  const s = updated.rows[0];
  return json(res, 200, {
    submission: {
      id: s.id,
      challengeId: s.campaign_id,
      challengeTitle: s.challenge_title,
      cover: s.cover,
      user: s.user,
      link: s.link,
      type: s.type,
      status: s.status,
      submittedAt: s.submitted_at,
      reward: s.reward == null ? undefined : Number(s.reward),
    },
  });
}

async function canManageCampaignSubmissions(user, campaignId) {
  if (user?.isAdmin) return true;
  if (!user || user.accountType !== "project") return false;
  const campaign = await query("select creator from campaigns where id = $1 limit 1", [campaignId]);
  const creator = campaign.rows[0]?.creator || {};
  return creator.id === user.id;
}

async function handleCampaignSubmissions(req, res, campaignId) {
  const user = await requireUser(req, res);
  if (!user) return;
  const canManage = await canManageCampaignSubmissions(user, campaignId);
  if (!canManage) {
    return json(res, 403, { error: "Project owner or admin access required." });
  }
  const submissions = await query(
    "select * from submissions where campaign_id = $1 order by submitted_at desc limit 100",
    [campaignId],
  );
  return json(res, 200, {
    submissions: submissions.rows.map((s) => ({
      id: s.id,
      challengeId: s.campaign_id,
      challengeTitle: s.challenge_title,
      cover: s.cover,
      user: s.user,
      link: s.link,
      type: s.type,
      status: s.status,
      submittedAt: s.submitted_at,
      reward: s.reward == null ? undefined : Number(s.reward),
    })),
  });
}

async function handleCampaignSubmissionStatus(req, res, campaignId, submissionId) {
  const user = await requireUser(req, res);
  if (!user) return;
  const canManage = await canManageCampaignSubmissions(user, campaignId);
  if (!canManage) {
    return json(res, 403, { error: "Project owner or admin access required." });
  }
  const body = await readBody(req);
  const status = String(body.status || "").trim();
  const allowed = new Set(["Pending Review", "Approved", "Rejected", "Winner"]);
  if (!allowed.has(status)) {
    return json(res, 400, { error: "Valid submission status is required." });
  }
  const updated = await query(
    `
    update submissions
    set status = $3
    where id = $1 and campaign_id = $2
    returning *
    `,
    [submissionId, campaignId, status],
  );
  if (!updated.rows[0]) return json(res, 404, { error: "Submission not found." });
  const s = updated.rows[0];
  return json(res, 200, {
    submission: {
      id: s.id,
      challengeId: s.campaign_id,
      challengeTitle: s.challenge_title,
      cover: s.cover,
      user: s.user,
      link: s.link,
      type: s.type,
      status: s.status,
      submittedAt: s.submitted_at,
      reward: s.reward == null ? undefined : Number(s.reward),
    },
  });
}

async function handlePublic(req, res) {
  const [featuredRows, leaders, allCampaigns, contributionRows, allSubmissions] = await Promise.all([
    query("select * from campaigns order by trending desc, created_at desc limit 3"),
    query("select * from users order by updated_at desc limit 100"),
    query("select * from campaigns order by created_at desc"),
    query("select user_id, count(*)::int as submissions from submissions group by user_id"),
    query("select id, user_id, status from submissions order by created_at desc"),
  ]);
  const liveUsers = filterSeedUsers(leaders.rows);
  const liveCampaigns = filterSeedCampaigns(allCampaigns.rows);
  const liveSubmissions = filterSeedSubmissions(allSubmissions.rows);
  const liveContributionRows = contributionRows.rows.filter((row) => !seedUserIds.has(row.user_id));
  const winnerIds = new Set(
    liveSubmissions
      .filter((submission) => submission.status === "Winner")
      .map((submission) => submission.user_id),
  );
  const leaderboard = buildLeaderboard(liveUsers, liveCampaigns, liveContributionRows);
  json(res, 200, {
    appName: APP_NAME,
    xHandle: X_HANDLE,
    xUrl: `https://x.com/${X_HANDLE}`,
    platformStats: {
      activeChallenges: liveCampaigns.length,
      totalRewards: liveCampaigns.reduce((sum, campaign) => sum + Number(campaign.reward_pool || 0), 0),
      creators: liveUsers.length,
      submissions: liveSubmissions.length,
      winners: winnerIds.size,
    },
    tickerItems: [],
    leaderboard,
    featuredCampaigns: featuredRows.rows.map(campaignRow),
  });
}

async function handleBnbMarket(req, res) {
  const market = await fetchBnbUsd();
  return json(res, 200, {
    symbol: "BNB",
    currency: "USD",
    price: market.price,
    source: market.source,
    updatedAt: new Date(market.updatedAt || Date.now()).toISOString(),
  });
}

function buildLeaderboard(userRows, campaignRows = [], contributionRows = []) {
  const users = userRows.map(userRow);
  const projectTotals = new Map();
  for (const campaign of campaignRows) {
    const creatorId = campaign?.creator?.id;
    if (!creatorId) continue;
    const current = projectTotals.get(creatorId) || { totalSponsored: 0, campaigns: 0 };
    current.totalSponsored += Number(campaign.reward_pool || 0);
    current.campaigns += 1;
    projectTotals.set(creatorId, current);
  }

  const submissionsByUser = new Map(
    contributionRows.map((row) => [row.user_id, Number(row.submissions || 0)]),
  );

  const winners = users
    .filter((user) => user.accountType === "user" && (user.earned > 0 || user.wins > 0))
    .sort((a, b) => b.earned - a.earned || b.wins - a.wins || b.joined - a.joined || a.name.localeCompare(b.name))
    .map((user, index) => ({
      id: user.id,
      rank: index + 1,
      name: user.name,
      handle: user.handle,
      avatar: user.avatar,
      verified: !!user.xConnected,
      accountType: user.accountType,
      value: user.earned,
      wins: user.wins,
      delta: 0,
    }));

  const contributors = users
    .filter((user) => user.accountType === "user")
    .map((user) => {
      const submissions = submissionsByUser.get(user.id) || 0;
      const contributionScore = submissions * 25 + user.joined * 10 + user.wins * 100;
      return {
        id: user.id,
        name: user.name,
        handle: user.handle,
        avatar: user.avatar,
        verified: !!user.xConnected,
        accountType: user.accountType,
        value: contributionScore,
        wins: submissions,
        delta: 0,
      };
    })
    .filter((user) => user.value > 0)
    .sort((a, b) => b.value - a.value || b.wins - a.wins || a.name.localeCompare(b.name))
    .map((user, index) => ({ ...user, rank: index + 1 }));

  const projects = users
    .filter((user) => user.accountType === "project")
    .map((user) => {
      const stats = projectTotals.get(user.id) || { totalSponsored: 0, campaigns: 0 };
      return {
        id: user.id,
        name: user.name,
        handle: user.handle,
        avatar: user.avatar,
        verified: !!user.projectVerified,
        accountType: user.accountType,
        value: stats.totalSponsored,
        wins: stats.campaigns,
        delta: 0,
      };
    })
    .filter((project) => project.value > 0 || project.wins > 0)
    .sort((a, b) => b.value - a.value || b.wins - a.wins || a.name.localeCompare(b.name))
    .map((project, index) => ({ ...project, rank: index + 1 }));

  return { winners, contributors, projects };
}

async function handleLeaderboard(req, res) {
  const [leaders, campaigns, contributionRows] = await Promise.all([
    query("select * from users order by updated_at desc limit 250"),
    query("select * from campaigns order by created_at desc"),
    query("select user_id, count(*)::int as submissions from submissions group by user_id"),
  ]);
  json(
    res,
    200,
    buildLeaderboard(
      filterSeedUsers(leaders.rows),
      filterSeedCampaigns(campaigns.rows),
      contributionRows.rows.filter((row) => !seedUserIds.has(row.user_id)),
    ),
  );
}

async function handleNotifications(req, res) {
  const user = await authUserFromRequest(req);
  if (!user) return json(res, 200, { notifications: [] });
  const submissions = await query("select * from submissions where user_id = $1 order by submitted_at desc limit 10", [user.id]);
  json(res, 200, {
    notifications: submissions.rows.map((s) => ({
      id: `submission-${s.id}`,
      kind: s.status === "Approved" ? "approved" : s.status === "Rejected" ? "rejected" : s.status === "Winner" ? "win" : "review",
      title: s.status === "Pending Review" ? "Submission received" : `Submission ${String(s.status).toLowerCase()}`,
      body: `${s.challenge_title} is ${String(s.status).toLowerCase()}.`,
      at: s.submitted_at,
      unread: false,
      href: `/challenge/${s.campaign_id}`,
    })),
  });
}

async function findAccountByLookup(handle) {
  const result = await query(
    "select * from users where id = $1 or lower(handle) = lower($1) or lower(coalesce(x_handle, '')) = lower($1) limit 1",
    [handle],
  );
  return result.rows[0] ? userRow(result.rows[0]) : null;
}

async function handleProject(req, res, handle) {
  const user = await findAccountByLookup(handle);
  if (!user || user.accountType !== "project") return json(res, 404, { error: "Project not found." });
  const campaigns = await query("select * from campaigns where creator->>'id' = $1 order by created_at desc limit 12", [user.id]);
  json(res, 200, {
    project: projectProfileFromUser(user, campaigns.rows.map(campaignRow)),
    campaigns: campaigns.rows.map(campaignRow),
  });
}

async function handlePublicUser(req, res, handle) {
  const account = await findAccountByLookup(handle);
  if (!account || account.accountType !== "user") return json(res, 404, { error: "User not found." });
  const joined = await query(
    `
    select c.* from campaigns c
    join campaign_members m on m.campaign_id = c.id
    where m.user_id = $1
    order by m.created_at desc
    limit 12
    `,
    [account.id],
  );
  const created = await query(
    "select * from campaigns where creator->>'id' = $1 order by created_at desc limit 12",
    [account.id],
  );
  const submissions = await query(
    "select * from submissions where user_id = $1 order by submitted_at desc limit 12",
    [account.id],
  );
  return json(res, 200, {
    user: {
      ...account,
      joinedCampaigns: joined.rows.map(campaignRow),
      createdCampaigns: created.rows.map(campaignRow),
      submissions: submissions.rows.map((s) => ({
        id: s.id,
        challengeId: s.campaign_id,
        challengeTitle: s.challenge_title,
        cover: s.cover,
        user: s.user,
        link: s.link,
        type: s.type,
        status: s.status,
        submittedAt: s.submitted_at,
        reward: s.reward == null ? undefined : Number(s.reward),
      })),
    },
  });
}

const server = http.createServer(async (req, res) => {
  applyCors(req, res);
  if (!req.url) return json(res, 400, { error: "Missing request URL." });
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": res.getHeader("Access-Control-Allow-Origin") || DEFAULT_CORS_ORIGIN,
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Project-Application",
      "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
    });
    return res.end();
  }

  try {
    if (url.pathname === "/health") return json(res, 200, { ok: true, appName: APP_NAME, time: nowIso() });
    if (url.pathname === "/api/public" && req.method === "GET") return handlePublic(req, res);
    if (url.pathname === "/api/market/bnb" && req.method === "GET") return handleBnbMarket(req, res);
    if (url.pathname === "/api/token-metadata" && req.method === "GET") return handleTokenMetadata(req, res, url);
    if (url.pathname === "/api/leaderboard" && req.method === "GET") return handleLeaderboard(req, res);
    if (url.pathname === "/api/notifications" && req.method === "GET") return handleNotifications(req, res);
    if (/^\/api\/projects\/[^/]+$/.test(url.pathname) && req.method === "GET") {
      return handleProject(req, res, decodeURIComponent(url.pathname.split("/").pop()));
    }
    if (/^\/api\/users\/[^/]+$/.test(url.pathname) && req.method === "GET") {
      return handlePublicUser(req, res, decodeURIComponent(url.pathname.split("/").pop()));
    }
    if (url.pathname === "/api/auth/email" && req.method === "POST") return handleEmailAuthStart(req, res);
    if (url.pathname === "/api/auth/email/start" && req.method === "POST") return handleEmailAuthStart(req, res);
    if (url.pathname === "/api/auth/email/verify" && req.method === "POST") return handleEmailAuthVerify(req, res);
    if (url.pathname === "/api/auth/email/resend" && req.method === "POST") return handleEmailAuthResend(req, res);
    if (url.pathname === "/api/auth/wallet/challenge" && req.method === "GET") return handleWalletChallenge(req, res, url);
    if (url.pathname === "/api/auth/wallet/verify" && req.method === "POST") return handleWalletVerify(req, res);
    if (url.pathname === "/api/auth/logout" && req.method === "POST") return handleLogout(req, res);
    if (url.pathname === "/api/auth/x/login/start" && req.method === "GET") return handleXLoginStart(req, res, url);
    if (url.pathname === "/api/auth/x/start" && req.method === "GET") return handleXStart(req, res, url);
    if (url.pathname === "/api/auth/x/callback" && req.method === "GET") return handleXCallback(req, res, url);
    if (url.pathname === "/api/project-auth/wallet/verify" && req.method === "POST") return handleProjectWalletVerify(req, res);
    if (url.pathname === "/api/project-application" && req.method === "GET") return handleProjectApplicationGet(req, res);
    if (url.pathname === "/api/project-application" && req.method === "PATCH") return handleProjectApplicationPatch(req, res);
    if (url.pathname === "/api/project-application/submit" && req.method === "POST") return handleProjectApplicationSubmit(req, res);
    if (url.pathname === "/api/project-auth/x/start" && req.method === "GET") return handleProjectXStart(req, res, url);
    if (url.pathname === "/api/project-auth/x/callback" && req.method === "GET") return handleProjectXCallback(req, res, url);
    if (url.pathname === "/api/me" && req.method === "GET") return handleMeGet(req, res);
    if (url.pathname === "/api/me" && req.method === "PATCH") return handleMePatch(req, res);
    if (url.pathname === "/api/me/wallets" && req.method === "PATCH") return handleMeWalletsPatch(req, res);
    if (url.pathname === "/api/me/project-account" && req.method === "POST") return handleProjectAccountStart(req, res);
    if (url.pathname === "/api/me/project-account/activate" && req.method === "POST") return handleProjectAccountActivate(req, res);
    if (url.pathname === "/api/me/project-verification" && req.method === "POST") return handleProjectVerificationRequest(req, res);
    if (url.pathname === "/api/campaigns" && (req.method === "GET" || req.method === "POST")) return handleCampaigns(req, res, url);
    if (/^\/api\/campaigns\/[^/]+$/.test(url.pathname) && req.method === "GET") {
      return handleCampaignBySlug(req, res, decodeURIComponent(url.pathname.split("/").pop()));
    }
    if (/^\/api\/campaigns\/[^/]+\/submissions$/.test(url.pathname) && req.method === "GET") {
      return handleCampaignSubmissions(req, res, decodeURIComponent(url.pathname.split("/")[3]));
    }
    if (/^\/api\/campaigns\/[^/]+\/join$/.test(url.pathname) && req.method === "POST") {
      return handleJoinCampaign(req, res, decodeURIComponent(url.pathname.split("/")[3]));
    }
    if (/^\/api\/campaigns\/[^/]+\/submissions$/.test(url.pathname) && req.method === "POST") {
      return handleSubmitCampaign(req, res, decodeURIComponent(url.pathname.split("/")[3]));
    }
    if (/^\/api\/campaigns\/[^/]+\/submissions\/[^/]+$/.test(url.pathname) && req.method === "PATCH") {
      return handleCampaignSubmissionStatus(
        req,
        res,
        decodeURIComponent(url.pathname.split("/")[3]),
        decodeURIComponent(url.pathname.split("/")[5]),
      );
    }
    if (url.pathname === "/api/admin/summary" && req.method === "GET") return handleAdminSummary(req, res);
    if (/^\/api\/admin\/projects\/[^/]+\/verification$/.test(url.pathname) && req.method === "PATCH") {
      return handleAdminProjectVerification(req, res, decodeURIComponent(url.pathname.split("/")[4]));
    }
    if (/^\/api\/admin\/submissions\/[^/]+$/.test(url.pathname) && req.method === "PATCH") {
      return handleAdminSubmissionStatus(req, res, decodeURIComponent(url.pathname.split("/").pop()));
    }

    if (url.pathname === "/") return text(res, 200, `${APP_NAME} backend is running.`);
    return json(res, 404, { error: "Not found." });
  } catch (error) {
    console.error(error);
    return json(res, 500, { error: error instanceof Error ? error.message : "Server error" });
  }
});

await ensureSchema();
if (shouldSeedDemoData) await ensureSeed();

server.listen(PORT, () => {
  console.log(`${APP_NAME} backend listening on :${PORT}`);
});
