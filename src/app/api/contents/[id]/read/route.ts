import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function normalizeVisitorKey(visitorKey: string) {
  return visitorKey.trim().replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80);
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
        { error: "缺少浏览器标识，无法标记已读。" },
        { status: 400 }
      );
    }

    const content = await prisma.content.findFirst({
      where: {
        id,
        status: "published",
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!content) {
      return Response.json(
        { error: "内容不存在，或当前不可标记已读。" },
        { status: 404 }
      );
    }

    const user = await prisma.user.upsert({
      where: {
        nameKey: `visitor-${visitorKey}`,
      },
      update: {
        name: "匿名成员",
        role: "member",
      },
      create: {
        name: "匿名成员",
        nameKey: `visitor-${visitorKey}`,
        role: "member",
      },
    });

    await prisma.contentRead.upsert({
      where: {
        contentId_userId: {
          contentId: content.id,
          userId: user.id,
        },
      },
      update: {},
      create: {
        contentId: content.id,
        userId: user.id,
      },
    });

    const readCount = await prisma.contentRead.count({
      where: {
        contentId: content.id,
      },
    });

    return Response.json({
      ok: true,
      readCount,
    });
  } catch {
    return Response.json(
      { error: "标记已读失败，请稍后再试。" },
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
        { error: "缺少浏览器标识，无法取消已读。" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: {
        nameKey: `visitor-${visitorKey}`,
      },
      select: {
        id: true,
      },
    });

    if (!user) {
      return Response.json({
        ok: true,
        readCount: 0,
      });
    }

    await prisma.contentRead.deleteMany({
      where: {
        contentId: id,
        userId: user.id,
      },
    });

    const readCount = await prisma.contentRead.count({
      where: {
        contentId: id,
      },
    });

    return Response.json({
      ok: true,
      readCount,
    });
  } catch {
    return Response.json(
      { error: "取消已读失败，请稍后再试。" },
      { status: 500 }
    );
  }
}