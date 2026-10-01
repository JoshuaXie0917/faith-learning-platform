import { createHash, timingSafeEqual } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BATCH_LIMIT = 100;
const UTC_NOW = Prisma.sql`(CURRENT_TIMESTAMP AT TIME ZONE 'UTC')`;
const EFFECTIVE_DEADLINE = Prisma.sql`GREATEST(s."expiresAt", s."createdAt" + INTERVAL '168 hours')`;
const ELIGIBLE_SHARE = Prisma.sql`
  s."expiresAt" <= ${UTC_NOW}
  AND s."createdAt" + INTERVAL '168 hours' <= ${UTC_NOW}
  AND NOT EXISTS (
    SELECT 1 FROM "ShareFavorite" AS f WHERE f."shareId" = s."id"
  )
`;

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");

  if (!secret || !authorization?.startsWith("Bearer ")) return false;

  const supplied = authorization.slice("Bearer ".length);
  const expectedHash = createHash("sha256").update(secret).digest();
  const suppliedHash = createHash("sha256").update(supplied).digest();
  return timingSafeEqual(expectedHash, suppliedHash);
}

export async function HEAD() {
  return new Response(null, { status: 405, headers: { Allow: "GET" } });
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const queryEntries = Array.from(searchParams.entries());
  const dryRun =
    queryEntries.length === 1 &&
    queryEntries[0][0] === "dryRun" &&
    queryEntries[0][1] === "true";
  if (queryEntries.length !== 0 && !dryRun) {
    return Response.json({ error: "Invalid query parameters" }, { status: 400 });
  }

  try {
    if (dryRun) {
      const { totalEligibleCount, shares } = await prisma.$transaction(
        async (transaction) => {
          const [total] = await transaction.$queryRaw<{ count: bigint }[]>`
            SELECT COUNT(*) AS count FROM "Share" AS s
            WHERE ${ELIGIBLE_SHARE}
          `;
          const shares = await transaction.$queryRaw<{
            id: string;
            expiresAt: Date;
            effectiveExpiresAt: Date;
            deletedAt: Date | null;
            favoriteCount: number;
          }[]>`
            SELECT s."id", s."expiresAt", s."deletedAt",
                   ${EFFECTIVE_DEADLINE} AS "effectiveExpiresAt",
                   0::integer AS "favoriteCount"
            FROM "Share" AS s
            WHERE ${ELIGIBLE_SHARE}
            ORDER BY s."expiresAt", s."id"
            LIMIT ${BATCH_LIMIT}
          `;
          return { totalEligibleCount: Number(total.count), shares };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead }
      );

      return Response.json({
        dryRun: true,
        totalEligibleCount,
        shares: shares.map((share) => ({
          id: share.id,
          expiresAt: share.expiresAt.toISOString(),
          effectiveExpiresAt: share.effectiveExpiresAt.toISOString(),
          softDeleted: share.deletedAt !== null,
          favoriteCount: share.favoriteCount,
        })),
      });
    }

    if (process.env.SHARE_RETENTION_DELETE_ENABLED !== "true") {
      return Response.json({ enabled: false, deletedCount: 0, deletedIds: [] });
    }

    const result = await prisma.$transaction(
      async (transaction) => {
        // The two-int advisory key is separate from the bigint visitor locks.
        const [lock] = await transaction.$queryRaw<{ acquired: boolean }[]>`
          SELECT pg_try_advisory_xact_lock(17474, 1) AS acquired
        `;
        if (!lock?.acquired) {
          return { skipped: "overlap" as const, deletedIds: [] as string[] };
        }

        const candidates = await transaction.$queryRaw<{ id: string }[]>`
          SELECT s."id" FROM "Share" AS s
          WHERE ${ELIGIBLE_SHARE}
          ORDER BY s."expiresAt", s."id"
          LIMIT ${BATCH_LIMIT}
          FOR UPDATE OF s SKIP LOCKED
        `;
        if (candidates.length === 0) return { deletedIds: [] as string[] };

        // Fresh statement after locking: check both predicates again at
        // deletion time. The parent row locks block new favorite inserts.
        const deleted = await transaction.$queryRaw<{ id: string }[]>(
          Prisma.sql`
            DELETE FROM "Share" AS s
            WHERE s."id" IN (${Prisma.join(candidates.map((share) => share.id))})
              AND ${ELIGIBLE_SHARE}
            RETURNING s."id"
          `
        );
        return { deletedIds: deleted.map((share) => share.id) };
      },
      { maxWait: 2000, timeout: 15000 }
    );

    return Response.json({
      enabled: true,
      deletedCount: result.deletedIds.length,
      deletedIds: result.deletedIds,
      ...(result.skipped ? { skipped: result.skipped } : {}),
    });
  } catch (error) {
    console.error("Share retention cleanup failed:", error);
    return Response.json({ error: "Share retention failed" }, { status: 500 });
  }
}
