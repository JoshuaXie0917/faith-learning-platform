import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SHARE_EXPIRE_DAYS = 7;
const MAX_SHARE_LENGTH = 800;

function normalizeVisitorKey(value: string) {
  return value.trim().slice(0, 120);
}

function countTextWithoutPunctuation(text: string) {
  return Array.from(text).filter((char) => /[\p{L}\p{N}]/u.test(char)).length;
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const visitorKey = normalizeVisitorKey(searchParams.get("visitorKey") ?? "");
    const now = new Date();

    const visibilityConditions: Prisma.ShareWhereInput[] = [
      {
        expiresAt: {
          gt: now,
        },
      },
    ];

    if (visitorKey) {
      visibilityConditions.push(
        {
          ownerKey: visitorKey,
        },
        {
          favorites: {
            some: {
              visitorKey,
            },
          },
        }
      );
    }

    const shares = await prisma.share.findMany({
      where: {
        deletedAt: null,
        OR: visibilityConditions,
      },
      orderBy: {
        createdAt: "desc",
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

    const publicShares = shares.map((share) => ({
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
    }));

    return Response.json({
      shares: publicShares,
    });
  } catch (error) {
    console.error("读取分享失败：", error);

    return Response.json(
      {
        shares: [],
        error: "读取分享失败，请稍后再试。",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      visitorKey?: string;
      name?: string;
      title?: string;
      content?: string;
    };

    const visitorKey = normalizeVisitorKey(String(body.visitorKey ?? ""));
    const name = String(body.name ?? "").trim();
    const title = String(body.title ?? "").trim();
    const content = String(body.content ?? "").trim();

    if (!visitorKey) {
      return Response.json(
        { error: "缺少浏览器标识，无法发布分享。" },
        { status: 400 }
      );
    }

    if (!name) {
      return Response.json({ error: "请填写姓名。" }, { status: 400 });
    }

    if (!title) {
      return Response.json({ error: "请填写分享主题。" }, { status: 400 });
    }

    if (!content) {
      return Response.json({ error: "请填写分享内容。" }, { status: 400 });
    }

    if (countTextWithoutPunctuation(content) > MAX_SHARE_LENGTH) {
      return Response.json(
        { error: "分享内容最多 800 字，不包括标点符号和空格。" },
        { status: 400 }
      );
    }

    const now = new Date();

    const share = await prisma.share.create({
      data: {
        name,
        title,
        content,
        ownerKey: visitorKey,
        expiresAt: addDays(now, SHARE_EXPIRE_DAYS),
      },
      select: {
        id: true,
      },
    });

    return Response.json({
      ok: true,
      shareId: share.id,
    });
  } catch (error) {
    console.error("发布分享失败：", error);

    return Response.json(
      { error: "发布分享失败，请稍后再试。" },
      { status: 500 }
    );
  }
}