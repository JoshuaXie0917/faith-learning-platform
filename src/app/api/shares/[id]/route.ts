import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { readJsonObject } from "@/lib/requestBody";
import { SHARE_SMALL_BODY_MAX_BYTES } from "@/lib/shareValidation";
import { deleteShare, normalizeShareId } from "@/lib/shareLifecycle";
import { requestVisitorKey } from "@/lib/visitorKeyHeader";

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

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const visitorKey = normalizeVisitorKey(requestVisitorKey(request));
  const now = new Date();

  const visibilityConditions: Prisma.ShareWhereInput[] = [
    {
      expiresAt: {
        gt: now,
      },
    },
  ];

  if (visitorKey) {
    visibilityConditions.push({
      favorites: {
        some: { visitorKey },
      },
    });
  }

  const share = await prisma.share.findFirst({
    where: {
      id,
      deletedAt: null,
      OR: visibilityConditions,
    },
    select: {
      id: true,
      name: true,
      title: true,
      content: true,
      ownerKey: true,
      createdAt: true,
      expiresAt: true,
      favorites: {
        where: visitorKey
          ? {
              visitorKey,
            }
          : {
              visitorKey: "__none__",
            },
        select: {
          id: true,
        },
      },
    },
  });

  if (!share) {
    return Response.json(
      {
        error: "分享不存在、已删除，或已超过公开展示时间。",
      },
      { status: 404 }
    );
  }

  return Response.json({
    share: {
      id: share.id,
      name: share.name,
      title: share.title,
      content: share.content,
      createdAt: share.createdAt.toISOString(),
      createdDate: formatDate(share.createdAt),
      expiresAt: share.expiresAt.toISOString(),
      expiresDate: formatDate(share.expiresAt),
      isOwner: visitorKey ? share.ownerKey === visitorKey : false,
      isFavorite: share.favorites.length > 0,
    },
  });
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
        { error: "缺少浏览器身份，无法删除分享。" },
        { status: 400 }
      );
    }

    // Owner check, soft delete and removal of every favorite happen in one locked
    // transaction: the Share disappears at once and no favorite keeps it stored.
    const result = await deleteShare(prisma, normalizeShareId(id), { ownerKey: visitorKey });

    if (result === "not-found") {
      return Response.json(
        { error: "分享不存在或已经被删除。" },
        { status: 404 }
      );
    }

    if (result === "forbidden") {
      return Response.json(
        { error: "你只能删除自己发布的分享。" },
        { status: 403 }
      );
    }

    return Response.json({
      ok: true,
    });
  } catch (error) {
    console.error("删除分享失败：", error instanceof Error ? error.name : "unknown error");

    return Response.json(
      { error: "删除分享失败，请稍后再试。" },
      { status: 500 }
    );
  }
}
