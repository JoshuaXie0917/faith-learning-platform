import Link from "next/link";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { PageContainer } from "@/components/PageContainer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{
    status?: string;
    type?: string;
  }>;
};

const contentTypeLabels: Record<string, string> = {
  recording: "录音",
  article: "文章",
  file: "文件",
  music: "音乐音频",
  image: "图片",
  link: "链接",
};

const statusLabels: Record<string, string> = {
  published: "已发布",
  draft: "草稿",
  archived: "已下架",
};

const statusFilters = [
  { value: "all", label: "全部" },
  { value: "published", label: "已发布" },
  { value: "draft", label: "草稿" },
  { value: "archived", label: "已下架" },
];

const typeFilters = [
  { value: "all", label: "全部类型" },
  { value: "recording", label: "录音" },
  { value: "article", label: "文章" },
  { value: "file", label: "文件" },
  { value: "music", label: "音乐音频" },
  { value: "image", label: "图片" },
  { value: "link", label: "链接" },
];

function formatDateShort(date: string | Date | null) {
  if (!date) return "";

  const d = new Date(date);

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

async function changeContentStatus(formData: FormData) {
  "use server";

  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");

  if (!id || !["published", "draft", "archived"].includes(status)) {
    return;
  }

  await prisma.content.update({
    where: { id },
    data: {
      status,
      publishedAt: status === "published" ? new Date() : null,
      archivedAt: status === "archived" ? new Date() : null,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/sermons");
  revalidatePath("/sermons");
}

async function deleteContent(formData: FormData) {
  "use server";

  const id = String(formData.get("id") ?? "");

  if (!id) return;

  await prisma.content.update({
    where: { id },
    data: {
      deletedAt: new Date(),
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/sermons");
  revalidatePath("/sermons");
}

export default async function AdminSermonsPage({ searchParams }: Props) {
  const params = await searchParams;

  const activeStatus = params.status ?? "all";
  const activeType = params.type ?? "all";

  const where = {
    deletedAt: null,
    ...(activeStatus !== "all" ? { status: activeStatus } : {}),
    ...(activeType !== "all" ? { contentType: activeType } : {}),
  };

  const [contents, totalCount, publishedCount, draftCount, archivedCount] =
    await Promise.all([
      prisma.content.findMany({
        where,
        orderBy: {
          updatedAt: "desc",
        },
        select: {
          id: true,
          title: true,
          contentType: true,
          status: true,
          speaker: true,
          date: true,
          duration: true,
          resourceUrl: true,
          updatedAt: true,
          _count: {
            select: {
              reads: true,
            },
          },
        },
      }),

      prisma.content.count({
        where: {
          deletedAt: null,
        },
      }),

      prisma.content.count({
        where: {
          status: "published",
          deletedAt: null,
        },
      }),

      prisma.content.count({
        where: {
          status: "draft",
          deletedAt: null,
        },
      }),

      prisma.content.count({
        where: {
          status: "archived",
          deletedAt: null,
        },
      }),
    ]);

  const summaryStats = [
    { label: "全部内容", value: totalCount },
    { label: "已发布", value: publishedCount },
    { label: "草稿", value: draftCount },
    { label: "已下架", value: archivedCount },
  ];

  return (
    <PageContainer>
      <PageHeader
        title="内容管理"
        subtitle="管理真理集录中的正式内容，包括发布、保存草稿、编辑、下架、删除和已读统计。"
        action={
          <Link
            href="/admin/sermons/new"
            className="inline-flex w-full justify-center rounded-full bg-stone-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-stone-700 sm:w-auto"
          >
            + 新增内容
          </Link>
        }
      />

      <section className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {summaryStats.map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5"
          >
            <p className="mb-1 text-xs text-stone-400">{item.label}</p>
            <p className="text-xl font-semibold text-stone-900">
              {item.value}
            </p>
          </div>
        ))}
      </section>

      <section className="mb-6 space-y-4 rounded-3xl border border-stone-200 bg-white p-4 shadow-sm sm:p-6">
        <div>
          <p className="mb-2 text-sm font-medium text-stone-700">内容状态</p>

          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
            {statusFilters.map((filter) => (
              <Link
                key={filter.value}
                href={`/admin/sermons?status=${filter.value}&type=${activeType}`}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs transition ${activeStatus === filter.value
                    ? "border-stone-900 bg-stone-900 text-white"
                    : "border-stone-200 bg-white text-stone-600 hover:border-stone-400"
                  }`}
              >
                {filter.label}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-stone-700">内容类型</p>

          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
            {typeFilters.map((filter) => (
              <Link
                key={filter.value}
                href={`/admin/sermons?status=${activeStatus}&type=${filter.value}`}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs transition ${activeType === filter.value
                    ? "border-amber-700 bg-amber-700 text-white"
                    : "border-stone-200 bg-white text-stone-600 hover:border-stone-400"
                  }`}
              >
                {filter.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        {contents.length === 0 ? (
          <div className="rounded-3xl border border-amber-100 bg-amber-50 p-6 text-center shadow-sm">
            <p className="text-sm leading-7 text-stone-600">
              当前筛选条件下没有内容。
            </p>
          </div>
        ) : (
          contents.map((content) => (
            <article
              key={content.id}
              className="rounded-3xl border border-stone-200 bg-white p-4 shadow-sm transition hover:border-stone-300 hover:shadow-md sm:p-5"
            >
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
                <div className="min-w-0">
                  <div className="mb-3 flex flex-wrap gap-2">
                    <span className="rounded-full bg-stone-100 px-3 py-1 text-xs text-stone-600">
                      {contentTypeLabels[content.contentType] ??
                        content.contentType}
                    </span>

                    <span className="rounded-full bg-amber-50 px-3 py-1 text-xs text-amber-700">
                      {statusLabels[content.status] ?? content.status}
                    </span>

                    <span className="rounded-full bg-green-50 px-3 py-1 text-xs text-green-700">
                      已读 {content._count.reads} 人
                    </span>

                    {content.duration && (
                      <span className="rounded-full bg-stone-50 px-3 py-1 text-xs text-stone-500">
                        {content.duration}
                      </span>
                    )}
                  </div>

                  <h2 className="break-words text-base font-semibold leading-7 text-stone-900 sm:text-lg">
                    {content.title}
                  </h2>

                  <p className="mt-2 text-xs leading-6 text-stone-400">
                    {content.speaker ?? "未填写作者"} · {formatDateShort(content.date)}
                  </p>

                  {content.resourceUrl && (
                    <p className="mt-2 line-clamp-1 break-all text-xs text-stone-400">
                      资源：{content.resourceUrl}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-start lg:max-w-[360px] lg:justify-end">
                  {content.status === "published" && (
                    <Link
                      href={`/sermons/${content.id}`}
                      className="inline-flex justify-center rounded-full bg-stone-100 px-3 py-2 text-xs text-stone-600 transition hover:bg-stone-200"
                    >
                      查看
                    </Link>
                  )}

                  {content.status !== "published" && (
                    <form action={changeContentStatus}>
                      <input type="hidden" name="id" value={content.id} />
                      <input type="hidden" name="status" value="published" />
                      <button
                        type="submit"
                        className="w-full rounded-full bg-green-50 px-3 py-2 text-xs text-green-700 transition hover:bg-green-100 sm:w-auto"
                      >
                        发布
                      </button>
                    </form>
                  )}

                  {content.status !== "draft" && (
                    <form action={changeContentStatus}>
                      <input type="hidden" name="id" value={content.id} />
                      <input type="hidden" name="status" value="draft" />
                      <button
                        type="submit"
                        className="w-full rounded-full bg-stone-100 px-3 py-2 text-xs text-stone-600 transition hover:bg-stone-200 sm:w-auto"
                      >
                        转草稿
                      </button>
                    </form>
                  )}

                  {content.status !== "archived" && (
                    <form action={changeContentStatus}>
                      <input type="hidden" name="id" value={content.id} />
                      <input type="hidden" name="status" value="archived" />
                      <button
                        type="submit"
                        className="w-full rounded-full bg-amber-50 px-3 py-2 text-xs text-amber-700 transition hover:bg-amber-100 sm:w-auto"
                      >
                        下架
                      </button>
                    </form>
                  )}

                  <Link
                    href={`/admin/sermons/${content.id}/edit`}
                    className="inline-flex justify-center rounded-full bg-stone-100 px-3 py-2 text-xs text-stone-600 transition hover:bg-stone-200"
                  >
                    编辑
                  </Link>

                  <form action={deleteContent}>
                    <input type="hidden" name="id" value={content.id} />
                    <button
                      type="submit"
                      className="w-full rounded-full bg-red-50 px-3 py-2 text-xs text-red-600 transition hover:bg-red-100 sm:w-auto"
                    >
                      删除
                    </button>
                  </form>
                </div>
              </div>
            </article>
          ))
        )}
      </section>

      <div className="mt-4 flex flex-col gap-2 text-xs text-stone-400 sm:flex-row sm:items-center sm:justify-between">
        <p>当前显示 {contents.length} 条内容。</p>

        <p>支持发布、保存草稿、编辑、下架和删除。</p>
      </div>
    </PageContainer>
  );
}