import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";
import { PageHeader } from "@/components/PageHeader";
import { PageContainer } from "@/components/PageContainer";
import { ContentEditorForm } from "@/components/ContentEditorForm";
import {
    CONTENT_MESSAGES,
    readContentForm,
    todayInHalifax,
    validateContentForm,
    type ContentFormState,
} from "@/lib/contentForm";
import { updateContentRecord } from "@/lib/contentSave";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Props = {
    params: Promise<{
        id: string;
    }>;
};

function parseTextArray(value: string | null) {
    if (!value) return "";

    try {
        const parsed = JSON.parse(value);

        if (Array.isArray(parsed)) {
            return parsed.join("，");
        }

        return value;
    } catch {
        return value;
    }
}

async function updateContent(_state: ContentFormState, formData: FormData): Promise<ContentFormState> {
    "use server";

    await requireAdmin();

    const id = String(formData.get("id") ?? "").trim();
    const values = readContentForm(formData);
    const checked = validateContentForm(values, todayInHalifax());

    if (!checked.ok) {
        return { error: checked.error, values, attempt: Date.now() };
    }

    let result: Awaited<ReturnType<typeof updateContentRecord>>;

    try {
        result = await updateContentRecord(prisma, id, checked.value);
    } catch (error) {
        console.error("保存内容失败：", error instanceof Error ? error.name : "unknown error");
        return { error: CONTENT_MESSAGES.saveFailed, values, attempt: Date.now() };
    }

    if (!result.ok) {
        return { error: result.error, values, attempt: Date.now() };
    }

    revalidatePath("/admin");
    revalidatePath("/admin/sermons");
    revalidatePath(`/admin/sermons/${id}/edit`);
    revalidatePath("/sermons");
    revalidatePath(`/sermons/${id}`);
    revalidatePath("/dashboard");

    redirect("/admin/sermons?type=all");
}

export default async function EditContentPage({ params }: Props) {
    await requireAdmin();

    const { id } = await params;

    const [content, seriesList] = await Promise.all([
        prisma.content.findUnique({
            where: { id },
            include: {
                seriesRef: {
                    select: {
                        id: true,
                        title: true,
                        deletedAt: true,
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
            },
        }),
    ]);

    if (!content || content.deletedAt) {
        notFound();
    }

    const legacySeriesTitle = !content.seriesId && content.series?.trim() ? content.series.trim() : null;
    const disabledSeries = content.seriesRef?.deletedAt
        ? { id: content.seriesRef.id, title: content.seriesRef.title }
        : null;

    return (
        <PageContainer>
            <PageHeader
                title="编辑内容"
                subtitle="修改并保存内容信息。"
                action={
                    <Link
                        href="/admin/sermons"
                        className="inline-flex w-full justify-center rounded-full border border-stone-200 bg-white px-5 py-2.5 max-lg:py-3 text-sm font-medium text-stone-600 transition hover:border-stone-300 hover:text-stone-900 sm:w-auto"
                    >
                        返回内容管理
                    </Link>
                }
            />

            <ContentEditorForm
                action={updateContent}
                mode="edit"
                contentId={content.id}
                seriesOptions={seriesList}
                disabledSeries={disabledSeries}
                legacySeriesTitle={legacySeriesTitle}
                isDraft={content.status === "draft"}
                initial={{
                    title: content.title,
                    contentType: content.contentType,
                    date: content.date,
                    speaker: content.speaker ?? "",
                    seriesId: content.seriesId ?? "",
                    resourceUrl: content.resourceUrl ?? "",
                    contentBody: content.contentBody ?? content.description ?? "",
                    tags: parseTextArray(content.tagsText),
                }}
            />
        </PageContainer>
    );
}
