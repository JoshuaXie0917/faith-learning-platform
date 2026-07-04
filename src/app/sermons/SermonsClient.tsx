"use client";

type PublicContent = {
  id: string;
  title: string;
  description: string;
  contentType: string;
  contentTypeLabel: string;
  speaker: string | null;
  scripture: string | null;
  series: string | null;
  date: string;
  duration: string | null;
  tags: string[];
  searchKeywords: string[];
  resourceUrl: string | null;
  viewCount: number;
};

type SermonsClientProps = {
  contents: PublicContent[];
};

export function SermonsClient({ contents }: SermonsClientProps) {
  return (
    <section className="space-y-4">
      <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-stone-900">
          数据库内容测试
        </h2>
        <p className="mt-2 text-sm text-stone-500">
          当前从数据库读取到 {contents.length} 条已发布内容。
        </p>
      </div>

      <div className="grid gap-4">
        {contents.map((content) => (
          <article
            key={content.id}
            className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm"
          >
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-stone-100 px-3 py-1 text-xs text-stone-600">
                {content.contentTypeLabel}
              </span>

              <span className="text-xs text-stone-400">{content.date}</span>
            </div>

            <h3 className="text-xl font-semibold text-stone-900">
              {content.title}
            </h3>

            <p className="mt-3 text-sm leading-7 text-stone-600">
              {content.description}
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {content.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-amber-50 px-3 py-1 text-xs text-amber-700"
                >
                  {tag}
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}