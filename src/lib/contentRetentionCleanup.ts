import { Prisma, type PrismaClient } from "@prisma/client";
import { isCronAuthorized } from "./cronAuth";
import {
  getOverdueCutoff,
  getSoftDeleteGraceCutoff,
  LEGACY_RETENTION_FLOOR,
} from "./contentRetention";

// Daily Content retention cleanup (Phase 2B). Relative imports only, so the job can
// be tested against a disposable database without HTTP. See docs/content-retention.md.

export const CLEANUP_BATCH_LIMIT = 25;
export const OUTBOX_BATCH_LIMIT = 25;
export const OUTBOX_MAX_ATTEMPTS = 8;
const OUTBOX_CLAIM_MS = 10 * 60 * 1000;
const RESOURCE_PREFIX = "resources/";
const BLOB_PUBLIC_HOST_SUFFIX = ".public.blob.vercel-storage.com";
const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;

export type DeleteBlob = (url: string, options: { token: string }) => Promise<unknown>;

export type RetentionEnv = {
  CRON_SECRET?: string;
  CONTENT_RETENTION_DELETE_ENABLED?: string;
  CONTENT_RETENTION_DELETE_NOT_BEFORE?: string;
  BLOB_READ_WRITE_TOKEN?: string;
};

export type RetentionDeps = {
  prisma: PrismaClient;
  env: RetentionEnv;
  deleteBlob: DeleteBlob;
  now?: () => Date;
};

type OutboxSummary = {
  claimed: number;
  deleted: number;
  skippedReferenced: number;
  skippedOutOfScope: number;
  retryScheduled: number;
  tokenMissing: boolean;
  pending: number;
  stuck: number;
};

// This project's public Blob host, derived from the store ID inside
// BLOB_READ_WRITE_TOKEN (vercel_blob_rw_<storeId>_<secret>), the same credential
// that deletes Blobs. Null when the token is missing or malformed.
export function getProjectBlobHost(token: string | undefined): string | null {
  const parts = (token ?? "").trim().split("_");
  if (parts.length < 5 || parts[0] !== "vercel" || parts[1] !== "blob" || parts[2] !== "rw") return null;
  const storeId = parts[3];
  if (!/^[A-Za-z0-9]{1,64}$/.test(storeId)) return null;
  return `${storeId.toLowerCase()}${BLOB_PUBLIC_HOST_SUFFIX}`;
}

// A Content Blob may be deleted only when it is in this project's own public Blob
// store under resources/ (where AudioBlobUploadField uploads). Series covers live
// under series-images/ and are never touched here.
export function getBlobPathnameInScope(url: string | null | undefined, projectHost: string | null): string | null {
  if (!url || !projectHost) return null;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  if (
    parsed.protocol !== "https:" ||
    parsed.username ||
    parsed.password ||
    parsed.port ||
    parsed.search ||
    parsed.hash ||
    parsed.hostname !== projectHost
  ) {
    return null;
  }

  let pathname: string;
  try {
    pathname = decodeURIComponent(parsed.pathname).replace(/^\//, "");
  } catch {
    return null;
  }

  if (
    !pathname.startsWith(RESOURCE_PREFIX) ||
    pathname.length <= RESOURCE_PREFIX.length ||
    pathname.length > 300 ||
    pathname.includes("..") ||
    pathname.includes("\\") ||
    /[\u0000-\u001f]/.test(pathname)
  ) {
    return null;
  }

  return pathname;
}

// Deletion needs CONTENT_RETENTION_DELETE_ENABLED=true, a well-formed
// CONTENT_RETENTION_DELETE_NOT_BEFORE (UTC ISO) and a well-formed BLOB_READ_WRITE_TOKEN
// (it defines which Blob store may be cleaned). Anything missing or malformed keeps
// deletion off. The legacy floor applies even if the setting is earlier.
export function getDeletionGate(env: RetentionEnv, now: Date) {
  if (env.CONTENT_RETENTION_DELETE_ENABLED !== "true") {
    return { allowed: false as const, reason: "disabled" };
  }

  const raw = env.CONTENT_RETENTION_DELETE_NOT_BEFORE?.trim() ?? "";
  if (!raw) return { allowed: false as const, reason: "not-before-missing" };

  const parsed = new Date(raw);
  if (
    !ISO_UTC.test(raw) ||
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 19) !== raw.slice(0, 19)
  ) {
    return { allowed: false as const, reason: "not-before-malformed" };
  }

  if (!getProjectBlobHost(env.BLOB_READ_WRITE_TOKEN)) {
    return { allowed: false as const, reason: "blob-token-missing" };
  }

  const notBefore = new Date(Math.max(parsed.getTime(), LEGACY_RETENTION_FLOOR.getTime()));
  if (now.getTime() < notBefore.getTime()) {
    return { allowed: false as const, reason: "before-not-before", notBefore: notBefore.toISOString() };
  }

  return { allowed: true as const, notBefore: notBefore.toISOString() };
}

// Timestamp columns are `timestamp(3)` holding UTC; parameters are cast explicitly
// so the session time zone cannot shift comparisons.
function utc(date: Date) {
  return Prisma.sql`(${date.toISOString()}::timestamptz AT TIME ZONE 'UTC')`;
}

// Hard-delete eligibility (the same predicate is re-evaluated inside the DELETE):
// - published, not deleted, overdue, and no favorite at all; or
// - soft-deleted (any status), overdue, and deleted at least 30 days ago.
// Drafts that are not soft-deleted never match.
function eligibleContentSql(cutoff: Date, graceCutoff: Date) {
  return Prisma.sql`
    c."createdAt" <= ${utc(cutoff)}
    AND (
      (
        c."deletedAt" IS NULL
        AND c."status" = 'published'
        AND NOT EXISTS (SELECT 1 FROM "ContentFavorite" AS f WHERE f."contentId" = c."id")
      )
      OR (c."deletedAt" IS NOT NULL AND c."deletedAt" <= ${utc(graceCutoff)})
    )
  `;
}

function sanitizeError(error: unknown) {
  const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  return message.replace(/https?:\/\/\S+/gi, "[url]").slice(0, 300);
}

async function countOutbox(prisma: PrismaClient) {
  const [pending, stuck] = await Promise.all([
    prisma.blobDeletionOutbox.count({ where: { attempts: { lt: OUTBOX_MAX_ATTEMPTS } } }),
    prisma.blobDeletionOutbox.count({ where: { attempts: { gte: OUTBOX_MAX_ATTEMPTS } } }),
  ]);
  return { pending, stuck };
}

export async function dryRunContentRetention(prisma: PrismaClient, env: RetentionEnv, now: Date) {
  const cutoff = getOverdueCutoff(now);
  const graceCutoff = getSoftDeleteGraceCutoff(now);
  const gate = getDeletionGate(env, now);
  const base = {
    dryRun: true,
    now: now.toISOString(),
    legacyFloor: LEGACY_RETENTION_FLOOR.toISOString(),
    overdueCutoff: cutoff ? cutoff.toISOString() : null,
    softDeleteGraceCutoff: graceCutoff.toISOString(),
    deletion: { allowed: gate.allowed, reason: gate.allowed ? null : gate.reason },
    batchLimit: CLEANUP_BATCH_LIMIT,
  };

  if (!cutoff) {
    return { ...base, eligibleCount: 0, candidates: [], outbox: await countOutbox(prisma) };
  }

  const eligible = eligibleContentSql(cutoff, graceCutoff);
  const { eligibleCount, rows } = await prisma.$transaction(
    async (transaction) => {
      const [total] = await transaction.$queryRaw<{ count: bigint }[]>(
        Prisma.sql`SELECT COUNT(*) AS count FROM "Content" AS c WHERE ${eligible}`
      );
      const rows = await transaction.$queryRaw<
        {
          id: string;
          createdAt: Date;
          deletedAt: Date | null;
          status: string;
          resourceUrl: string | null;
          favoriteCount: number;
        }[]
      >(Prisma.sql`
        SELECT c."id", c."createdAt", c."deletedAt", c."status", c."resourceUrl",
               (SELECT COUNT(*)::integer FROM "ContentFavorite" AS f WHERE f."contentId" = c."id") AS "favoriteCount"
        FROM "Content" AS c
        WHERE ${eligible}
        ORDER BY c."createdAt", c."id"
        LIMIT ${CLEANUP_BATCH_LIMIT}
      `);
      return { eligibleCount: Number(total.count), rows };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead }
  );

  return {
    ...base,
    eligibleCount,
    candidates: rows.map((row) => ({
      id: row.id,
      createdAt: row.createdAt.toISOString(),
      status: row.status,
      softDeleted: row.deletedAt !== null,
      favoriteCount: row.favoriteCount,
      hasResourceUrl: Boolean(row.resourceUrl?.trim()),
      blobInScope: getBlobPathnameInScope(row.resourceUrl, getProjectBlobHost(env.BLOB_READ_WRITE_TOKEN)) !== null,
    })),
    outbox: await countOutbox(prisma),
  };
}

// Phase 1: one transaction, at most 25 rows, no Blob calls.
export async function deleteRetentionBatch(prisma: PrismaClient, now: Date, projectHost: string) {
  const cutoff = getOverdueCutoff(now);
  const empty = { deletedIds: [] as string[], enqueuedBlobs: 0 };
  if (!cutoff) return empty;

  const eligible = eligibleContentSql(cutoff, getSoftDeleteGraceCutoff(now));

  return prisma.$transaction(
    async (transaction) => {
      const [lock] = await transaction.$queryRaw<{ acquired: boolean }[]>`
        SELECT pg_try_advisory_xact_lock(17474, 2) AS acquired
      `;
      if (!lock?.acquired) return { ...empty, skipped: "overlap" as const };

      const candidates = await transaction.$queryRaw<{ id: string }[]>(Prisma.sql`
        SELECT c."id" FROM "Content" AS c
        WHERE ${eligible}
        ORDER BY c."createdAt", c."id"
        LIMIT ${CLEANUP_BATCH_LIMIT}
        FOR UPDATE OF c SKIP LOCKED
      `);
      if (candidates.length === 0) return empty;

      // Final recheck at deletion time, including favorites. The row locks above
      // block a concurrent favorite insert until this transaction ends.
      const deleted = await transaction.$queryRaw<{ id: string; resourceUrl: string | null }[]>(Prisma.sql`
        DELETE FROM "Content" AS c
        WHERE c."id" IN (${Prisma.join(candidates.map((row) => row.id))})
          AND ${eligible}
        RETURNING c."id", c."resourceUrl"
      `);

      const blobs = new Map<string, { url: string; pathname: string; contentId: string }>();
      for (const row of deleted) {
        const pathname = getBlobPathnameInScope(row.resourceUrl, projectHost);
        if (row.resourceUrl && pathname && !blobs.has(row.resourceUrl)) {
          blobs.set(row.resourceUrl, { url: row.resourceUrl, pathname, contentId: row.id });
        }
      }
      if (blobs.size > 0) {
        await transaction.blobDeletionOutbox.createMany({
          data: Array.from(blobs.values()),
          skipDuplicates: true,
        });
      }

      return { deletedIds: deleted.map((row) => row.id), enqueuedBlobs: blobs.size };
    },
    { maxWait: 2000, timeout: 15000 }
  );
}

// Phase 2: after the Content transaction has committed. Each claimed Blob is deleted
// only if it is in scope and no Content or Series row still references the URL.
export async function processBlobOutbox(
  prisma: PrismaClient,
  now: Date,
  token: string | undefined,
  deleteBlob: DeleteBlob
): Promise<OutboxSummary> {
  const summary = {
    claimed: 0,
    deleted: 0,
    skippedReferenced: 0,
    skippedOutOfScope: 0,
    retryScheduled: 0,
    tokenMissing: false,
  };

  const projectHost = getProjectBlobHost(token);
  if (!token || !projectHost) {
    return { ...summary, tokenMissing: true, ...(await countOutbox(prisma)) };
  }

  const claimedUntil = new Date(now.getTime() + OUTBOX_CLAIM_MS);
  const claimed = await prisma.$queryRaw<{ id: string; url: string; attempts: number }[]>(Prisma.sql`
    UPDATE "BlobDeletionOutbox" AS o
    SET "claimedUntil" = ${utc(claimedUntil)}, "updatedAt" = ${utc(now)}
    WHERE o."id" IN (
      SELECT q."id" FROM "BlobDeletionOutbox" AS q
      WHERE q."attempts" < ${OUTBOX_MAX_ATTEMPTS}
        AND (q."claimedUntil" IS NULL OR q."claimedUntil" <= ${utc(now)})
      ORDER BY q."createdAt", q."id"
      LIMIT ${OUTBOX_BATCH_LIMIT}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING o."id", o."url", o."attempts"
  `);

  for (const row of claimed) {
    summary.claimed += 1;
    const mine = { id: row.id, claimedUntil };

    const pathname = getBlobPathnameInScope(row.url, projectHost);
    if (!pathname) {
      await prisma.blobDeletionOutbox.deleteMany({ where: mine });
      summary.skippedOutOfScope += 1;
      continue;
    }

    // Any remaining Content or Series row (soft-deleted included) whose URL or text
    // contains this Blob's path, encoded or decoded, keeps the Blob. Conservative on
    // purpose: a false match only leaves a Blob behind.
    const rawPathname = new URL(row.url).pathname.replace(/^\//, "");
    const [reference] = await prisma.$queryRaw<{ referenced: boolean }[]>`
      SELECT (
        EXISTS (
          SELECT 1 FROM "Content" AS c
          WHERE strpos(concat_ws(' ', c."resourceUrl", c."description", c."contentBody"), ${rawPathname}) > 0
             OR strpos(concat_ws(' ', c."resourceUrl", c."description", c."contentBody"), ${pathname}) > 0
        )
        OR EXISTS (
          SELECT 1 FROM "Series" AS s
          WHERE strpos(concat_ws(' ', s."imageUrl", s."description"), ${rawPathname}) > 0
             OR strpos(concat_ws(' ', s."imageUrl", s."description"), ${pathname}) > 0
        )
      ) AS referenced
    `;
    if (reference?.referenced) {
      await prisma.blobDeletionOutbox.deleteMany({ where: mine });
      summary.skippedReferenced += 1;
      continue;
    }

    try {
      // del() does not throw when the Blob is already gone, so retries are safe.
      await deleteBlob(row.url, { token });
      await prisma.blobDeletionOutbox.deleteMany({ where: mine });
      summary.deleted += 1;
    } catch (error) {
      const attempts = row.attempts + 1;
      const backoffMs = Math.min(24 * 60, 60 * 2 ** (attempts - 1)) * 60 * 1000;
      await prisma.blobDeletionOutbox.updateMany({
        where: mine,
        data: { attempts, lastError: sanitizeError(error), claimedUntil: new Date(now.getTime() + backoffMs) },
      });
      summary.retryScheduled += 1;
    }
  }

  return { ...summary, ...(await countOutbox(prisma)) };
}

export async function handleContentRetentionRequest(request: Request, deps: RetentionDeps) {
  if (!isCronAuthorized(request, deps.env.CRON_SECRET)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const queryEntries = Array.from(new URL(request.url).searchParams.entries());
  const dryRun =
    queryEntries.length === 1 && queryEntries[0][0] === "dryRun" && queryEntries[0][1] === "true";
  if (queryEntries.length !== 0 && !dryRun) {
    return Response.json({ error: "Invalid query parameters" }, { status: 400 });
  }

  const now = deps.now ? deps.now() : new Date();

  try {
    if (dryRun) {
      return Response.json(await dryRunContentRetention(deps.prisma, deps.env, now));
    }

    const gate = getDeletionGate(deps.env, now);
    if (!gate.allowed) {
      return Response.json({ enabled: false, reason: gate.reason, deletedCount: 0, deletedIds: [] });
    }

    const projectHost = getProjectBlobHost(deps.env.BLOB_READ_WRITE_TOKEN);
    if (!projectHost) {
      return Response.json({ enabled: false, reason: "blob-token-missing", deletedCount: 0, deletedIds: [] });
    }

    const batch = await deleteRetentionBatch(deps.prisma, now, projectHost);
    const outbox = await processBlobOutbox(
      deps.prisma,
      now,
      deps.env.BLOB_READ_WRITE_TOKEN,
      deps.deleteBlob
    );

    console.log(
      `Content retention: deleted ${batch.deletedIds.length} [${batch.deletedIds.join(",")}]` +
        `${"skipped" in batch ? ` skipped=${batch.skipped}` : ""}; blobs deleted ${outbox.deleted},` +
        ` referenced ${outbox.skippedReferenced}, retry ${outbox.retryScheduled}, pending ${outbox.pending}`
    );

    return Response.json({
      enabled: true,
      deletedCount: batch.deletedIds.length,
      deletedIds: batch.deletedIds,
      enqueuedBlobs: batch.enqueuedBlobs,
      ...("skipped" in batch ? { skipped: batch.skipped } : {}),
      outbox,
    });
  } catch (error) {
    console.error("Content retention cleanup failed:", sanitizeError(error));
    return Response.json({ error: "Content retention failed" }, { status: 500 });
  }
}
