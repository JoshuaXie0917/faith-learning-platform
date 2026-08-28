import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { PageContainer } from "@/components/PageContainer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminTaxonomyPage() {
    const [speakers, seriesList] = await Promise.all([
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
                contents: {
                    where: {
                        deletedAt: null,
                    },
                    select: {
                        id: true,
                    },
                },
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
                contents: {
                    where: {
                        deletedAt: null,
                    },
                    select: {
                        id: true,
                    },
                },
            },
        }),
    ]);

    return (
        <PageContainer>
            <PageHeader
                title="讲员与系列"
                subtitle="管理内容使用的讲员和系列分类。"
            />

            <div className="grid gap-6 lg:grid-cols-2">
                <section className="rounded-3xl border border-stone-200 bg-white p-4 shadow-sm sm:p-6">
                    <div className="mb-5">
                        <h2 className="text-lg font-semibold text-stone-900">讲员</h2>
                        <p className="mt-1 text-sm text-stone-500">
                            当前共有 {speakers.length} 位讲员。
                        </p>
                    </div>

                    <div className="space-y-3">
                        {speakers.length === 0 ? (
                            <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-stone-600">
                                目前还没有讲员。
                            </div>
                        ) : (
                            speakers.map((speaker) => (
                                <div
                                    key={speaker.id}
                                    className="flex items-center justify-between gap-4 rounded-2xl border border-stone-200 bg-stone-50 p-4"
                                >
                                    <span className="font-medium text-stone-900">
                                        {speaker.name}
                                    </span>

                                    <span className="shrink-0 text-sm text-stone-500">
                                        {speaker.contents.length} 条内容
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </section>

                <section className="rounded-3xl border border-stone-200 bg-white p-4 shadow-sm sm:p-6">
                    <div className="mb-5">
                        <h2 className="text-lg font-semibold text-stone-900">系列</h2>
                        <p className="mt-1 text-sm text-stone-500">
                            当前共有 {seriesList.length} 个系列。
                        </p>
                    </div>

                    <div className="space-y-3">
                        {seriesList.length === 0 ? (
                            <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-stone-600">
                                目前还没有系列。
                            </div>
                        ) : (
                            seriesList.map((series) => (
                                <div
                                    key={series.id}
                                    className="flex items-center justify-between gap-4 rounded-2xl border border-stone-200 bg-stone-50 p-4"
                                >
                                    <span className="font-medium text-stone-900">
                                        {series.title}
                                    </span>

                                    <span className="shrink-0 text-sm text-stone-500">
                                        {series.contents.length} 条内容
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </section>
            </div>
        </PageContainer>
    );
}