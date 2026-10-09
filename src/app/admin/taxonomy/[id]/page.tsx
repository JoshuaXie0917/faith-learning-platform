import Link from "next/link";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";
import { PageHeader } from "@/components/PageHeader";
import { PageContainer } from "@/components/PageContainer";
import { ContentPresentationCard } from "@/components/ContentPresentationCard";
import { formatContentDate, getContentTypeLabel } from "@/lib/contentFormat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Props = {
    params: Promise<{ id: string }>;
};

async function assignContentToSeries(seriesId: string, formData: FormData) {
    "use server";

    await requireAdmin();

    const contentId = String(formData.get("contentId") ?? "").trim();

    if (!seriesId || !contentId) {
        return;
    }

    const [series, content] = await Promise.all([
        prisma.series.findUnique({
            where: { id: seriesId },
            select: { id: true, title: true, deletedAt: true },
        }),
        prisma.content.findUnique({
            where: { id: contentId },
            select: { id: true, deletedAt: true },
        }),
    ]);

    if (!series || series.deletedAt || !content || content.deletedAt) {
        return;
    }

    await prisma.content.update({
        where: { id: content.id },
        data: {
            seriesId: series.id,
            series: series.title,
        },
    });

    revalidatePath(`/admin/taxonomy/${series.id}`);
    revalidatePath("/admin/sermons");
}

export default async function AdminSeriesPage({ params }: Props) {
    await requireAdmin();

    const { id } = await params;
    const series = await prisma.series.findFirst({
        where: { id, deletedAt: null },
        select: { id: true, title: true, description: true, imageUrl: true },
    });

    if (!series) {
        notFound();
    }

    const sermonFields = {
        id: true,
        title: true,
        speaker: true,
        date: true,
        scripture: true,
        description: true,
        contentType: true,
        seriesId: true,
        series: true,
        seriesRef: { select: { title: true, imageUrl: true } },
    } as const;

    const [sermonsInSeries, candidateSermons] = await Promise.all([
        prisma.content.findMany({
            where: { deletedAt: null, seriesId: series.id },
            orderBy: [{ date: "desc" }, { title: "asc" }],
            select: sermonFields,
        }),
        prisma.content.findMany({
            where: {
                deletedAt: null,
                OR: [{ seriesId: null }, { seriesId: { not: series.id } }],
            },
            orderBy: [{ date: "desc" }, { title: "asc" }],
            select: sermonFields,
        }),
    ]);

    return (
        <PageContainer>
            <PageHeader
                title={series.title}
                subtitle={series.description ?? undefined}
                action={
                    <Link
                        href="/admin/taxonomy"
                        className="inline-flex w-full justify-center rounded-full border border-stone-200 bg-white px-5 py-2.5 max-md:py-3 text-sm font-medium text-stone-600 transition hover:border-stone-300 hover:text-stone-900 sm:w-auto"
                    >
                        返回系列管理
                    </Link>
                }
            />

            <section className="border-t border-stone-200 py-6" aria-labelledby="series-sermons-heading">
                <div className="mb-4 flex flex-wrap items-baseline gap-3">
                    <h2 id="series-sermons-heading" className="text-lg font-semibold text-stone-900">
                        当前系列内容
                    </h2>
                    <span className="text-sm text-stone-500">{sermonsInSeries.length} 条</span>
                </div>
                {sermonsInSeries.length === 0 ? (
                    <p className="text-sm text-stone-500">此系列目前没有内容。</p>
                ) : (
                    <div className="grid gap-4">
                        {sermonsInSeries.map((sermon) => (
                            <ContentPresentationCard
                                key={sermon.id}
                                mode="admin"
                                series={{ title: series.title, imageUrl: series.imageUrl }}
                                content={{
                                    id: sermon.id,
                                    title: sermon.title,
                                    description: sermon.description,
                                    contentTypeLabel: getContentTypeLabel(sermon.contentType),
                                    speaker: sermon.speaker,
                                    date: sermon.date ? formatContentDate(sermon.date) : null,
                                    scripture: sermon.scripture,
                                }}
                                adminTitleHref={`/sermons/${sermon.id}`}
                                adminPublicAction={{ href: `/sermons/${sermon.id}`, label: "查看实际内容" }}
                                adminEditPrimary
                            />
                        ))}
                    </div>
                )}
            </section>

            <section className="border-t border-stone-200 py-6" aria-labelledby="candidate-sermons-heading">
                <div className="mb-4 flex flex-wrap items-baseline gap-3">
                    <h2 id="candidate-sermons-heading" className="text-lg font-semibold text-stone-900">
                        可加入此系列的现有内容
                    </h2>
                    <span className="text-sm text-stone-500">{candidateSermons.length} 条</span>
                </div>
                {candidateSermons.length === 0 ? (
                    <p className="text-sm text-stone-500">目前没有其他内容。</p>
                ) : (
                    <div className="grid gap-4">
                        {candidateSermons.map((sermon) => {
                            const currentSeriesTitle = sermon.seriesRef?.title ?? sermon.series?.trim() ?? "";
                            const currentSeries = sermon.seriesId && currentSeriesTitle
                                ? { title: currentSeriesTitle, imageUrl: sermon.seriesRef?.imageUrl }
                                : null;

                            return (
                                <ContentPresentationCard
                                    key={sermon.id}
                                    mode="admin"
                                    series={currentSeries}
                                    content={{
                                        id: sermon.id,
                                        title: sermon.title,
                                        description: sermon.description,
                                        contentTypeLabel: getContentTypeLabel(sermon.contentType),
                                        speaker: sermon.speaker,
                                        date: sermon.date ? formatContentDate(sermon.date) : null,
                                        scripture: sermon.scripture,
                                    }}
                                    actions={
                                        <>
                                            {sermon.seriesId && currentSeriesTitle && (
                                                <p className="w-full text-xs leading-5 text-amber-800">
                                                    当前属于“{currentSeriesTitle}”，移入后将离开原系列。
                                                </p>
                                            )}
                                            <form action={assignContentToSeries.bind(null, series.id)} className="w-full">
                                                <input type="hidden" name="contentId" value={sermon.id} />
                                                <button
                                                    type="submit"
                                                    className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 max-md:py-3 text-sm font-medium text-stone-700 transition hover:border-stone-500 hover:text-stone-900"
                                                >
                                                    {sermon.seriesId ? "移到此系列" : "加入此系列"}
                                                </button>
                                            </form>
                                        </>
                                    }
                                />
                            );
                        })}
                    </div>
                )}
            </section>
        </PageContainer>
    );
}
