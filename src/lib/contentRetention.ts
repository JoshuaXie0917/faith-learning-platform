import type { Prisma } from "@prisma/client";

// Content retention policy (Phase 2B). Relative imports only, so this module can
// be compiled and tested on its own.
//
// - Clock: Content.createdAt, six calendar months, UTC.
// - Nothing is overdue before LEGACY_RETENTION_FLOOR, so legacy browser favorites
//   can still sync to the server until then.
// - Overdue published Content is public only to visitors who favorited it.
// - Soft-deleted Content is never public; it becomes eligible for hard deletion at
//   the later of createdAt + 6 months and deletedAt + 30 days, favorites or not.
// - Drafts (not published, not deleted) are never deleted automatically.

export const CONTENT_RETENTION_MONTHS = 6;
export const SOFT_DELETE_GRACE_DAYS = 30;
// 2027-03-30 00:00 America/Halifax.
export const LEGACY_RETENTION_FLOOR = new Date("2027-03-30T03:00:00.000Z");

export const VISITOR_KEY_COOKIE = "readVisitorKey";
const MAX_VISITOR_KEY_LENGTH = 120;

// Mirrors PostgreSQL `timestamp - interval 'N months'`: the day is clamped to the
// last day of the target month (31 August - 6 months = 28/29 February).
export function subtractUtcMonths(date: Date, months: number): Date {
  const total = date.getUTCFullYear() * 12 + date.getUTCMonth() - months;
  const year = Math.floor(total / 12);
  const month = total - year * 12;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

  return new Date(
    Date.UTC(
      year,
      month,
      Math.min(date.getUTCDate(), lastDay),
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
      date.getUTCMilliseconds()
    )
  );
}

// Content created at or before this instant is overdue; null before the floor.
export function getOverdueCutoff(now: Date = new Date()): Date | null {
  if (now.getTime() < LEGACY_RETENTION_FLOOR.getTime()) return null;
  return subtractUtcMonths(now, CONTENT_RETENTION_MONTHS);
}

// Soft-deleted Content deleted at or before this instant has passed its grace period.
export function getSoftDeleteGraceCutoff(now: Date = new Date()): Date {
  return new Date(now.getTime() - SOFT_DELETE_GRACE_DAYS * 24 * 60 * 60 * 1000);
}

// Same normalization the favorites API uses when it stores visitor keys.
export function normalizeVisitorKey(value: string | null | undefined): string {
  return String(value ?? "").trim().slice(0, MAX_VISITOR_KEY_LENGTH);
}

// The one public visibility rule. Admin pages do not use it.
export function publicContentWhere(
  now: Date = new Date(),
  visitorKey?: string | null
): Prisma.ContentWhereInput {
  const cutoff = getOverdueCutoff(now);
  const key = normalizeVisitorKey(visitorKey);

  if (!cutoff) {
    return { status: "published", deletedAt: null };
  }

  return {
    status: "published",
    deletedAt: null,
    OR: [
      { createdAt: { gt: cutoff } },
      ...(key ? [{ favorites: { some: { visitorKey: key } } }] : []),
    ],
  };
}
