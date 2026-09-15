import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { PageContainer } from "@/components/PageContainer";
import { revalidatePath } from "next/cache";
import { SeriesImageUploadField } from "@/components/SeriesImageUploadField";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeKey(value: string) {
    return value.trim().replace(/\s+/g, " ").toLowerCase();
}

async function createSeries(formData: FormData) {
    "use server";

    const title = String(formData.get("title") ?? "").trim();

    if (!title) {
        return;
    }

    const titleKey = normalizeKey(title);

    const existingSeries = await prisma.series.findUnique({
        where: {
            titleKey,
        },
        select: {
            id: true,
        },
    });

    if (existingSeries) {
        return;
    }

    await prisma.series.create({
        data: {
            title,
            titleKey,
        },
    });

    revalidatePath("/admin/taxonomy");
}

async function updateSeries(formData: FormData) {
    "use server";

    const id = String(formData.get("id") ?? "");
    const title = String(formData.get("title") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const imageUrl = String(formData.get("imageUrl") ?? "").trim();

    if (!id || !title) {
        return;
    }

    const titleKey = normalizeKey(title);

    const didUpdate = await prisma.$transaction(async (tx) => {
        const series = await tx.series.findUnique({
            where: { id },
            select: {
                id: true,
            },
        });

        if (!series) {
            return false;
        }

        const conflictingSeries = await tx.series.findUnique({
            where: {
                titleKey,
            },
            select: {
                id: true,
            },
        });

        if (conflictingSeries && conflictingSeries.id !== id) {
            return false;
        }

        await tx.series.update({
            where: { id },
            data: {
                title,
                titleKey,
                description: description || null,
                imageUrl: imageUrl || null,
            },
        });

        await tx.content.updateMany({
            where: {
                seriesId: id,
            },
            data: {
                series: title,
            },
        });

        return true;
    });

    if (!didUpdate) {
        return;
    }

    revalidatePath("/admin/taxonomy");
    revalidatePath("/admin/sermons");
    revalidatePath("/sermons");
}

export default async function AdminTaxonomyPage() {
    const seriesList = await prisma.series.findMany({
        where: {
            deletedAt: null,
        },
        orderBy: {
            title: "asc",
        },
        select: {
            id: true,
            title: true,
            description: true,
            imageUrl: true,
            contents: {
                where: {
                    deletedAt: null,
                },
                select: {
                    id: true,
                },
            },
        },
    });

    return (
        <PageContainer>
            <PageHeader
                title="系列管理"
                subtitle="管理所有系列的名称、简介与封面。"
            />

            <div className="space-y-6">
                <form
                    action={createSeries}
                    className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:p-5"
                >
                    <input
                        name="title"
                        type="text"
                        required
                        placeholder="输入系列名称"
                        className="min-w-0 flex-1 rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm text-stone-900 outline-none transition focus:border-stone-400 focus:bg-white"
                    />

                    <button
                        type="submit"
                        className="rounded-xl bg-stone-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-stone-700"
                    >
                        新增系列
                    </button>
                </form>

                {seriesList.length === 0 ? (
                    <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5 text-sm text-stone-600">
                        目前还没有系列。
                    </div>
                ) : (
                    <div className="space-y-5">
                        {seriesList.map((series) => (
                            <form
                                key={series.id}
                                action={updateSeries}
                                className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm"
                            >
                                <input
                                    type="hidden"
                                    name="id"
                                    value={series.id}
                                />

                                <div className="grid gap-4 lg:grid-cols-[minmax(220px,28%)_1fr] lg:items-start">
                                    <SeriesImageUploadField
                                        initialImageUrl={series.imageUrl ?? ""}
                                    />

                                    <div className="space-y-3">
                                        <div className="space-y-2">
                                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                                <label
                                                    htmlFor={`series-title-${series.id}`}
                                                    className="text-sm font-medium text-amber-800"
                                                >
                                                    系列名称
                                                </label>

                                                <span className="text-sm text-stone-500">
                                                    {series.contents.length} 条内容
                                                </span>
                                            </div>

                                            <input
                                                id={`series-title-${series.id}`}
                                                name="title"
                                                type="text"
                                                required
                                                defaultValue={series.title}
                                                className="w-full rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-lg font-semibold text-stone-950 outline-none transition focus:border-amber-400 focus:bg-white"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label
                                                htmlFor={`series-description-${series.id}`}
                                                className="text-sm font-medium text-stone-700"
                                            >
                                                简介
                                            </label>

                                            <textarea
                                                id={`series-description-${series.id}`}
                                                name="description"
                                                defaultValue={series.description ?? ""}
                                                rows={4}
                                                className="w-full resize-y rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm leading-6 text-stone-800 outline-none transition focus:border-stone-400 focus:bg-white"
                                                placeholder="系列简介 / 描述"
                                            />
                                        </div>

                                        <div className="flex justify-end">
                                            <button
                                                type="submit"
                                                className="rounded-xl bg-stone-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-stone-700"
                                            >
                                                保存系列
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </form>
                        ))}
                    </div>
                )}
            </div>
        </PageContainer>
    );
}
