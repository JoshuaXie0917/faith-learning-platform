import Link from "next/link";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { PageContainer } from "@/components/PageContainer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Props = {
    params: Promise<{ id: string }>;
};

const statusLabels: Record<string, string> = {
    published: "已发布",
    draft: "草稿",
    archived: "已下架",
};

async function assignContentToSeries(seriesId: string, formData: FormData) {
    "use server";

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
    const { id } = await params;
    const series = await prisma.series.findFirst({
        where: { id, deletedAt: null },
        select: { id: true, title: true, description: true },
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
        seriesId: true,
        series: true,
        seriesRef: { select: { title: true } },
        status: true,
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
                        className="inline-flex w-full justify-center rounded-full border border-stone-200 bg-white px-5 py-2.5 text-sm font-medium text-stone-600 transition hover:border-stone-300 hover:text-stone-900 sm:w-auto"
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
                    <div className="divide-y divide-stone-200 border-y border-stone-200">
                        {sermonsInSeries.map((sermon) => (
                            <article key={sermon.id} className="py-4">
                                <h3 className="font-medium text-stone-900">{sermon.title}</h3>
                                <p className="mt-1 text-sm text-stone-600">
                                    {[sermon.speaker, sermon.date, sermon.scripture, statusLabels[sermon.status] ?? sermon.status]
                                        .filter(Boolean)
                                        .join(" · ")}
                                </p>
                            </article>
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
                    <div className="divide-y divide-stone-200 border-y border-stone-200">
                        {candidateSermons.map((sermon) => (
                            <form
                                key={sermon.id}
                                action={assignContentToSeries.bind(null, series.id)}
                                className="flex flex-col gap-3 py-3 sm:flex-row sm:items-start sm:justify-between"
                            >
                                <input type="hidden" name="contentId" value={sermon.id} />
                                <div className="min-w-0 text-sm">
                                    <p className="font-medium text-stone-900">{sermon.title}</p>
                                    <p className="mt-1 text-stone-500">
                                        {[sermon.speaker, sermon.date, sermon.scripture, statusLabels[sermon.status] ?? sermon.status]
                                            .filter(Boolean)
                                            .join(" · ")}
                                    </p>
                                    {sermon.seriesId && (
                                        <p className="mt-1 text-amber-800">
                                            当前系列：{sermon.seriesRef?.title ?? sermon.series}。移入后将离开原系列。
                                        </p>
                                    )}
                                </div>
                                <button
                                    type="submit"
                                    className="shrink-0 self-start rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 transition hover:border-stone-500 hover:text-stone-900"
                                >
                                    {sermon.seriesId ? "移到此系列" : "加入此系列"}
                                </button>
                            </form>
                        ))}
                    </div>
                )}
            </section>
        </PageContainer>
    );
}
