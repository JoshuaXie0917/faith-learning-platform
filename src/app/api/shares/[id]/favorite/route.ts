import { Prisma } from "@prisma/client";
import { MAX_TOTAL_FAVORITES, withFavoriteMutationLock } from "@/lib/favoriteLimit";
import { prisma } from "@/lib/prisma";
import { addShareFavorite, normalizeShareId } from "@/lib/shareLifecycle";
import { readJsonObject } from "@/lib/requestBody";
import { SHARE_SMALL_BODY_MAX_BYTES } from "@/lib/shareValidation";

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
    const body = await readJsonObject(request, SHARE_SMALL_BODY_MAX_BYTES);

    if (!body.ok) {
      return Response.json({ error: body.error }, { status: body.status });
    }

    const visitorKey = normalizeVisitorKey(String(body.value.visitorKey ?? ""));

    if (!visitorKey) {
      return Response.json(
        { error: "缺少浏览器标识，无法收藏分享。" },
        { status: 400 }
      );
    }

    const result = await addShareFavorite(prisma, normalizeShareId(id), visitorKey);

    if (result === "not-found") {
      return Response.json(
        { error: "分享不存在或已被删除。" },
        { status: 404 }
      );
    }

    if (result === "limit") {
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
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2003" || error.code === "P2025")
    ) {
      return Response.json(
        { error: "分享不存在或已不可用。" },
        { status: 404 }
      );
    }

    return Response.json(
      { error: "收藏分享失败，请稍后再试。" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    const body = await readJsonObject(request, SHARE_SMALL_BODY_MAX_BYTES);

    if (!body.ok) {
      return Response.json({ error: body.error }, { status: body.status });
    }

    const visitorKey = normalizeVisitorKey(String(body.value.visitorKey ?? ""));

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
