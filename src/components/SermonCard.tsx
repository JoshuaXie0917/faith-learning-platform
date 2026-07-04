import Link from "next/link";
import type { Sermon } from "@/types";

interface SermonCardProps {
  sermon: Sermon;
  compact?: boolean;
}

export function SermonCard({ sermon, compact = false }: SermonCardProps) {
  const date = new Date(sermon.date).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <Link href={`/sermons/${sermon.id}`} className="group block">
      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white transition-all duration-200 hover:border-stone-300 hover:shadow-md">
        {/* 顶部色条 */}
        <div
          className="h-1.5"
          style={{ backgroundColor: sermon.coverColor }}
        />

        <div className={compact ? "p-4" : "p-5"}>
          {sermon.series && (
            <p className="mb-1.5 text-xs font-medium tracking-widest text-stone-400">
              {sermon.series}
            </p>
          )}

          <h3
            className={`font-serif leading-snug text-stone-900 transition-colors group-hover:text-amber-700 ${
              compact ? "text-base" : "text-lg"
            }`}
          >
            {sermon.title}
          </h3>

          {!compact && (
            <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-stone-500">
              {sermon.description}
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-stone-400">
            <span>{sermon.speaker}</span>
            <span className="text-stone-300">·</span>
            <span>{date}</span>
            <span className="text-stone-300">·</span>
            <span>{sermon.duration}</span>
          </div>

          {!compact && sermon.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {sermon.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-500"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}