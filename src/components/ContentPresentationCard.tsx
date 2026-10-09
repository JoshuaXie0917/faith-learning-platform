import Link from "next/link";
import type { ReactNode } from "react";

type CardContent = {
  id: string;
  title: string;
  description?: string | null;
  contentTypeLabel?: string | null;
  speaker?: string | null;
  date?: string | null;
  scripture?: string | null;
  duration?: string | null;
  readCount?: number;
  tags?: string[];
};

type CardSeries = {
  title: string;
  imageUrl?: string | null;
};

type AdminPublicAction = {
  href: string;
  label: string;
};

type ContentPresentationCardProps = {
  mode: "admin" | "public";
  content: CardContent;
  series?: CardSeries | null;
  href?: string;
  adminTitleHref?: string;
  adminPublicAction?: AdminPublicAction;
  adminEditPrimary?: boolean;
  actions?: ReactNode;
  footer?: ReactNode;
};

function SeriesCover({ series }: { series: CardSeries }) {
  return (
    <div className="aspect-[16/9] min-w-0 overflow-hidden rounded-md border border-stone-200 bg-stone-100 sm:aspect-[4/3]">
      {series.imageUrl?.trim() ? (
        <img
          src={series.imageUrl}
          alt={`${series.title} 系列封面`}
          loading="lazy"
          className="h-full w-full object-cover"
        />
      ) : (
        <div aria-hidden="true" className="flex h-full items-center justify-center p-5">
          <div className="w-2/3 max-w-32 space-y-2.5">
            <div className="h-2.5 w-2/3 rounded-full bg-stone-300" />
            <div className="h-2 w-full rounded-full bg-stone-200" />
            <div className="h-2 w-5/6 rounded-full bg-stone-200" />
          </div>
        </div>
      )}
    </div>
  );
}

function CardDetails({
  content,
  series,
  titleHref,
  roomy = false,
}: {
  content: CardContent;
  series?: CardSeries | null;
  titleHref?: string;
  roomy?: boolean;
}) {
  const title = (
    <span className="break-words">{content.title}</span>
  );
  const detailSpacing = roomy ? "mt-4" : "mt-3";
  const titleClassName = roomy
    ? "mt-4 block text-xl font-semibold leading-8 text-stone-950 transition hover:text-amber-800 sm:text-[1.35rem]"
    : "mt-3 block text-lg font-semibold leading-7 text-stone-950 transition hover:text-amber-800 sm:text-xl";
  const headingClassName = roomy
    ? "mt-4 text-xl font-semibold leading-8 text-stone-950 sm:text-[1.35rem]"
    : "mt-3 text-lg font-semibold leading-7 text-stone-950 sm:text-xl";

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        {series && (
          <span className="inline-flex max-w-full rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-900 shadow-sm">
            <span className="min-w-0 md:truncate">{series.title}</span>
          </span>
        )}
        {content.contentTypeLabel && (
          <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs text-stone-600">
            {content.contentTypeLabel}
          </span>
        )}
        {typeof content.readCount === "number" && (
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs text-emerald-700">
            已读 {content.readCount} 人
          </span>
        )}
      </div>

      {titleHref ? (
        <Link
          href={titleHref}
          className={titleClassName}
        >
          {title}
        </Link>
      ) : (
        <h3 className={headingClassName}>
          {title}
        </h3>
      )}

      {content.speaker?.trim() && (
        <div className={detailSpacing}>
          <span className="inline-flex max-w-full items-center rounded-full bg-stone-900 px-3 py-1 text-xs font-medium text-white">
            <span className="min-w-0 md:truncate">{content.speaker}</span>
          </span>
        </div>
      )}

      {(content.date?.trim() || content.scripture?.trim() || content.duration?.trim()) && (
        <div className={`${detailSpacing} flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-stone-500`}>
          {content.date?.trim() && <span>{content.date}</span>}
          {content.scripture?.trim() && <span className="break-words">{content.scripture}</span>}
          {content.duration?.trim() && <span>{content.duration}</span>}
        </div>
      )}

      {content.tags && content.tags.length > 0 && (
        <div className={`${detailSpacing} flex flex-wrap gap-2`}>
          {content.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-amber-50 px-2.5 py-1 text-xs text-amber-700">
              {tag}
            </span>
          ))}
        </div>
      )}

    </div>
  );
}

function SummaryPanel({
  description,
  roomy = false,
}: {
  description?: string | null;
  roomy?: boolean;
}) {
  return (
    <aside className={`min-w-0 rounded-lg border border-stone-200 bg-stone-50 ${roomy ? "p-5" : "p-4"}`}>
      <p className="text-xs font-medium text-stone-500">摘要</p>
      <p className={`mt-2 whitespace-pre-wrap break-words text-sm leading-6 ${description?.trim() ? "text-stone-600" : "text-stone-400"}`}>
        {description?.trim() || "暂无摘要"}
      </p>
    </aside>
  );
}

function PresentationGrid({
  content,
  series,
  titleHref,
  actions,
  roomy = false,
}: {
  content: CardContent;
  series?: CardSeries | null;
  titleHref?: string;
  actions?: ReactNode;
  roomy?: boolean;
}) {
  const gridClassName = series
    ? actions
      ? roomy
        ? "grid grid-cols-1 gap-5 sm:grid-cols-[11rem_minmax(0,1fr)] xl:grid-cols-[10.5rem_minmax(0,1fr)_minmax(14rem,0.85fr)_auto]"
        : "grid grid-cols-1 gap-4 sm:grid-cols-[10rem_minmax(0,1fr)] xl:grid-cols-[9rem_minmax(0,1fr)_minmax(13rem,0.8fr)_auto]"
      : "grid grid-cols-1 gap-4 sm:grid-cols-[10rem_minmax(0,1fr)] xl:grid-cols-[9rem_minmax(0,1fr)_minmax(13rem,0.8fr)]"
    : actions
      ? roomy
        ? "grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(14rem,0.85fr)_auto]"
        : "grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(13rem,0.8fr)_auto]"
      : "grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_minmax(13rem,0.8fr)]";

  return (
    <div className={gridClassName}>
      {series && <SeriesCover series={series} />}
      <CardDetails content={content} series={series} titleHref={titleHref} roomy={roomy} />
      <div className={series ? "sm:col-span-2 xl:col-span-1" : ""}>
        <SummaryPanel description={content.description} roomy={roomy} />
      </div>
      {actions && (
        <div className={`${series ? "sm:col-span-2" : "md:col-span-2"} flex flex-wrap items-start ${roomy ? "gap-3 xl:w-36" : "gap-2 xl:w-32"} xl:col-span-1 xl:flex-col`}>
          {actions}
        </div>
      )}
    </div>
  );
}

export function ContentPresentationCard({
  mode,
  content,
  series = null,
  href,
  adminTitleHref,
  adminPublicAction,
  adminEditPrimary = false,
  actions,
  footer,
}: ContentPresentationCardProps) {
  if (mode === "public") {
    if (!href) return null;

    return (
      <article className="min-w-0 overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm transition hover:border-stone-300 hover:shadow-md">
        <Link
          href={href}
          className="group block p-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-700 sm:p-5"
        >
          <PresentationGrid content={content} series={series} />
        </Link>
        {footer && <div className="border-t border-stone-100 px-4 py-3 sm:px-5">{footer}</div>}
      </article>
    );
  }

  const primaryActionClassName =
    "inline-flex w-full items-center justify-center rounded-lg bg-stone-900 px-3 py-2.5 max-md:py-3 text-sm font-medium text-white transition hover:bg-stone-700";
  const secondaryActionClassName =
    "inline-flex w-full items-center justify-center rounded-lg border border-stone-300 bg-white px-3 py-2.5 max-md:py-3 text-sm font-medium text-stone-700 transition hover:border-stone-500 hover:text-stone-950";
  const editAction = (
    <Link
      href={`/admin/sermons/${content.id}/edit`}
      className={adminEditPrimary ? primaryActionClassName : secondaryActionClassName}
    >
      编辑
    </Link>
  );
  const publicAction = adminPublicAction ? (
    <Link
      href={adminPublicAction.href}
      className={adminEditPrimary ? secondaryActionClassName : primaryActionClassName}
    >
      {adminPublicAction.label}
    </Link>
  ) : null;
  const adminActions = (
    <>
      {adminEditPrimary && editAction}
      {publicAction}
      {!adminEditPrimary && editAction}
      {actions}
    </>
  );

  return (
    <article className="min-w-0 rounded-lg border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
      <PresentationGrid
        content={content}
        series={series}
        titleHref={adminTitleHref}
        actions={adminActions}
        roomy
      />
    </article>
  );
}
