import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { PageContainer } from "@/components/PageContainer";
import { revalidatePath } from "next/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeKey(value: string) {
    return value.trim().replace(/\s+/g, " ").toLowerCase();
}

async function createSpeaker(formData: FormData) {
    "use server";

    const name = String(formData.get("name") ?? "").trim();

    if (!name) {
        return;
    }

    const nameKey = normalizeKey(name);

    await prisma.speaker.upsert({
        where: {
            nameKey,
        },
        update: {
            deletedAt: null,
        },
        create: {
            name,
            nameKey,
        },
    });

    revalidatePath("/admin/taxonomy");
}

async function createSeries(formData: FormData) {
    "use server";

    const title = String(formData.get("title") ?? "").trim();

    if (!title) {
        return;
    }

    const titleKey = normalizeKey(title);

    await prisma.series.upsert({
        where: {
            titleKey,
        },
        update: {
            deletedAt: null,
        },
        create: {
            title,
            titleKey,
        },
    });

    revalidatePath("/admin/taxonomy");
}

async function renameSpeaker(formData: FormData) {
    "use server";

    const id = String(formData.get("id") ?? "");
    const name = String(formData.get("name") ?? "").trim();

    if (!id || !name) {
        return;
    }

    const nameKey = normalizeKey(name);

    const speaker = await prisma.speaker.findUnique({
        where: { id },
        select: {
            id: true,
            nameKey: true,
        },
    });

    if (!speaker) {
        return;
    }

    const conflictingSpeaker = await prisma.speaker.findUnique({
        where: {
            nameKey,
        },
        select: {
            id: true,
        },
    });

    if (conflictingSpeaker && conflictingSpeaker.id !== id) {
        return;
    }
    await prisma.$transaction([
        prisma.speaker.update({
            where: { id },
            data: {
                name,
                nameKey,
            },
        }),

        prisma.content.updateMany({
            where: {
                speakerId: id,
            },
            data: {
                speaker: name,
            },
        }),
    ]);

    revalidatePath("/admin/taxonomy");
    revalidatePath("/admin/sermons");
    revalidatePath("/sermons");
}

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

                    <form action={createSpeaker} className="mb-5 flex flex-col gap-2 sm:flex-row">
                        <input
                            name="name"
                            type="text"
                            required
                            placeholder="输入讲员姓名"
                            className="min-w-0 flex-1 rounded-2xl border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-900 outline-none transition focus:border-stone-400"
                        />

                        <button
                            type="submit"
                            className="rounded-2xl bg-stone-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-stone-700"
                        >
                            新增讲员
                        </button>
                    </form>

                    <div className="space-y-3">
                        {speakers.length === 0 ? (
                            <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-stone-600">
                                目前还没有讲员。
                            </div>
                        ) : (
                            speakers.map((speaker) => (
                                <div
                                    key={speaker.id}
                                    className="rounded-2xl border border-stone-200 bg-stone-50 p-4"
                                >
                                    <div className="mb-3 flex items-center justify-between gap-4">
                                        <span className="font-medium text-stone-900">
                                            {speaker.name}
                                        </span>

                                        <span className="shrink-0 text-sm text-stone-500">
                                            {speaker.contents.length} 条内容
                                        </span>
                                    </div>

                                    <form action={renameSpeaker} className="flex flex-col gap-2 sm:flex-row">
                                        <input
                                            type="hidden"
                                            name="id"
                                            value={speaker.id}
                                        />

                                        <input
                                            name="name"
                                            type="text"
                                            required
                                            defaultValue={speaker.name}
                                            className="min-w-0 flex-1 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 outline-none transition focus:border-stone-400"
                                        />

                                        <button
                                            type="submit"
                                            className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:border-stone-300 hover:bg-stone-100"
                                        >
                                            保存名称
                                        </button>
                                    </form>
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

                    <form action={createSeries} className="mb-5 flex flex-col gap-2 sm:flex-row">
                        <input
                            name="title"
                            type="text"
                            required
                            placeholder="输入系列名称"
                            className="min-w-0 flex-1 rounded-2xl border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-900 outline-none transition focus:border-stone-400"
                        />

                        <button
                            type="submit"
                            className="rounded-2xl bg-stone-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-stone-700"
                        >
                            新增系列
                        </button>
                    </form>

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