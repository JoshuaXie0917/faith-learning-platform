import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { PageContainer } from "@/components/PageContainer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function PublicSeriesPage() {
  const seriesList = await prisma.series.findMany({
    where: { deletedAt: null },
    orderBy: { title: "asc" },
    select: {
      id: true,
      title: true,
      description: true,
      imageUrl: true,
      _count: {
        select: {
          contents: {
            where: {
              status: "published",
              deletedAt: null,
            },
          },
        },
      },
    },
  });

  return (
    <PageContainer>
      <Link
        href="/sermons"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-stone-500 transition hover:text-stone-800"
      >
        ← 返回真理集录
      </Link>

      <PageHeader title="系列" />

      {seriesList.length === 0 ? (
        <p className="rounded-xl border border-stone-200 bg-white p-5 text-sm text-stone-600">
          目前还没有系列。
        </p>
      ) : (
        <section aria-label="系列列表" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {seriesList.map((series) => (
            <article
              key={series.id}
              className="min-w-0 rounded-xl border border-stone-200 bg-white p-4 shadow-sm"
            >
              <div className="aspect-[16/9] overflow-hidden rounded-lg bg-stone-100">
                {series.imageUrl?.trim() ? (
                  <img
                    src={series.imageUrl}
                    alt={`${series.title} 系列封面`}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div aria-hidden="true" className="flex h-full items-center justify-center p-6">
                    <div className="w-2/3 max-w-44 space-y-3">
                      <div className="h-3 w-2/3 rounded-full bg-stone-300" />
                      <div className="h-2 w-full rounded-full bg-stone-200" />
                      <div className="h-2 w-5/6 rounded-full bg-stone-200" />
                      <div className="h-2 w-3/4 rounded-full bg-stone-200" />
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4 flex items-start justify-between gap-3">
                <h2 className="min-w-0 break-words text-lg font-semibold leading-7 text-stone-900">
                  {series.title}
                </h2>
                <span className="shrink-0 rounded-full bg-stone-100 px-2.5 py-1 text-xs text-stone-600">
                  {series._count.contents} 篇内容
                </span>
              </div>

              {series.description?.trim() && (
                <p className="mt-3 line-clamp-3 break-words text-sm leading-7 text-stone-600">
                  {series.description}
                </p>
              )}
            </article>
          ))}
        </section>
      )}
    </PageContainer>
  );
}
