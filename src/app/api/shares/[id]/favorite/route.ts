import {
  countVisitorFavorites,
  MAX_TOTAL_FAVORITES,
  withFavoriteMutationLock,
} from "@/lib/favoriteLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function normalizeVisitorKey(value: string) {
  return value.trim().slice(0, 120);
}

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    const body = (await request.json()) as {
      visitorKey?: string;
    };

    const visitorKey = normalizeVisitorKey(String(body.visitorKey ?? ""));

    if (!visitorKey) {
      return Response.json(
        { error: "缺少浏览器标识，无法收藏分享。" },
        { status: 400 }
      );
    }

    const result = await withFavoriteMutationLock(
      visitorKey,
      async (transaction) => {
        const share = await transaction.share.findFirst({
          where: {
            id,
            deletedAt: null,
          },
          select: {
            id: true,
          },
        });

        if (!share) {
          return { status: "not-found" as const };
        }

        const existingFavorite = await transaction.shareFavorite.findUnique({
          where: {
            shareId_visitorKey: {
              shareId: id,
              visitorKey,
            },
          },
          select: {
            id: true,
          },
        });

        if (existingFavorite) {
          return { status: "saved" as const };
        }

        const totalFavoriteCount = await countVisitorFavorites(
          transaction,
          visitorKey
        );

        if (totalFavoriteCount >= MAX_TOTAL_FAVORITES) {
          return { status: "limit" as const };
        }

        await transaction.shareFavorite.create({
          data: {
            shareId: id,
            visitorKey,
          },
        });

        return { status: "saved" as const };
      }
    );

    if (result.status === "not-found") {
      return Response.json(
        { error: "分享不存在或已被删除。" },
        { status: 404 }
      );
    }

    if (result.status === "limit") {
      return Response.json(
        {
          error: "收藏数量已达到 30 个上限。",
          limit: MAX_TOTAL_FAVORITES,
        },
        { status: 409 }
      );
    }

    return Response.json({
      ok: true,
    });
  } catch {
    return Response.json(
      { error: "收藏分享失败，请稍后再试。" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    const body = (await request.json()) as {
      visitorKey?: string;
    };

    const visitorKey = normalizeVisitorKey(String(body.visitorKey ?? ""));

    if (!visitorKey) {
      return Response.json(
        { error: "缺少浏览器标识，无法取消收藏。" },
        { status: 400 }
      );
    }

    await withFavoriteMutationLock(visitorKey, async (transaction) => {
      await transaction.shareFavorite.deleteMany({
        where: {
          shareId: id,
          visitorKey,
        },
      });
    });

    return Response.json({
      ok: true,
    });
  } catch {
    return Response.json(
      { error: "取消收藏失败，请稍后再试。" },
      { status: 500 }
    );
  }
}
