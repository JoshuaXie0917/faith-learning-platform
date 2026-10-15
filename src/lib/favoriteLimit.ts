import { Prisma, type PrismaClient } from "@prisma/client";
import { prisma } from "./prisma";

// Favorite limit shared by Content and Share favorites. Relative imports only, so
// it can be compiled and tested on its own.

export const MAX_TOTAL_FAVORITES = 30;

export async function withFavoriteMutationLock<T>(
  visitorKey: string,
  operation: (transaction: Prisma.TransactionClient) => Promise<T>,
  database: PrismaClient = prisma
) {
  return database.$transaction(
    async (transaction) => {
      await transaction.$queryRaw`
        SELECT pg_advisory_xact_lock(hashtextextended(${visitorKey}, 0)) IS NULL AS "locked"
      `;

      return operation(transaction);
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      maxWait: 10_000,
      timeout: 15_000,
    }
  );
}

// Only favorites the visitor can still see count toward the limit:
// - Content: published and not deleted (the same rule GET /api/contents/favorites
//   uses to list them);
// - Shares: not deleted. An expired Share stays visible to the visitors who
//   favorited it, so those favorites still count.
// Favorites of deleted or unpublished items are hidden and cannot be removed by
// the visitor, so they must not use up slots.
export async function countVisitorFavorites(
  transaction: Prisma.TransactionClient,
  visitorKey: string
) {
  const contentFavoriteCount = await transaction.contentFavorite.count({
    where: {
      visitorKey,
      content: {
        is: {
          status: "published",
          deletedAt: null,
        },
      },
    },
  });
  const shareFavoriteCount = await transaction.shareFavorite.count({
    where: {
      visitorKey,
      share: {
        is: {
          deletedAt: null,
        },
      },
    },
  });

  return contentFavoriteCount + shareFavoriteCount;
}
