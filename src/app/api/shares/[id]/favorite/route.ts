import { prisma } from "@/lib/prisma";

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

    const share = await prisma.share.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!share) {
      return Response.json(
        { error: "分享不存在或已被删除。" },
        { status: 404 }
      );
    }

    await prisma.shareFavorite.upsert({
      where: {
        shareId_visitorKey: {
          shareId: id,
          visitorKey,
        },
      },
      update: {},
      create: {
        shareId: id,
        visitorKey,
      },
    });

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

    await prisma.shareFavorite.deleteMany({
      where: {
        shareId: id,
        visitorKey,
      },
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