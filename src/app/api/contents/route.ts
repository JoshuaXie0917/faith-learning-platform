import { prisma } from "@/lib/prisma";
import { publicContentWhere } from "@/lib/contentRetention";
import { getRequestVisitorKey } from "@/lib/visitorKey";
import {
  formatContentDate,
  getContentTypeLabel,
  parseJsonTextArray,
} from "@/lib/contentFormat";
import { searchKeywords } from "@/lib/contentForm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json({ contents: await loadPublicContents() });
  } catch (error) {
    // A database or network failure must not look like an empty library to members.
    console.error("读取内容失败：", error instanceof Error ? error.name : "unknown error");
    return Response.json({ error: "读取内容失败，请稍后再试。" }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}

async function loadPublicContents() {
  const visitorKey = await getRequestVisitorKey();
  const contents = await prisma.content.findMany({
    where: publicContentWhere(new Date(), visitorKey),
    orderBy: {
      date: "desc",
    },
    select: {
      id: true,
      title: true,
      description: true,
      contentType: true,
      speaker: true,
      scripture: true,
      series: true,
      speakerId: true,
      seriesId: true,
      seriesRef: {
        select: {
          imageUrl: true,
          deletedAt: true,
        },
      },
      date: true,
      duration: true,
      tagsText: true,
      resourceUrl: true,
      viewCount: true,
    },
  });

  return contents.map((content) => ({
    id: content.id,
    title: content.title,
    description: content.description,
    contentType: content.contentType,
    contentTypeLabel: getContentTypeLabel(content.contentType),
    speaker: content.speaker,
    speakerId: content.speakerId,
    scripture: content.scripture,
    series: content.series,
    seriesId: content.seriesId,
    seriesImageUrl: content.seriesRef?.deletedAt
      ? null
      : content.seriesRef?.imageUrl ?? null,
    date: formatContentDate(content.date),
    rawDate: content.date,
    duration: content.duration,
    tags: parseJsonTextArray(content.tagsText),
    // From the current title, speaker and Series name, so a renamed Series is never
    // found under its old name.
    searchKeywords: searchKeywords(content.title, content.speaker, content.series),
    resourceUrl: content.resourceUrl,
    viewCount: content.viewCount,
  }));
}
