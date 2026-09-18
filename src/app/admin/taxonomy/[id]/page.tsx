import Link from "next/link";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { PageContainer } from "@/components/PageContainer";
import { formatContentDate } from "@/lib/contentFormat";

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
        description: true,
        contentType: true,
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
                    <div className="grid gap-4">
                        {sermonsInSeries.map((sermon) => (
                            <article
                                key={sermon.id}
                                className="grid gap-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.75fr)]"
                            >
                                <div className="min-w-0">
                                    <div className="inline-flex max-w-full rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-900 shadow-sm">
                                        <span className="truncate">{series.title}</span>
                                    </div>

                                    <Link
                                        href={`/sermons/${sermon.id}`}
                                        className="mt-3 block text-xl font-semibold leading-7 text-stone-950 transition hover:text-amber-800"
                                    >
                                        <span className="break-words">{sermon.title}</span>
                                    </Link>

                                    {sermon.speaker?.trim() && (
                                        <div className="mt-3">
                                            <span className="inline-flex max-w-full items-center rounded-full bg-stone-900 px-3 py-1 text-xs font-medium text-white">
                                                <span className="truncate">{sermon.speaker}</span>
                                            </span>
                                        </div>
                                    )}

                                    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-stone-500">
                                        <span>{formatContentDate(sermon.date)}</span>
                                        {sermon.scripture?.trim() && (
                                            <>
                                                <span aria-hidden="true">·</span>
                                                <span className="break-words">{sermon.scripture}</span>
                                            </>
                                        )}
                                        <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs text-stone-600">
                                            {statusLabels[sermon.status] ?? sermon.status}
                                        </span>
                                    </div>

                                    <div className="mt-4 flex flex-wrap gap-3">
                                        <Link
                                            href={`/sermons/${sermon.id}`}
                                            className="inline-flex items-center justify-center rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-stone-700"
                                        >
                                            查看实际内容
                                        </Link>
                                        <Link
                                            href={`/admin/sermons/${sermon.id}/edit`}
                                            className="inline-flex items-center justify-center rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition hover:border-stone-500 hover:text-stone-950"
                                        >
                                            编辑
                                        </Link>
                                    </div>
                                </div>

                                <aside className="min-w-0 rounded-xl border border-stone-200 bg-stone-50 p-4">
                                    <p className="text-sm font-medium text-stone-700">备注 / 摘要</p>
                                    {sermon.description?.trim() ? (
                                        <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-stone-600">
                                            {sermon.description}
                                        </p>
                                    ) : (
                                        <p className="mt-3 text-sm text-stone-400">暂无摘要</p>
                                    )}
                                </aside>
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
