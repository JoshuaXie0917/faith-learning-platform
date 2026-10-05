import Link from "next/link";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";
import { PageHeader } from "@/components/PageHeader";
import { PageContainer } from "@/components/PageContainer";
import { ContentPresentationCard } from "@/components/ContentPresentationCard";
import { FilterDisclosure } from "@/components/FilterDisclosure";
import { formatContentDate } from "@/lib/contentFormat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{
    q?: string | string[];
    type?: string;
    speaker?: string;
    series?: string;
  }>;
};

const contentTypeLabels: Record<string, string> = {
  recording: "录音",
  article: "文章",
  file: "文件",
  music: "音乐音频",
  image: "图片",
  link: "链接",
};

const typeFilters = [
  { value: "all", label: "全部类型" },
  { value: "recording", label: "录音" },
  { value: "article", label: "文章" },
  { value: "file", label: "文件" },
  { value: "music", label: "音乐音频" },
  { value: "image", label: "图片" },
  { value: "link", label: "链接" },
];

async function deleteContent(formData: FormData) {
  "use server";

  await requireAdmin();

  const id = String(formData.get("id") ?? "");

  if (!id) return;

  await prisma.content.update({
    where: { id },
    data: {
      deletedAt: new Date(),
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/sermons");
  revalidatePath("/sermons");
}

export default async function AdminSermonsPage({ searchParams }: Props) {
  await requireAdmin();

  const params = await searchParams;

  const activeKeyword = typeof params.q === "string" ? params.q.trim() : "";
  const activeType = params.type ?? "all";
  const activeSpeakerId = params.speaker ?? "all";
  const activeSeriesId = params.series ?? "all";

  const filterParams = new URLSearchParams({
    type: activeType,
    speaker: activeSpeakerId,
    series: activeSeriesId,
  });
  if (activeKeyword) filterParams.set("q", activeKeyword);

  function filterHref(name: "type" | "speaker" | "series", value: string) {
    const nextParams = new URLSearchParams(filterParams);
    nextParams.set(name, value);
    return "/admin/sermons?" + nextParams.toString();
  }

  const where: Prisma.ContentWhereInput = {
    deletedAt: null,
    ...(activeType !== "all" ? { contentType: activeType } : {}),
    ...(activeSpeakerId !== "all" ? { speakerId: activeSpeakerId } : {}),
    ...(activeSeriesId !== "all" ? { seriesId: activeSeriesId } : {}),
    ...(activeKeyword
      ? {
          OR: [
            { title: { contains: activeKeyword, mode: "insensitive" } },
            { speaker: { contains: activeKeyword, mode: "insensitive" } },
            { series: { contains: activeKeyword, mode: "insensitive" } },
            { scripture: { contains: activeKeyword, mode: "insensitive" } },
            { description: { contains: activeKeyword, mode: "insensitive" } },
            { contentBody: { contains: activeKeyword, mode: "insensitive" } },
            { speakerRef: { is: { name: { contains: activeKeyword, mode: "insensitive" } } } },
            { seriesRef: { is: { title: { contains: activeKeyword, mode: "insensitive" } } } },
          ],
        }
      : {}),
  };

  const [
    contents,
    totalCount,
    speakers,
    seriesList,
  ] = await Promise.all([
    prisma.content.findMany({
      where,
      orderBy: {
        updatedAt: "desc",
      },
      select: {
        id: true,
        title: true,
        contentType: true,
        speaker: true,
        date: true,
        scripture: true,
        description: true,
        duration: true,
        seriesId: true,
        series: true,
        seriesRef: {
          select: {
            title: true,
            imageUrl: true,
          },
        },
        updatedAt: true,
        _count: {
          select: {
            reads: true,
          },
        },
      },
    }),

    prisma.content.count({
      where: {
        deletedAt: null,
      },
    }),

    prisma.speaker.findMany({
      where: {
        deletedAt: null,
      },
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
      },
    }),

    prisma.series.findMany({
      where: {
        deletedAt: null,
      },
      orderBy: {
        title: "asc",
      },
      select: {
        id: true,
        title: true,
      },
    }),
  ]);

  const summaryStats = [
    { label: "全部内容", value: totalCount },
  ];
  const activeTypeLabel = activeType === "all"
    ? "全部"
    : typeFilters.find((filter) => filter.value === activeType)?.label ?? "已选择";
  const activeSpeakerLabel = activeSpeakerId === "all"
    ? "全部"
    : speakers.find((speaker) => speaker.id === activeSpeakerId)?.name ?? "已选择";
  const activeSeriesLabel = activeSeriesId === "all"
    ? "全部"
    : seriesList.find((series) => series.id === activeSeriesId)?.title ?? "已选择";

  return (
    <PageContainer>
      <PageHeader
        title="内容管理"
        subtitle="管理真理集录中的内容，包括新增、编辑、删除和已读统计。"
        action={
          <Link
            href="/admin/sermons/new"
            className="inline-flex w-full justify-center rounded-full bg-stone-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-stone-700 sm:w-auto"
          >
            + 新增内容
          </Link>
        }
      />

      <section className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {summaryStats.map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5"
          >
            <p className="mb-1 text-xs text-stone-400">{item.label}</p>
            <p className="text-xl font-semibold text-stone-900">
              {item.value}
            </p>
          </div>
        ))}
      </section>

      <section className="mb-6 space-y-4 rounded-3xl border border-stone-200 bg-white p-4 shadow-sm sm:p-6">
        <form action="/admin/sermons" method="get" className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <input type="hidden" name="type" value={activeType} />
          <input type="hidden" name="speaker" value={activeSpeakerId} />
          <input type="hidden" name="series" value={activeSeriesId} />
          <div className="min-w-0 flex-1">
            <label htmlFor="content-search" className="mb-2 block text-sm font-medium text-stone-700">
              搜索内容
            </label>
            <input
              id="content-search"
              name="q"
              type="search"
              defaultValue={activeKeyword}
              placeholder="搜索标题、讲员、系列、经文或正文"
              className="w-full rounded-xl border border-stone-300 px-4 py-2.5 text-sm outline-none transition focus:border-stone-600"
            />
          </div>
          <button
            type="submit"
            className="rounded-full bg-stone-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-stone-700"
          >
            搜索
          </button>
        </form>

        <div className="grid min-w-0 gap-3 md:grid-cols-3">
          <FilterDisclosure
            label="内容类型"
            activeValue={activeType}
            activeLabel={activeTypeLabel}
            options={typeFilters.map((filter) => ({
              value: filter.value,
              label: filter.value === "all" ? "全部" : filter.label,
              href: filterHref("type", filter.value),
            }))}
          />
          <FilterDisclosure
            label="讲员"
            activeValue={activeSpeakerId}
            activeLabel={activeSpeakerLabel}
            options={[
              { value: "all", label: "全部", href: filterHref("speaker", "all") },
              ...speakers.map((speaker) => ({
                value: speaker.id,
                label: speaker.name,
                href: filterHref("speaker", speaker.id),
              })),
            ]}
          />
          <FilterDisclosure
            label="系列"
            activeValue={activeSeriesId}
            activeLabel={activeSeriesLabel}
            options={[
              { value: "all", label: "全部", href: filterHref("series", "all") },
              ...seriesList.map((series) => ({
                value: series.id,
                label: series.title,
                href: filterHref("series", series.id),
              })),
            ]}
          />
        </div>
      </section>

      <section className="space-y-4">
        {contents.length === 0 ? (
          <div className="rounded-3xl border border-amber-100 bg-amber-50 p-6 text-center shadow-sm">
            <p className="text-sm leading-7 text-stone-600">
              {totalCount === 0 ? "目前没有内容。" : "没有符合当前搜索或筛选条件的内容。"}
            </p>
          </div>
        ) : (
          contents.map((content) => {
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
                adminPublicAction={{ href: `/sermons/${content.id}`, label: "查看" }}
                actions={
                  <form action={deleteContent} className="w-full">
                    <input type="hidden" name="id" value={content.id} />
                    <button
                      type="submit"
                      className="w-full rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600 transition hover:bg-red-100"
                    >
                      删除
                    </button>
                  </form>
                }
              />
            );
          })
        )}
      </section>

      <div className="mt-4 flex flex-col gap-2 text-xs text-stone-400 sm:flex-row sm:items-center sm:justify-between">
        <p>当前显示 {contents.length} 条内容。</p>

        <p>支持新增、编辑和删除。</p>
      </div>
    </PageContainer>
  );
}
