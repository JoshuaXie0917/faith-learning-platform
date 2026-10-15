import { Prisma, type PrismaClient } from "@prisma/client";
import {
  countVisitorFavorites,
  MAX_TOTAL_FAVORITES,
  withFavoriteMutationLock,
} from "./favoriteLimit";

// Deleting and favoriting Shares. Relative imports only, so it can be tested
// against a disposable database without HTTP.
//
// Explicit deletion (by the owner's browser or by an admin) is immediate: the
// Share is soft-deleted, which hides it from every public read at once, and all
// of its favorites are removed in the same transaction, so no favorite keeps it
// stored and no visitor keeps a slot for something they can no longer see.
// Share retention then removes soft-deleted Shares on its next run, favorites or
// not.

export type ShareDeleteResult = "deleted" | "not-found" | "forbidden";
export type ShareFavoriteResult = "saved" | "not-found" | "limit";

const MAX_ID_LENGTH = 120;

export function normalizeShareId(value: unknown): string {
  return typeof value === "string" ? value.trim().slice(0, MAX_ID_LENGTH) : "";
}

// ownerKey given: only that browser's own Share may be deleted (owner route).
// ownerKey omitted: any stored Share (admin removal; the caller must have called
// requireAdmin() first).
export async function deleteShare(
  database: PrismaClient,
  id: string,
  options: { ownerKey?: string; now?: Date } = {}
): Promise<ShareDeleteResult> {
  if (!id) return "not-found";

  return database.$transaction(
    async (transaction) => {
      // FOR UPDATE conflicts with the FOR KEY SHARE that adding a favorite takes,
      // so a favorite is either committed before this point (and removed below)
      // or sees the Share as deleted.
      const rows = await transaction.$queryRaw<{ ownerKey: string }[]>`
        SELECT "ownerKey" FROM "Share"
        WHERE "id" = ${id} AND "deletedAt" IS NULL
        FOR UPDATE
      `;

      if (rows.length === 0) return "not-found";
      if (options.ownerKey !== undefined && rows[0].ownerKey !== options.ownerKey) {
        return "forbidden";
      }

      await transaction.shareFavorite.deleteMany({ where: { shareId: id } });
      await transaction.share.update({
        where: { id },
        data: { deletedAt: options.now ?? new Date() },
      });

      return "deleted";
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      maxWait: 10_000,
      timeout: 15_000,
    }
  );
}

// A visitor may favorite a Share they can see: not deleted, and either still in
// its public window or already favorited by them (repeat requests stay "saved").
// Expired Shares the visitor never favorited are not visible to them, so they
// cannot be favorited (and kept from cleanup) by guessing an id.
export async function addShareFavorite(
  database: PrismaClient,
  id: string,
  visitorKey: string,
  now: Date = new Date()
): Promise<ShareFavoriteResult> {
  if (!id || !visitorKey) return "not-found";

  return withFavoriteMutationLock(
    visitorKey,
    async (transaction) => {
      // Hold the parent row until the favorite is committed. Cleanup and deletion
      // take FOR UPDATE, so either this insert wins or the Share is unavailable.
      const shares = await transaction.$queryRaw<{ expiresAt: Date }[]>`
        SELECT "expiresAt" FROM "Share"
        WHERE "id" = ${id} AND "deletedAt" IS NULL
        FOR KEY SHARE
      `;

      if (shares.length === 0) return "not-found";

      const existingFavorite = await transaction.shareFavorite.findUnique({
        where: { shareId_visitorKey: { shareId: id, visitorKey } },
        select: { id: true },
      });

      if (existingFavorite) return "saved";
      if (shares[0].expiresAt.getTime() <= now.getTime()) return "not-found";

      const totalFavoriteCount = await countVisitorFavorites(transaction, visitorKey);
      if (totalFavoriteCount >= MAX_TOTAL_FAVORITES) return "limit";

      await transaction.shareFavorite.create({
        data: { shareId: id, visitorKey },
      });

      return "saved";
    },
    database
  );
}
