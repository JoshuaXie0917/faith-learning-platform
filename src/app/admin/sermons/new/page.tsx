import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";
import { PageHeader } from "@/components/PageHeader";
import { ContentEditorForm } from "@/components/ContentEditorForm";
import {
    CONTENT_MESSAGES,
    readContentForm,
    todayInHalifax,
    validateContentForm,
    type ContentFormState,
} from "@/lib/contentForm";
import { createContentRecord } from "@/lib/contentSave";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function createContent(_state: ContentFormState, formData: FormData): Promise<ContentFormState> {
    "use server";

    await requireAdmin();

    const values = readContentForm(formData);
    const checked = validateContentForm(values, todayInHalifax());

    if (!checked.ok) {
        return { error: checked.error, values, attempt: Date.now() };
    }

    let result: Awaited<ReturnType<typeof createContentRecord>>;

    try {
        result = await createContentRecord(prisma, checked.value);
    } catch (error) {
        console.error("保存内容失败：", error instanceof Error ? error.name : "unknown error");
        return { error: CONTENT_MESSAGES.saveFailed, values, attempt: Date.now() };
    }

    if (!result.ok) {
        return { error: result.error, values, attempt: Date.now() };
    }

    revalidatePath("/admin");
    revalidatePath("/admin/sermons");
    revalidatePath("/sermons");
    revalidatePath("/dashboard");

    redirect("/admin/sermons?type=all");
}

export default async function NewContentPage() {
    await requireAdmin();

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
        },
    });

    return (
        <>
            <PageHeader
                title="新增内容"
                subtitle="填写内容信息并保存。"
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
                action={createContent}
                mode="create"
                seriesOptions={seriesList}
                initial={{
                    title: "",
                    contentType: "recording",
                    date: todayInHalifax(),
                    speaker: "",
                    seriesId: "",
                    resourceUrl: "",
                    contentBody: "",
                    tags: "",
                }}
            />
        </>
    );
}
