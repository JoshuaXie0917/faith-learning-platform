import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { PageContainer } from "@/components/PageContainer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

function formatDate(date: Date | string | null) {
  if (!date) return "—";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "—";
  }

  const year = parsedDate.getFullYear();
  const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
  const day = String(parsedDate.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default async function AdminPage() {
  const [
    totalContents,
    publishedCount,
    draftCount,
    archivedCount,
    userCount,
    mainContents,
    recentContents,
    users,
  ] = await Promise.all([
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

    prisma.user.count({
      where: {
        role: "member",
        nameKey: {
          startsWith: "member-",
        },
        deletedAt: null,
      },
    }),

    prisma.content.findMany({
      where: {
        status: "published",
        deletedAt: null,
      },
      orderBy: {
        date: "desc",
      },
      select: {
        id: true,
        title: true,
        contentType: true,
        date: true,
        _count: {
          select: {
            reads: true,
          },
        },
      },
    }),

    prisma.content.findMany({
      where: {
        deletedAt: null,
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 5,
      select: {
        id: true,
        title: true,
        contentType: true,
        status: true,
        date: true,
        updatedAt: true,
        _count: {
          select: {
            reads: true,
          },
        },
      },
    }),

    prisma.user.findMany({
      where: {
        role: "member",
        nameKey: {
          startsWith: "member-",
        },
        deletedAt: null,
      },
      orderBy: {
        lastSeenAt: "desc",
      },
      take: 10,
      select: {
        id: true,
        name: true,
        role: true,
        createdAt: true,
        lastSeenAt: true,
      },
    }),
  ]);

  const summaryStats = [
    { label: "内容总数", value: totalContents },
    { label: "已发布", value: publishedCount },
    { label: "草稿", value: draftCount },
    { label: "已下架", value: archivedCount },
    { label: "活跃成员", value: userCount },
  ];

  return (
    <PageContainer>
      <PageHeader
        title="后台总览"
        subtitle="查看内容数量、每篇内容已读数量、用户数量和最近内容。"
        action={
          <Link
            href="/admin/sermons"
            className="inline-flex w-full justify-center rounded-full bg-stone-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-stone-700 sm:w-auto"
          >
            管理内容
          </Link>
        }
      />

      <section className="mb-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        {summaryStats.map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5"
          >
            <p className="mb-2 text-xs tracking-wider text-stone-400">
              {item.label}
            </p>

            <div className="text-2xl font-semibold text-stone-900">
              {item.value}
            </div>
          </div>
        ))}
      </section>

      <section className="mb-8 rounded-3xl border border-stone-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-stone-900 sm:text-xl">
              主要内容已读统计
            </h2>

            <p className="mt-1 text-sm leading-6 text-stone-500">
              这里按每一篇已发布内容统计已读人数。后台只显示数量，不显示具体是谁读过。
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {mainContents.length === 0 ? (
            <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5 text-sm leading-7 text-stone-600">
              目前还没有已发布内容。
            </div>
          ) : (
            mainContents.map((content) => (
              <Link
                key={content.id}
                href={`/admin/sermons/${content.id}/edit`}
                className="block rounded-2xl border border-stone-200 bg-stone-50 p-4 transition hover:bg-stone-100"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <h3 className="break-words font-semibold leading-7 text-stone-900">
                      {content.title}
                    </h3>

                    <p className="mt-1 text-xs text-stone-400">
                      {contentTypeLabels[content.contentType] ??
                        content.contentType}{" "}
                      · {formatDate(content.date)}
                    </p>
                  </div>

                  <div className="inline-flex w-full justify-center rounded-full bg-green-50 px-4 py-2 text-sm font-medium text-green-700 sm:w-auto">
                    已读 {content._count.reads} 人
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-stone-900 sm:text-xl">
                最近内容
              </h2>

              <p className="mt-1 text-sm text-stone-500">
                最近更新的内容和对应已读数量。
              </p>
            </div>

            <Link
              href="/admin/sermons"
              className="inline-flex w-full justify-center rounded-full border border-stone-200 bg-white px-4 py-2 text-sm text-stone-600 transition hover:border-stone-300 hover:text-stone-900 sm:w-auto"
            >
              查看全部 →
            </Link>
          </div>

          <div className="space-y-4">
            {recentContents.length === 0 ? (
              <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5 text-sm leading-7 text-stone-600">
                目前还没有内容。可以进入内容管理页面新增内容。
              </div>
            ) : (
              recentContents.map((content) => (
                <article
                  key={content.id}
                  className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm transition hover:border-stone-300 hover:shadow-md sm:p-5"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <h3 className="break-words font-semibold leading-7 text-stone-900">
                        {content.title}
                      </h3>

                      <p className="mt-1 text-xs text-stone-400">
                        日期：{formatDate(content.date)}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">
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
                      </div>
                    </div>

                    <Link
                      href={`/admin/sermons/${content.id}/edit`}
                      className="inline-flex w-full justify-center rounded-full bg-stone-100 px-4 py-2 text-sm text-stone-600 transition hover:bg-stone-200 sm:w-auto"
                    >
                      编辑
                    </Link>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        <aside>
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-stone-900 sm:text-xl">
              成员列表
            </h2>

            <p className="mt-1 text-sm text-stone-500">
              这里只显示输入姓名进入平台的普通成员。同名成员会因为唯一 id 不同而被分别统计。
            </p>
          </div>

          <div className="space-y-3">
            {users.length === 0 ? (
              <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5 text-sm leading-7 text-stone-600">
                目前还没有成员记录。成员在 /member 输入姓名后，会显示在这里。
              </div>
            ) : (
              users.map((user) => (
                <div
                  key={user.id}
                  className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-stone-900">
                        {user.name}
                      </p>

                      <p className="mt-1 break-all text-xs text-stone-400">
                        用户 ID：{user.id}
                      </p>

                      <p className="mt-1 text-xs text-stone-400">
                        注册时间：{formatDate(user.createdAt)}
                      </p>

                      <p className="mt-1 text-xs text-stone-400">
                        最后访问：{formatDate(user.lastSeenAt)}
                      </p>
                    </div>

                    <span className="shrink-0 rounded-full bg-stone-100 px-3 py-1 text-xs text-stone-600">
                      {user.role === "admin" ? "管理员" : "成员"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>
      </div>
    </PageContainer>
  );
}