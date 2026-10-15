import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { handleShareCreate } from "@/lib/shareCreate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeVisitorKey(value: string) {
  return value.trim().slice(0, 120);
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
      visibilityConditions.push({
        favorites: {
          some: { visitorKey },
        },
      });
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

// Body limit, field rules, repeated-submission handling and throttling live in
// src/lib/shareCreate.ts (tested against a disposable database).
export async function POST(request: Request) {
  return handleShareCreate(request, { prisma });
}
