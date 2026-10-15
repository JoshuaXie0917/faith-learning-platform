import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { handleShareCreate } from "@/lib/shareCreate";
import { requestVisitorKey } from "@/lib/visitorKeyHeader";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PUBLIC_LIST_LIMIT = 100;

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
    const visitorKey = normalizeVisitorKey(requestVisitorKey(request));
    const now = new Date();

    const select = {
      id: true,
      name: true,
      title: true,
      content: true,
      ownerKey: true,
      createdAt: true,
      expiresAt: true,
      favorites: {
        where: { visitorKey: visitorKey || "__none__" },
        select: { id: true },
      },
    } satisfies Prisma.ShareSelect;

    // Bounded list: the newest PUBLIC_LIST_LIMIT public Shares, plus every Share
    // this visitor favorited (at most 30 count, but all are returned), so the
    // response cannot grow with the number of stored Shares.
    const [recent, favorited] = await Promise.all([
      prisma.share.findMany({
        where: { deletedAt: null, expiresAt: { gt: now } },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: PUBLIC_LIST_LIMIT,
        select,
      }),
      visitorKey
        ? prisma.share.findMany({
            where: { deletedAt: null, favorites: { some: { visitorKey } } },
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            select,
          })
        : Promise.resolve([]),
    ]);

    const byId = new Map([...recent, ...favorited].map((share) => [share.id, share]));
    const shares = [...byId.values()].sort(
      (left, right) => right.createdAt.getTime() - left.createdAt.getTime() || right.id.localeCompare(left.id)
    );

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
    console.error("读取分享失败：", error instanceof Error ? error.name : "unknown error");

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
