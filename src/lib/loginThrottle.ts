import { createHmac, randomBytes } from "node:crypto";
import { Prisma, type PrismaClient } from "@prisma/client";

// Admin login throttling, shared across serverless instances through the
// LoginThrottle table. Relative imports only, so it can be tested on its own.
//
// - Each login attempt from a client counts before the password is checked, so
//   parallel requests cannot get more than LOGIN_MAX_ATTEMPTS password checks.
// - The attempt after LOGIN_MAX_ATTEMPTS within LOGIN_WINDOW_MS starts a block of
//   LOGIN_BLOCK_MS; blocked requests are refused without checking the password.
// - A successful login deletes the client's row.
// - Rows store an HMAC of the client address, never the address itself. The HMAC key
//   is CRON_SECRET (random, high entropy) and deliberately not ADMIN_PASSWORD: a key
//   derived from the password would let anyone who can read the table test password
//   guesses offline against a row made from their own address.

export const LOGIN_MAX_ATTEMPTS = 5;
export const LOGIN_WINDOW_MS = 15 * 60 * 1000;
export const LOGIN_BLOCK_MS = 15 * 60 * 1000;
const STALE_AFTER_MS = 24 * 60 * 60 * 1000;
const PRUNE_BATCH = 100;

type ThrottleClient = Pick<PrismaClient, "$queryRaw" | "$executeRaw">;

function utc(date: Date) {
  return Prisma.sql`(${date.toISOString()}::timestamptz AT TIME ZONE 'UTC')`;
}

function expandIpv6(ip: string): string[] | null {
  const halves = ip.split("::");
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(":") : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const missing = 8 - head.length - tail.length;
  if (halves.length === 1 ? head.length !== 8 : missing < 1) return null;
  const groups = [...head, ...Array<string>(halves.length === 2 ? missing : 0).fill("0"), ...tail];
  if (groups.some((g) => !/^[0-9a-f]{1,4}$/.test(g))) return null;
  return groups.map((g) => g.padStart(4, "0"));
}

// IPv4 as is; IPv6 grouped by /64, so one client cannot rotate through its own prefix.
export function normalizeClientAddress(value: string): string {
  let ip = value.trim().toLowerCase();
  if (ip.startsWith("[")) {
    const end = ip.indexOf("]");
    ip = end > 0 ? ip.slice(1, end) : ip.slice(1);
  } else if (/^\d{1,3}(?:\.\d{1,3}){3}:\d+$/.test(ip)) {
    ip = ip.slice(0, ip.lastIndexOf(":"));
  }
  ip = ip.split("%")[0];
  if (/^::ffff:\d{1,3}(?:\.\d{1,3}){3}$/.test(ip)) ip = ip.slice("::ffff:".length);
  if (ip.includes(":")) {
    const groups = expandIpv6(ip);
    return groups ? `${groups.slice(0, 4).join(":")}::/64` : ip.slice(0, 64);
  }
  return ip.slice(0, 64);
}

// On Vercel the platform sets x-forwarded-for to the real client address.
export function getClientAddress(headers: Headers): string {
  const forwarded = (headers.get("x-forwarded-for") ?? "").split(",")[0]?.trim() ?? "";
  const address = forwarded || (headers.get("x-real-ip") ?? "").trim();
  return normalizeClientAddress(address) || "unknown";
}

// Without CRON_SECRET (local development, Preview) each server process uses its own
// random key: throttling still works within that process.
const PROCESS_KEY = randomBytes(32).toString("hex");

export function getThrottleSecret(cronSecret: string | undefined = process.env.CRON_SECRET): string {
  return cronSecret || PROCESS_KEY;
}

export function hashClientAddress(address: string, secret: string): string {
  return createHmac("sha256", secret).update(`admin-login:${address}`).digest("hex");
}

export async function registerLoginAttempt(
  db: ThrottleClient,
  key: string,
  now: Date = new Date()
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  const windowCutoff = new Date(now.getTime() - LOGIN_WINDOW_MS);
  const blockUntil = new Date(now.getTime() + LOGIN_BLOCK_MS);

  // One statement, so concurrent attempts from the same client are counted exactly.
  // In DO UPDATE, every t."column" refers to the row as it was before this attempt.
  const rows = await db.$queryRaw<{ attempts: number; blockedUntil: Date | null }[]>(Prisma.sql`
    INSERT INTO "LoginThrottle" AS t ("key", "attempts", "windowStart", "blockedUntil", "updatedAt")
    VALUES (${key}, 1, ${utc(now)}, NULL, ${utc(now)})
    ON CONFLICT ("key") DO UPDATE SET
      "attempts" = CASE
        WHEN t."blockedUntil" > ${utc(now)} THEN t."attempts"
        WHEN t."windowStart" > ${utc(windowCutoff)} THEN t."attempts" + 1
        ELSE 1
      END,
      "blockedUntil" = CASE
        WHEN t."blockedUntil" > ${utc(now)} THEN t."blockedUntil"
        WHEN t."windowStart" > ${utc(windowCutoff)} AND t."attempts" + 1 > ${LOGIN_MAX_ATTEMPTS} THEN ${utc(blockUntil)}
        ELSE NULL
      END,
      "windowStart" = CASE
        WHEN t."blockedUntil" > ${utc(now)} OR t."windowStart" > ${utc(windowCutoff)} THEN t."windowStart"
        ELSE ${utc(now)}
      END,
      "updatedAt" = ${utc(now)}
    RETURNING "attempts", "blockedUntil"
  `);

  const blockedUntil = rows[0]?.blockedUntil ?? null;
  if (!blockedUntil) return { allowed: true, retryAfterSeconds: 0 };
  return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((blockedUntil.getTime() - now.getTime()) / 1000)) };
}

export async function clearLoginAttempts(db: ThrottleClient, key: string) {
  await db.$executeRaw`DELETE FROM "LoginThrottle" WHERE "key" = ${key}`;
}

// Bounded cleanup on every attempt: rows untouched for a day are long past any
// window or block. At most PRUNE_BATCH rows per call.
export async function pruneLoginThrottle(db: ThrottleClient, now: Date = new Date()) {
  const cutoff = new Date(now.getTime() - STALE_AFTER_MS);
  return db.$executeRaw(Prisma.sql`
    DELETE FROM "LoginThrottle"
    WHERE "key" IN (
      SELECT "key" FROM "LoginThrottle" WHERE "updatedAt" < ${utc(cutoff)} LIMIT ${PRUNE_BATCH}
    )
  `);
}
