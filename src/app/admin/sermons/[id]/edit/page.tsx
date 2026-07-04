import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { PageContainer } from "@/components/PageContainer";
import { saveUploadedResourceFile } from "@/lib/saveUploadedResourceFile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Props = {
    params: Promise<{
        id: string;
    }>;
};

const contentTypes = [
    { value: "recording", label: "录音" },
    { value: "article", label: "文章" },
    { value: "file", label: "文件" },
    { value: "music", label: "音乐音频" },
    { value: "image", label: "图片" },
    { value: "link", label: "链接" },
];

const inputClass =
    "w-full rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none transition focus:border-stone-600";

const dateInputClass =
    "w-[190px] max-w-full rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none transition focus:border-stone-600 [color-scheme:light]";

const textareaClass =
    "w-full resize-none rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none transition focus:border-stone-600";

function getTodayDate() {
    return new Date().toISOString().slice(0, 10);
}

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

function toJsonArrayText(value: FormDataEntryValue | null) {
    const text = String(value ?? "").trim();

    if (!text) {
        return JSON.stringify([]);
    }

    const items = text
        .split(/[,，、\n]/)
        .map((item) => item.trim())
        .filter(Boolean);

    return JSON.stringify(items);
}

function getStatusLabel(status: string) {
    if (status === "published") return "已发布";
    if (status === "archived") return "已下架";
    return "草稿";
}

async function updateContent(formData: FormData) {
    "use server";

    const id = String(formData.get("id") ?? "");
    const action = String(formData.get("action") ?? "draft");

    const title = String(formData.get("title") ?? "").trim();
    const contentType = String(formData.get("contentType") ?? "recording");
    const date = String(formData.get("date") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();

    const speaker = String(formData.get("speaker") ?? "").trim();
    const series = String(formData.get("series") ?? "").trim();
    const scripture = String(formData.get("scripture") ?? "").trim();
    const duration = String(formData.get("duration") ?? "").trim();
    const typedResourceUrl = String(formData.get("resourceUrl") ?? "").trim();
    const uploadedResourceUrl = await saveUploadedResourceFile(
        formData.get("resourceFile")
    );
    const resourceUrl = uploadedResourceUrl ?? typedResourceUrl;
    const contentBody = String(formData.get("contentBody") ?? "").trim();

    if (!id) return;

    const isComplete = Boolean(title && contentType && date && description);
    const nextStatus = action === "publish" && isComplete ? "published" : "draft";

    await prisma.content.update({
        where: { id },
        data: {
            title: title || "未命名草稿",
            contentType,
            status: nextStatus,

            date: date || getTodayDate(),
            description: description || "暂无简介",

            speaker: speaker || null,
            series: series || null,
            scripture: scripture || null,
            duration: duration || null,
            resourceUrl: resourceUrl || null,
            contentBody: contentBody || null,

            tagsText: toJsonArrayText(formData.get("tags")),
            searchKeywordsText: toJsonArrayText(formData.get("searchKeywords")),

            publishedAt: nextStatus === "published" ? new Date() : null,
            archivedAt: null,
        },
    });

    revalidatePath("/admin");
    revalidatePath("/admin/sermons");
    revalidatePath(`/admin/sermons/${id}/edit`);
    revalidatePath("/sermons");
    revalidatePath(`/sermons/${id}`);
    revalidatePath("/dashboard");

    if (nextStatus === "draft") {
        redirect(`/admin/sermons/${id}/edit`);
    }

    redirect("/admin/sermons?status=published&type=all");
}

export default async function EditContentPage({ params }: Props) {
    const { id } = await params;

    const content = await prisma.content.findUnique({
        where: { id },
    });

    if (!content || content.deletedAt) {
        notFound();
    }

    return (
        <PageContainer>
            <PageHeader
                title="编辑内容"
                subtitle="修改内容信息。必填信息完整时可以发布；不完整时会继续保存为草稿。"
                action={
                    <Link
                        href="/admin/sermons"
                        className="inline-flex w-full justify-center rounded-full border border-stone-200 bg-white px-5 py-2.5 text-sm font-medium text-stone-600 transition hover:border-stone-300 hover:text-stone-900 sm:w-auto"
                    >
                        返回内容管理
                    </Link>
                }
            />

            <form
                action={updateContent}
                className="space-y-8 rounded-3xl border border-stone-200 bg-white p-4 shadow-sm sm:p-6"
            >
                <input type="hidden" name="id" value={content.id} />

                <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm leading-7 text-amber-800">
                    发布需要填写：标题、内容类型、日期、内容简介。没有填写完整时，系统会继续保存为草稿。
                </div>

                <section>
                    <div className="mb-5">
                        <h2 className="text-lg font-semibold text-stone-900">必填信息</h2>
                        <p className="mt-1 text-sm leading-6 text-stone-500">
                            这些信息决定内容是否可以正式发布。
                        </p>
                    </div>

                    <div className="grid gap-5 sm:gap-6 md:grid-cols-2">
                        <div>
                            <label className="mb-2 block text-sm font-medium text-stone-700">
                                内容标题 <span className="text-red-500">*</span>
                            </label>
                            <input
                                suppressHydrationWarning
                                name="title"
                                type="text"
                                defaultValue={content.title}
                                placeholder="例如：在安静中等候"
                                className={inputClass}
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium text-stone-700">
                                内容类型 <span className="text-red-500">*</span>
                            </label>
                            <select
                                suppressHydrationWarning
                                name="contentType"
                                defaultValue={content.contentType}
                                className={inputClass}
                            >
                                {contentTypes.map((type) => (
                                    <option key={type.value} value={type.value}>
                                        {type.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium text-stone-700">
                                日期 <span className="text-red-500">*</span>
                            </label>
                            <input
                                suppressHydrationWarning
                                name="date"
                                type="date"
                                defaultValue={content.date}
                                className={dateInputClass}
                            />
                        </div>
                    </div>

                    <div className="mt-5 sm:mt-6">
                        <label className="mb-2 block text-sm font-medium text-stone-700">
                            内容简介 <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            suppressHydrationWarning
                            name="description"
                            rows={4}
                            defaultValue={content.description}
                            placeholder="简单介绍这篇内容的主题和帮助。"
                            className={textareaClass}
                        />
                    </div>
                </section>

                <section className="border-t border-stone-100 pt-8">
                    <div className="mb-5">
                        <h2 className="text-lg font-semibold text-stone-900">选填信息</h2>
                        <p className="mt-1 text-sm leading-6 text-stone-500">
                            这些信息可以帮助分类、搜索和补充内容，但不是发布必须条件。
                        </p>
                    </div>

                    <div className="grid gap-5 sm:gap-6 md:grid-cols-2">
                        <div>
                            <label className="mb-2 block text-sm font-medium text-stone-700">
                                作者 / 讲员
                            </label>
                            <input
                                suppressHydrationWarning
                                name="speaker"
                                type="text"
                                defaultValue={content.speaker ?? ""}
                                placeholder="例如：陈牧师"
                                className={inputClass}
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium text-stone-700">
                                系列
                            </label>
                            <input
                                suppressHydrationWarning
                                name="series"
                                type="text"
                                defaultValue={content.series ?? ""}
                                placeholder="例如：安静中的学习"
                                className={inputClass}
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium text-stone-700">
                                经文 / 来源
                            </label>
                            <input
                                suppressHydrationWarning
                                name="scripture"
                                type="text"
                                defaultValue={content.scripture ?? ""}
                                placeholder="例如：诗篇 46:10"
                                className={inputClass}
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium text-stone-700">
                                时长
                            </label>
                            <input
                                suppressHydrationWarning
                                name="duration"
                                type="text"
                                defaultValue={content.duration ?? ""}
                                placeholder="例如：42 分钟"
                                className={inputClass}
                            />
                        </div>
                    </div>

                    <div className="mt-5 space-y-5 sm:mt-6 sm:space-y-6">
                        <div>
                            <label className="mb-2 block text-sm font-medium text-stone-700">
                                资源链接
                            </label>
                            <input
                                suppressHydrationWarning
                                name="resourceUrl"
                                type="text"
                                defaultValue={content.resourceUrl ?? ""}
                                placeholder="音频、图片、文件或外部链接地址"
                                className={inputClass}
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium text-stone-700">
                                资源链接
                            </label>
                            <input
                                suppressHydrationWarning
                                name="resourceUrl"
                                type="text"
                                defaultValue={content.resourceUrl ?? ""}
                                placeholder="音频、图片、文件或外部链接地址"
                                className={inputClass}
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium text-stone-700">
                                标签
                            </label>
                            <input
                                suppressHydrationWarning
                                name="tags"
                                type="text"
                                defaultValue={parseTextArray(content.tagsText)}
                                placeholder="用逗号分隔，例如：安静，等候，信靠"
                                className={inputClass}
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium text-stone-700">
                                搜索关键词
                            </label>
                            <input
                                suppressHydrationWarning
                                name="searchKeywords"
                                type="text"
                                defaultValue={parseTextArray(content.searchKeywordsText)}
                                placeholder="例如：链接，音频，PDF，图片，报告"
                                className={inputClass}
                            />
                            <p className="mt-2 text-xs leading-6 text-stone-400">
                                这些词不会直接显示给普通用户，但会帮助搜索锁定内容。
                            </p>
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium text-stone-700">
                                正文内容
                            </label>
                            <textarea
                                suppressHydrationWarning
                                name="contentBody"
                                rows={8}
                                defaultValue={content.contentBody ?? ""}
                                placeholder="可以填写文章正文、讲道整理、学习问题或补充说明。"
                                className={textareaClass}
                            />
                        </div>
                    </div>
                </section>

                <div className="flex flex-col gap-4 border-t border-stone-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm text-stone-400">
                        当前状态：
                        <span className="ml-1 font-medium text-stone-700">
                            {getStatusLabel(content.status)}
                        </span>
                    </div>

                    <div className="grid gap-3 sm:flex sm:flex-wrap sm:justify-end">
                        <Link
                            href="/admin/sermons"
                            className="inline-flex w-full justify-center rounded-full border border-stone-300 px-5 py-2.5 text-sm text-stone-600 transition hover:bg-stone-50 hover:text-stone-900 sm:w-auto"
                        >
                            取消
                        </Link>

                        <button
                            type="submit"
                            name="action"
                            value="draft"
                            className="w-full rounded-full bg-stone-100 px-5 py-2.5 text-sm font-medium text-stone-700 transition hover:bg-stone-200 sm:w-auto"
                        >
                            保存草稿
                        </button>

                        <button
                            type="submit"
                            name="action"
                            value="publish"
                            className="w-full rounded-full bg-stone-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-stone-700 sm:w-auto"
                        >
                            发布内容
                        </button>
                    </div>
                </div>
            </form>
        </PageContainer>
    );
}