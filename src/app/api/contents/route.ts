import { prisma } from "@/lib/prisma";
import {
  formatContentDate,
  getContentTypeLabel,
  parseJsonTextArray,
} from "@/lib/contentFormat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const contents = await prisma.content.findMany({
    where: {
      status: "published",
      deletedAt: null,
    },
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
      date: true,
      duration: true,
      tagsText: true,
      searchKeywordsText: true,
      resourceUrl: true,
      viewCount: true,
    },
  });

  const publicContents = contents.map((content) => ({
    id: content.id,
    title: content.title,
    description: content.description,
    contentType: content.contentType,
    contentTypeLabel: getContentTypeLabel(content.contentType),
    speaker: content.speaker,
    scripture: content.scripture,
    series: content.series,
    date: formatContentDate(content.date),
    rawDate: content.date,
    duration: content.duration,
    tags: parseJsonTextArray(content.tagsText),
    searchKeywords: parseJsonTextArray(content.searchKeywordsText),
    resourceUrl: content.resourceUrl,
    viewCount: content.viewCount,
  }));

  return Response.json({
    contents: publicContents,
  });
}