import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { publicContentWhere } from "@/lib/contentRetention";
import {
  countVisitorFavorites,
  MAX_TOTAL_FAVORITES,
  withFavoriteMutationLock,
} from "@/lib/favoriteLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BATCH_CONTENT_IDS = 100;

function normalizeVisitorKey(value: string) {
  return value.trim().slice(0, 120);
}

function normalizeContentId(value: string) {
  return value.trim().slice(0, 120);
}

function normalizeContentIds(value: unknown) {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(
      value
        .filter((item): item is string => typeof item === "string")
        .map(normalizeContentId)
        .filter(Boolean)
    )
  ).slice(0, MAX_BATCH_CONTENT_IDS);
}

type ContentFavoriteReader = Pick<Prisma.TransactionClient, "contentFavorite">;

async function getFavoriteContentIds(
  database: ContentFavoriteReader,
  visitorKey: string
) {
  const favorites = await database.contentFavorite.findMany({
    where: {
      visitorKey,
      content: {
        is: {
          status: "published",
          deletedAt: null,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
    select: {
      contentId: true,
    },
  });

  return favorites.map((favorite) => favorite.contentId);
}

function missingVisitorKeyResponse() {
  return Response.json(
    { error: "缺少浏览器标识，无法读取内容收藏。" },
    { status: 400 }
  );
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const visitorKey = normalizeVisitorKey(searchParams.get("visitorKey") ?? "");

    if (!visitorKey) return missingVisitorKeyResponse();

    return Response.json({
      favoriteContentIds: await getFavoriteContentIds(prisma, visitorKey),
    });
  } catch (error) {
    console.error("读取内容收藏失败：", error);

    return Response.json(
      { error: "读取内容收藏失败，请稍后再试。" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      visitorKey?: string;
      contentIds?: unknown;
    };
    const visitorKey = normalizeVisitorKey(String(body.visitorKey ?? ""));
    const contentIds = normalizeContentIds(body.contentIds);

    if (!visitorKey) return missingVisitorKeyResponse();

    const result = await withFavoriteMutationLock(
      visitorKey,
      async (transaction) => {
        const contents = await transaction.content.findMany({
          where: {
            id: {
              in: contentIds,
            },
            ...publicContentWhere(new Date(), visitorKey),
          },
          select: {
            id: true,
          },
        });
        const eligibleContentIds = contentIds.filter((contentId) =>
          contents.some((content) => content.id === contentId)
        );
        const existingFavorites = await transaction.contentFavorite.findMany({
          where: {
            visitorKey,
            contentId: {
              in: eligibleContentIds,
            },
          },
          select: {
            contentId: true,
          },
        });
        const existingContentIds = new Set(
          existingFavorites.map((favorite) => favorite.contentId)
        );
        const newContentIds = eligibleContentIds.filter(
          (contentId) => !existingContentIds.has(contentId)
        );
        const totalFavoriteCount = await countVisitorFavorites(
          transaction,
          visitorKey
        );
        const availableFavoriteSlots = Math.max(
          0,
          MAX_TOTAL_FAVORITES - totalFavoriteCount
        );
        const acceptedContentIds = newContentIds.slice(
          0,
          availableFavoriteSlots
        );

        if (acceptedContentIds.length > 0) {
          await transaction.contentFavorite.createMany({
            data: acceptedContentIds.map((contentId) => ({
              contentId,
              visitorKey,
            })),
            skipDuplicates: true,
          });
        }

        const savedContentIdSet = new Set([
          ...existingContentIds,
          ...acceptedContentIds,
        ]);
        const savedContentIds = contentIds.filter((contentId) =>
          savedContentIdSet.has(contentId)
        );

        return {
          favoriteContentIds: await getFavoriteContentIds(
            transaction,
            visitorKey
          ),
          savedContentIds,
          rejectedContentIds: contentIds.filter(
            (contentId) => !savedContentIdSet.has(contentId)
          ),
          limitReached: acceptedContentIds.length < newContentIds.length,
        };
      }
    );

    if (result.limitReached) {
      return Response.json(
        {
          ...result,
          error: "收藏数量已达到 30 个上限，未保存的本地收藏会保留并稍后重试。",
          limit: MAX_TOTAL_FAVORITES,
        },
        { status: 409 }
      );
    }

    return Response.json(result);
  } catch (error) {
    console.error("保存内容收藏失败：", error);

    return Response.json(
      { error: "保存内容收藏失败，请稍后再试。" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const body = (await request.json()) as {
      visitorKey?: string;
      contentId?: string;
    };
    const visitorKey = normalizeVisitorKey(String(body.visitorKey ?? ""));
    const contentId = normalizeContentId(String(body.contentId ?? ""));

    if (!visitorKey) return missingVisitorKeyResponse();

    if (!contentId) {
      return Response.json(
        { error: "缺少内容标识，无法取消收藏。" },
        { status: 400 }
      );
    }

    const favoriteContentIds = await withFavoriteMutationLock(
      visitorKey,
      async (transaction) => {
        await transaction.contentFavorite.deleteMany({
          where: {
            contentId,
            visitorKey,
          },
        });

        return getFavoriteContentIds(transaction, visitorKey);
      }
    );

    return Response.json({ favoriteContentIds });
  } catch (error) {
    console.error("取消内容收藏失败：", error);

    return Response.json(
      { error: "取消内容收藏失败，请稍后再试。" },
      { status: 500 }
    );
  }
}
