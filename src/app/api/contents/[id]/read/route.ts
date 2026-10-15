import { prisma } from "@/lib/prisma";
import { publicContentWhere } from "@/lib/contentRetention";
import { readJsonObject } from "@/lib/requestBody";
import {
  CONTENT_READ_POLICY,
  getClientAddress,
  getThrottleSecret,
  hashClientAddress,
  pruneLoginThrottle,
  registerThrottledAttempt,
} from "@/lib/loginThrottle";

const READ_BODY_MAX_BYTES = 2 * 1024;

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
    const parsed = await readJsonObject(request, READ_BODY_MAX_BYTES);

    if (!parsed.ok) {
      return Response.json({ error: parsed.error }, { status: parsed.status });
    }

    const body = parsed.value as { visitorKey?: string };

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
        ...publicContentWhere(new Date(), String(body.visitorKey ?? "")),
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

    // Per-address limit before any row is written (key: HMAC of the address).
    const now = new Date();
    const throttleKey = hashClientAddress(getClientAddress(request.headers), getThrottleSecret(), "content-read");
    await pruneLoginThrottle(prisma, now).catch(() => undefined);
    const attempt = await registerThrottledAttempt(prisma, throttleKey, now, CONTENT_READ_POLICY);

    if (!attempt.allowed) {
      return Response.json(
        { error: "操作太频繁，请稍后再试。" },
        { status: 429, headers: { "Retry-After": String(attempt.retryAfterSeconds) } }
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
    const parsed = await readJsonObject(request, READ_BODY_MAX_BYTES);

    if (!parsed.ok) {
      return Response.json({ error: parsed.error }, { status: parsed.status });
    }

    const body = parsed.value as { visitorKey?: string };

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