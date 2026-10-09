import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";
import { PageHeader } from "@/components/PageHeader";
import { PageContainer } from "@/components/PageContainer";
import { ContentPresentationCard } from "@/components/ContentPresentationCard";
import { formatContentDate } from "@/lib/contentFormat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const contentTypeLabels: Record<string, string> = {
  recording: "录音",
  article: "文章",
  file: "文件",
  music: "音乐音频",
  image: "图片",
  link: "链接",
};

export default async function AdminPage() {
  await requireAdmin();

  const [totalContents, recentContents] = await Promise.all([
    prisma.content.count({
      where: {
        deletedAt: null,
      },
    }),
    prisma.content.findMany({
      where: {
        deletedAt: null,
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 5,
      select: {
        id: true,
        title: true,
        contentType: true,
        description: true,
        speaker: true,
        date: true,
        scripture: true,
        duration: true,
        seriesId: true,
        series: true,
        seriesRef: {
          select: {
            title: true,
            imageUrl: true,
          },
        },
        _count: {
          select: {
            reads: true,
          },
        },
      },
    }),
  ]);

  return (
    <PageContainer>
      <PageHeader
        title="后台总览"
        subtitle="查看内容数量和最近内容。"
        action={
          <Link
            href="/admin/sermons"
            className="inline-flex w-full justify-center rounded-full bg-stone-900 px-5 py-2.5 max-md:py-3 text-sm font-medium text-white transition hover:bg-stone-700 sm:w-auto"
          >
            管理内容
          </Link>
        }
      />
      <section aria-label="内容摘要" className="mb-8">
        <div className="flex w-full max-w-lg items-center justify-between rounded-2xl border border-stone-200 bg-white px-5 py-4 shadow-sm sm:px-6">
          <p className="text-sm font-medium tracking-wide text-stone-500">
            内容总数
          </p>
          <div className="text-3xl font-semibold text-stone-900">
            {totalContents}
          </div>
        </div>
      </section>

      <div>
        <section>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-stone-900 sm:text-xl">
                最近内容
              </h2>

              <p className="mt-1 text-sm text-stone-500">
                最近更新的内容和对应已读数量。
              </p>
            </div>

            <Link
              href="/admin/sermons"
              className="inline-flex w-full items-center justify-center rounded-full border border-stone-200 bg-white px-4 py-2 text-sm text-stone-600 transition hover:border-stone-300 hover:text-stone-900 max-md:min-h-11 sm:w-auto"
            >
              查看全部 →
            </Link>
          </div>

          <div className="space-y-4">
            {recentContents.length === 0 ? (
              <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5 text-sm leading-7 text-stone-600">
                目前还没有内容。可以进入内容管理页面新增内容。
              </div>
            ) : (
              recentContents.map((content) => {
                const seriesTitle = content.seriesRef?.title ?? content.series?.trim() ?? "";
                const contentSeries = content.seriesId && seriesTitle
                  ? { title: seriesTitle, imageUrl: content.seriesRef?.imageUrl }
                  : null;

                return (
                  <ContentPresentationCard
                    key={content.id}
                    mode="admin"
                    series={contentSeries}
                    content={{
                      id: content.id,
                      title: content.title,
                      description: content.description,
                      contentTypeLabel: contentTypeLabels[content.contentType] ?? content.contentType,
                      speaker: content.speaker,
                      date: content.date ? formatContentDate(content.date) : null,
                      scripture: content.scripture,
                      duration: content.duration,
                      readCount: content._count.reads,
                    }}
                  />
                );
              })
            )}
          </div>
        </section>
      </div>
    </PageContainer>
  );
}
