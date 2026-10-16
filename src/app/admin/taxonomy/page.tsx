import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";
import { PageHeader } from "@/components/PageHeader";
import { PageContainer } from "@/components/PageContainer";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { SeriesImageUploadField } from "@/components/SeriesImageUploadField";
import { SeriesEditForm, SeriesSaveButton } from "@/components/SeriesEditForm";
import { SeriesCreateForm, type SeriesCreateState } from "@/components/SeriesCreateForm";
import { normalizeKey } from "@/lib/contentForm";
import { createSeriesRecord, refreshSeriesContent } from "@/lib/contentSave";
import { randomUUID } from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Props = {
    searchParams: Promise<{
        saveResult?: string | string[];
        seriesId?: string | string[];
        saveAttempt?: string | string[];
    }>;
};

type SaveResult = "success" | "error" | "duplicate" | "blank" | "missing";

const saveErrorMessages: Record<Exclude<SaveResult, "success">, string> = {
    error: "系列保存失败，请检查后重试。",
    duplicate: "已有同名系列，请使用其他名称。",
    blank: "请填写系列名称。",
    missing: "这个系列不存在或已被删除。",
};

function getSaveResultUrl(result: SaveResult, seriesId: string) {
    const params = new URLSearchParams({
        saveResult: result,
        seriesId,
        saveAttempt: randomUUID(),
    });

    return `/admin/taxonomy?${params.toString()}`;
}

async function createSeries(_state: SeriesCreateState, formData: FormData): Promise<SeriesCreateState> {
    "use server";

    await requireAdmin();

    const title = String(formData.get("title") ?? "");
    let result: Awaited<ReturnType<typeof createSeriesRecord>>;

    try {
        result = await createSeriesRecord(prisma, title);
    } catch (error) {
        console.error("新增系列失败：", error instanceof Error ? error.name : "unknown error");
        return { error: "新增系列失败，请稍后再试。", message: null, attempt: Date.now() };
    }

    if (!result.ok) {
        return { error: result.error, message: null, attempt: Date.now() };
    }

    revalidatePath("/admin/taxonomy");
    return { error: null, message: `已新增系列“${result.title}”。`, attempt: Date.now() };
}

async function updateSeries(formData: FormData) {
    "use server";

    await requireAdmin();

    const id = String(formData.get("id") ?? "");
    const title = String(formData.get("title") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const imageUrl = String(formData.get("imageUrl") ?? "").trim();

    if (!id) {
        redirect(getSaveResultUrl("missing", id));
    }

    if (!title) {
        redirect(getSaveResultUrl("blank", id));
    }

    const titleKey = normalizeKey(title);

    const outcome = await prisma.$transaction(async (tx): Promise<SaveResult> => {
        const series = await tx.series.findUnique({
            where: { id },
            select: {
                id: true,
            },
        });

        if (!series) {
            return "missing";
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
            return "duplicate";
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

        // Content in this Series keeps its stored name and search keywords current.
        await refreshSeriesContent(tx, id, title);

        return "success";
    });

    if (outcome !== "success") {
        redirect(getSaveResultUrl(outcome, id));
    }

    revalidatePath("/admin/taxonomy");
    revalidatePath("/admin/sermons");
    revalidatePath("/sermons");
    revalidatePath("/dashboard");
    redirect(getSaveResultUrl("success", id));
}

export default async function AdminTaxonomyPage({ searchParams }: Props) {
    await requireAdmin();

    const params = await searchParams;
    const saveResult = typeof params.saveResult === "string" ? params.saveResult : "";
    const saveError = saveResult && saveResult !== "success" && saveResult in saveErrorMessages
        ? saveErrorMessages[saveResult as Exclude<SaveResult, "success">]
        : null;
    const savedSeriesId = typeof params.seriesId === "string" ? params.seriesId : "";
    const saveAttempt = typeof params.saveAttempt === "string" ? params.saveAttempt : "";

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
                <SeriesCreateForm action={createSeries} />

                {seriesList.length === 0 ? (
                    <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5 text-sm text-stone-600">
                        目前还没有系列。
                    </div>
                ) : (
                    <div className="space-y-5">
                        {seriesList.map((series) => (
                            <SeriesEditForm
                                key={`${series.id}:${series.imageUrl ?? ""}:${
                                    savedSeriesId === series.id ? saveAttempt : ""
                                }`}
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

                                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                                                    <span className="text-sm text-stone-500">
                                                        {series.contents.length} 条内容
                                                    </span>
                                                    <Link
                                                        href={`/admin/taxonomy/${series.id}`}
                                                        className="inline-flex items-center text-sm font-medium text-amber-800 underline underline-offset-4 transition hover:text-amber-950 max-lg:min-h-11"
                                                        aria-label={`管理${series.title}的内容`}
                                                    >
                                                        管理系列内容
                                                    </Link>
                                                </div>
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
                                                className="w-full resize-y rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm leading-6 text-stone-800 outline-none transition focus:border-stone-400 focus:bg-white max-md:text-base"
                                                placeholder="系列简介 / 描述"
                                            />
                                        </div>

                                        <div className="flex flex-wrap items-center justify-end gap-3">
                                            {savedSeriesId === series.id && saveResult === "success" ? (
                                                <p role="status" className="text-sm text-emerald-700">
                                                    系列已保存。
                                                </p>
                                            ) : null}

                                            {savedSeriesId === series.id && saveError ? (
                                                <p role="alert" className="text-sm text-red-700">
                                                    {saveError}
                                                </p>
                                            ) : null}

                                            <SeriesSaveButton />
                                        </div>
                                    </div>
                                </div>
                            </SeriesEditForm>
                        ))}
                    </div>
                )}
            </div>
        </PageContainer>
    );
}
