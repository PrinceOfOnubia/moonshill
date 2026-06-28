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
const SESSION_DAYS = 30;
const X_AUTHORIZE_URL = "https://x.com/i/oauth2/authorize";
const X_TOKEN_URL = "https://api.x.com/2/oauth2/token";
const X_ME_URL = "https://api.x.com/2/users/me?user.fields=profile_image_url,verified,username";
const X_HANDLE = process.env.X_HANDLE || "moonshillfun";
const REQUIRED_X_RULE = `Must follow @${X_HANDLE} on X`;
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
    .replace(/[^a-z0-9_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

function base64url(input) {
  return Buffer.from(input).toString("base64url");
}

function json(res, status, body, extraHeaders = {}) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": res.getHeader("Access-Control-Allow-Origin") || DEFAULT_CORS_ORIGIN,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
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
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
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

function applyCors(req, res) {
  const origin = req.headers.origin;
  const allowedOrigin = origin && allowedCorsOrigins.has(origin) ? origin : DEFAULT_CORS_ORIGIN;
  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
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
      wallet_address text unique not null,
      display_name text not null,
      handle text not null,
      account_type text not null default 'user',
      avatar text not null,
      banner text not null,
      bio text not null default '',
      website text not null default '',
      project_verified boolean not null default false,
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
  await query(`alter table users add column if not exists account_type text not null default 'user';`);
  await query(`alter table users add column if not exists website text not null default '';`);
  await query(`alter table users add column if not exists project_verified boolean not null default false;`);
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
}

async function ensureSeed() {
  const usersCount = await query("select count(*)::int as count from users");
  if (usersCount.rows[0].count === 0) {
    const me = seed.me;
    await query(
      `
      insert into users (id, wallet_address, display_name, handle, avatar, banner, bio, x_connected, x_user_id, x_handle, joined, created, wins, earned, is_admin)
      values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
      `,
      [
        me.id,
        me.wallet,
        me.name,
        me.handle,
        me.avatar,
        me.banner,
        me.bio,
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
  }

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
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    cover: row.cover,
    category: row.category,
    rewardPool: Number(row.reward_pool),
    rewardToken: row.reward_token,
    rewardTokenMeta: row.reward_token_meta || null,
    rewardAmount: Number(row.reward_amount),
    winners: row.winners,
    creator: {
      id: creator.id || "",
      type: accountType,
      name: creator.name || "Unknown",
      handle: creator.handle || "unknown",
      avatar: creator.avatar || `https://api.dicebear.com/9.x/glass/svg?seed=${encodeURIComponent(creator.id || row.id)}&backgroundType=gradientLinear`,
      verified: !!creator.verified,
      xHandle: creator.xHandle || null,
      website: creator.website || null,
      ownerWallet: creator.ownerWallet || null,
    },
    participants: row.participants,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    submissionType: row.submission_type,
    description: row.description,
    rules: row.rules || [],
    proof: row.proof || [],
    requiredTags: row.required_tags || undefined,
    official: row.official,
    trending: row.trending,
  };
}

function userRow(row) {
  const accountType = row.account_type === "project" ? "project" : "user";
  const projectVerified = !!row.project_verified || (accountType === "project" && !!row.x_connected);
  return {
    id: row.id,
    accountType,
    name: row.display_name,
    handle: row.handle,
    avatar: row.avatar,
    banner: row.banner,
    wallet: row.wallet_address,
    bio: row.bio,
    website: row.website || "",
    projectVerified,
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

function creatorFromUser(user) {
  const verifiedProject = user.accountType === "project" && !!user.projectVerified;
  return {
    id: user.id,
    type: user.accountType,
    name: user.name,
    handle: user.handle,
    avatar: user.avatar,
    verified: verifiedProject,
    xHandle: user.xHandle || null,
    website: user.website || null,
    ownerWallet: user.wallet,
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
    verified: !!user.projectVerified,
    description: user.bio,
    website: user.website || "",
    contract: user.wallet,
    ownerWallet: user.wallet,
    xHandle: user.xHandle || null,
    totalSponsored,
    activeChallenges,
    completedChallenges: 0,
  };
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
  };
}

async function getUserById(id) {
  const result = await query("select * from users where id = $1", [id]);
  return result.rows[0] ? userRow(result.rows[0]) : null;
}

async function buildMePayload(userId) {
  const result = await query("select * from users where id = $1 limit 1", [userId]);
  if (!result.rows[0]) return null;
  const user = userRow(result.rows[0]);
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

async function upsertWalletUser(address) {
  const normalized = normalizeAddress(address);
  const existing = await query("select * from users where lower(wallet_address) = lower($1) limit 1", [normalized]);
  if (existing.rows[0]) return userRow(existing.rows[0]);
  const suffix = normalized.slice(-6);
  const id = crypto.randomUUID();
  const handle = sanitizeHandle(`user${suffix}`);
  const displayName = `Moonshill ${suffix.toUpperCase()}`;
  const avatar = `https://api.dicebear.com/9.x/glass/svg?seed=${encodeURIComponent(normalized)}&backgroundType=gradientLinear`;
  const banner = `https://images.unsplash.com/photo-1614851099511-773084f6911d?auto=format&fit=crop&w=1400&q=80`;
  const inserted = await query(
    `
    insert into users (id, wallet_address, display_name, handle, avatar, banner, bio, x_connected, joined, created, wins, earned, is_admin)
    values ($1,$2,$3,$4,$5,$6,$7,false,0,0,0,0,false)
    returning *
    `,
    [id, normalized, displayName, handle, avatar, banner, "New Moonshill wallet. Add your bio from Profile.",],
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

async function requireUser(req, res) {
  const user = await authUserFromRequest(req);
  if (!user) {
    json(res, 401, { error: "Authentication required." });
    return null;
  }
  return user;
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
  const sessionId = crypto.randomUUID();
  const exp = Math.floor((Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000) / 1000);
  const token = signJwt({ sub: user.id, sid: sessionId, iat: Math.floor(Date.now() / 1000), exp });
  await query("insert into sessions (id, user_id, expires_at) values ($1,$2,to_timestamp($3))", [sessionId, user.id, exp]);
  await query("delete from wallet_challenges where lower(address) = lower($1)", [address]);
  const profile = await buildMePayload(user.id);

  json(
    res,
    200,
    { user: profile ?? user, session: { expiresAt: new Date(exp * 1000).toISOString() } },
    { "Set-Cookie": sessionCookie(token) },
  );
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
  const accountType = body.accountType === "project" ? "project" : body.accountType === "user" ? "user" : user.accountType;
  const nextHandle = typeof body.handle === "string" && body.handle.trim()
    ? sanitizeHandle(body.handle)
    : user.handle;
  const website = typeof body.website === "string" ? body.website.trim() : user.website || "";

  if (!nextHandle) {
    return json(res, 400, { error: "A valid handle is required." });
  }

  const taken = await query(
    "select id from users where lower(handle) = lower($1) and id <> $2 limit 1",
    [nextHandle, user.id],
  );
  if (taken.rows[0]) {
    return json(res, 409, { error: "That handle is already in use." });
  }

  const updated = await query(
    `
    update users
    set display_name = $2, bio = $3, avatar = $4, banner = $5, account_type = $6, handle = $7, website = $8, updated_at = now()
    where id = $1
    returning *
    `,
    [user.id, displayName, bio, avatar, banner, accountType, nextHandle, website],
  );
  json(res, 200, { user: userRow(updated.rows[0]) });
}

async function handleLogout(req, res) {
  const user = await requireUser(req, res);
  if (!user) return;
  await revokeSessionsByUser(user.id);
  json(
    res,
    200,
    { ok: true },
    { "Set-Cookie": `${COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=${isProd ? "None" : "Lax"}${isProd ? "; Secure" : ""}` },
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
  const redirectTo = url.searchParams.get("returnTo") || `${CLIENT_ORIGIN}/profile?x=connect`;
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
  const stateRow = await query("select * from x_oauth_states where state = $1 and expires_at > now() limit 1", [state]);
  if (!stateRow.rows[0]) {
    return redirect(res, `${CLIENT_ORIGIN}/profile?x=invalid-state`);
  }
  if (error) {
    return redirect(res, `${stateRow.rows[0].redirect_to}?x=error&reason=${encodeURIComponent(errorDesc || error)}`);
  }
  if (!code) {
    return redirect(res, `${stateRow.rows[0].redirect_to}?x=missing-code`);
  }
  try {
    const token = await exchangeXCode(code, stateRow.rows[0].code_verifier);
    const meRes = await fetch(X_ME_URL, {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });
    if (!meRes.ok) throw new Error(`X profile lookup failed with ${meRes.status}`);
    const meJson = await meRes.json();
    const xUser = meJson?.data || {};
    await query(
      `
      update users
      set x_connected = true,
          x_user_id = $2,
          x_handle = $3,
          project_verified = case when account_type = 'project' then true else project_verified end,
          updated_at = now()
      where id = $1
      `,
      [stateRow.rows[0].user_id, xUser.id || null, xUser.username || null],
    );
    await query("delete from x_oauth_states where state = $1", [state]);
    redirect(res, `${stateRow.rows[0].redirect_to}?x=connected`);
  } catch (err) {
    redirect(res, `${stateRow.rows[0].redirect_to}?x=error&reason=${encodeURIComponent(err instanceof Error ? err.message : "x oauth failed")}`);
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
  if (!address) {
    return json(res, 400, { error: "Token contract address is required." });
  }
  try {
    const token = await fetchTokenMetadataFromChain(address);
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
    const body = await readBody(req);
    const title = String(body.title || "").trim();
    const description = String(body.description || "").trim();
    const category = String(body.category || "Memes");
    const cover = String(body.cover || seed.challenges[0]?.cover || "");
    const requestedRewardToken = String(body.rewardToken || "BNB");
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
    if (!title || !description || !category || !cover || !requestedRewardToken || !rewardAmount || !winners) {
      return json(res, 400, { error: "Title, description, cover, reward, and winners are required." });
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
        rewardTokenMeta = await fetchTokenMetadataFromChain(
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
          : rewardToken === "BNB"
            ? bnbMarket.price
            : rewardToken === "ETH"
              ? 3200
              : rewardToken === "CAKE"
                ? 2.5
                : 0.002),
      );
    }

    const inserted = await query(
      `
      insert into campaigns
        (id, slug, title, cover, category, reward_pool, reward_token, reward_token_meta, reward_amount, winners, creator, participants, starts_at, ends_at, submission_type, description, rules, proof, required_tags, official, trending)
      values
        ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11::jsonb,0,now(), now() + ($12 || ' days')::interval, $13,$14,$15::jsonb,$16::jsonb,$17::jsonb,$18,50)
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
  const featuredRows = await query("select * from campaigns where official = true order by trending desc, created_at desc limit 12");
  const pendingProjects = accountRows.rows.filter((row) => row.account_type === "project" && !row.project_verified && !row.x_connected).length;
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
    featuredCampaigns: featuredRows.rows.map(campaignRow),
  });
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

async function handlePublic(req, res) {
  const [campaignsCount, submissionsCount, usersCount, totalRewards, featuredRows, leaders] = await Promise.all([
    query("select count(*)::int as count from campaigns"),
    query("select count(*)::int as count from submissions"),
    query("select count(*)::int as count from users"),
    query("select coalesce(sum(reward_pool), 0)::numeric as total from campaigns"),
    query("select * from campaigns order by trending desc, created_at desc limit 3"),
    query("select * from users order by earned desc, wins desc, updated_at desc limit 12"),
  ]);
  const leaderboard = buildLeaderboard(leaders.rows);
  json(res, 200, {
    appName: APP_NAME,
    xHandle: X_HANDLE,
    xUrl: `https://x.com/${X_HANDLE}`,
    platformStats: {
      activeChallenges: campaignsCount.rows[0].count,
      totalRewards: Number(totalRewards.rows[0].total),
      creators: usersCount.rows[0].count,
      submissions: submissionsCount.rows[0].count,
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

function buildLeaderboard(rows) {
  const mapped = rows.map((row, index) => {
    const user = userRow(row);
    return {
      id: user.id,
      rank: index + 1,
      name: user.name,
      handle: user.xHandle || user.handle,
      avatar: user.avatar,
      verified: user.accountType === "project" ? !!user.projectVerified : !!user.xConnected,
      accountType: user.accountType,
      value: user.earned,
      wins: user.wins,
      delta: 0,
    };
  });
  return {
    winners: mapped,
    contributors: mapped.map((row) => ({ ...row, value: row.wins * 100 + row.value })),
    projects: mapped,
  };
}

async function handleLeaderboard(req, res) {
  const leaders = await query("select * from users order by earned desc, wins desc, updated_at desc limit 25");
  json(res, 200, buildLeaderboard(leaders.rows));
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

async function handleProject(req, res, handle) {
  const userResult = await query(
    "select * from users where account_type = 'project' and (lower(handle) = lower($1) or lower(x_handle) = lower($1)) limit 1",
    [handle],
  );
  if (!userResult.rows[0]) return json(res, 404, { error: "Project not found." });
  const user = userRow(userResult.rows[0]);
  const campaigns = await query("select * from campaigns where creator->>'id' = $1 order by created_at desc limit 12", [user.id]);
  json(res, 200, {
    project: projectProfileFromUser(user, campaigns.rows.map(campaignRow)),
    campaigns: campaigns.rows.map(campaignRow),
  });
}

async function handlePublicUser(req, res, handle) {
  const userResult = await query(
    "select * from users where account_type = 'user' and (lower(handle) = lower($1) or lower(x_handle) = lower($1)) limit 1",
    [handle],
  );
  if (!userResult.rows[0]) return json(res, 404, { error: "User not found." });
  const account = userRow(userResult.rows[0]);
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
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
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
    if (url.pathname === "/api/auth/wallet/challenge" && req.method === "GET") return handleWalletChallenge(req, res, url);
    if (url.pathname === "/api/auth/wallet/verify" && req.method === "POST") return handleWalletVerify(req, res);
    if (url.pathname === "/api/auth/logout" && req.method === "POST") return handleLogout(req, res);
    if (url.pathname === "/api/auth/x/start" && req.method === "GET") return handleXStart(req, res, url);
    if (url.pathname === "/api/auth/x/callback" && req.method === "GET") return handleXCallback(req, res, url);
    if (url.pathname === "/api/me" && req.method === "GET") return handleMeGet(req, res);
    if (url.pathname === "/api/me" && req.method === "PATCH") return handleMePatch(req, res);
    if (url.pathname === "/api/campaigns" && (req.method === "GET" || req.method === "POST")) return handleCampaigns(req, res, url);
    if (/^\/api\/campaigns\/[^/]+$/.test(url.pathname) && req.method === "GET") {
      return handleCampaignBySlug(req, res, decodeURIComponent(url.pathname.split("/").pop()));
    }
    if (/^\/api\/campaigns\/[^/]+\/join$/.test(url.pathname) && req.method === "POST") {
      return handleJoinCampaign(req, res, decodeURIComponent(url.pathname.split("/")[3]));
    }
    if (/^\/api\/campaigns\/[^/]+\/submissions$/.test(url.pathname) && req.method === "POST") {
      return handleSubmitCampaign(req, res, decodeURIComponent(url.pathname.split("/")[3]));
    }
    if (url.pathname === "/api/admin/summary" && req.method === "GET") return handleAdminSummary(req, res);
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
