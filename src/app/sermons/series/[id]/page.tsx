import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { PageContainer } from "@/components/PageContainer";
import { formatContentDate, getContentTypeLabel } from "@/lib/contentFormat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function PublicSeriesDetailPage({ params }: Props) {
  const { id } = await params;

  const series = await prisma.series.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true,
      title: true,
      description: true,
      imageUrl: true,
    },
  });

  if (!series) notFound();

  const contents = await prisma.content.findMany({
    where: {
      seriesId: series.id,
      status: "published",
      deletedAt: null,
    },
    orderBy: { date: "desc" },
    select: {
      id: true,
      title: true,
      speaker: true,
      date: true,
      scripture: true,
      description: true,
      contentType: true,
      duration: true,
    },
  });

  return (
    <PageContainer>
      <nav aria-label="返回" className="mb-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
        <Link href="/sermons/series" className="text-stone-500 transition hover:text-stone-800">
          ← 返回系列
        </Link>
        <Link href="/sermons" className="text-stone-500 transition hover:text-stone-800">
          真理集录
        </Link>
      </nav>

      <PageHeader title={series.title} subtitle={series.description?.trim() || undefined} />

      <div className="mb-8 aspect-[16/9] w-full max-w-2xl overflow-hidden rounded-xl bg-stone-100">
        {series.imageUrl?.trim() ? (
          <img
            src={series.imageUrl}
            alt={`${series.title} 系列封面`}
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

      <section aria-labelledby="series-contents-heading">
        <h2 id="series-contents-heading" className="mb-4 text-lg font-semibold text-stone-900">
          内容
        </h2>

        {contents.length === 0 ? (
          <p className="rounded-xl border border-stone-200 bg-white p-5 text-sm text-stone-600">
            此系列目前还没有公开内容。
          </p>
        ) : (
          <div className="grid gap-4">
            {contents.map((content) => (
              <Link
                key={content.id}
                href={`/sermons/${content.id}`}
                className="block min-w-0 rounded-xl border border-stone-200 bg-white p-4 shadow-sm transition hover:border-stone-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-700 sm:p-5"
              >
                <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-stone-500">
                  <span className="rounded-full bg-stone-100 px-3 py-1 text-stone-600">
                    {getContentTypeLabel(content.contentType)}
                  </span>
                  {content.date?.trim() && <span>{formatContentDate(content.date)}</span>}
                  {content.duration?.trim() && <span>{content.duration}</span>}
                </div>

                <h3 className="break-words text-lg font-semibold leading-7 text-stone-900">
                  {content.title}
                </h3>

                {content.description?.trim() && (
                  <p className="mt-2 line-clamp-2 break-words text-sm leading-7 text-stone-600">
                    {content.description}
                  </p>
                )}

                {(content.speaker?.trim() || content.scripture?.trim()) && (
                  <p className="mt-3 break-words text-xs leading-6 text-stone-500">
                    {[content.speaker?.trim(), content.scripture?.trim()].filter(Boolean).join(" · ")}
                  </p>
                )}
              </Link>
            ))}
          </div>
        )}
      </section>
    </PageContainer>
  );
}
