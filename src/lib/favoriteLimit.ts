import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const MAX_TOTAL_FAVORITES = 30;

export async function withFavoriteMutationLock<T>(
  visitorKey: string,
  operation: (transaction: Prisma.TransactionClient) => Promise<T>
) {
  return prisma.$transaction(
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

export async function countVisitorFavorites(
  transaction: Prisma.TransactionClient,
  visitorKey: string
) {
  const contentFavoriteCount = await transaction.contentFavorite.count({
    where: {
      visitorKey,
    },
  });
  const shareFavoriteCount = await transaction.shareFavorite.count({
    where: {
      visitorKey,
    },
  });

  return contentFavoriteCount + shareFavoriteCount;
}
