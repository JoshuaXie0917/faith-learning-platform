"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { isContentExpired } from "@/lib/contentRetention";
import { PageContainer } from "@/components/PageContainer";
import { MemberGate } from "@/components/MemberGate";
import { MemberStatusBar } from "@/components/MemberStatusBar";

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
  rawDate: string;
  duration: string | null;
  tags: string[];
  searchKeywords: string[];
  resourceUrl: string | null;
  viewCount: number;
};

type LocalShare = {
  id: string;
  name: string;
  title: string;
  content: string;
  createdAt: string;
};

type DisplayShare = {
  id: string;
  name: string;
  title: string;
  content: string;
  createdAt: string;
  createdDate: string;
  expiresAt: string;
  expiresDate: string;
  isOwner: boolean;
  isFavorite: boolean;
  href: string;
};

type SidePanel = "shares" | "favorites";

const SHARE_EXPIRE_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_TOTAL_FAVORITES = 30;

const contentTypeLabels: Record<string, string> = {
  recording: "录音",
  article: "文章",
  file: "文件",
  music: "音乐音频",
  image: "图片",
  link: "链接",
};

const contentTypeAliases: Record<string, string[]> = {
  recording: ["录音", "讲道录音", "音频", "mp3", "audio"],
  article: ["文章", "文字", "阅读", "文稿", "article"],
  file: ["文件", "资料", "附件", "pdf", "文档", "报告", "file"],
  music: ["音乐", "诗歌", "敬拜", "歌曲", "music", "song"],
  image: ["图片", "图像", "照片", "海报", "image", "photo"],
  link: ["链接", "网址", "外部链接", "url", "link"],
};

function formatDate(date: string) {
  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return date;
  }

  return `${parsedDate.getUTCFullYear()}年${parsedDate.getUTCMonth() + 1
    }月${parsedDate.getUTCDate()}日`;
}

function isLocalShareExpired(share: LocalShare) {
  return Date.now() - new Date(share.createdAt).getTime() > SHARE_EXPIRE_MS;
}

function getContentTypeLabel(type?: string) {
  if (!type) return "学习内容";
  return contentTypeLabels[type] ?? "学习内容";
}

function getContentTypeAliases(type?: string) {
  if (!type) return [];
  return contentTypeAliases[type] ?? [];
}

function readStringArrayFromStorage(key: string) {
  try {
    const savedValue = localStorage.getItem(key);

    if (!savedValue) return [];

    const parsedValue = JSON.parse(savedValue);

    if (!Array.isArray(parsedValue)) return [];

    return parsedValue.filter((item) => typeof item === "string");
  } catch {
    localStorage.removeItem(key);
    return [];
  }
}

function readLocalSharesFromStorage() {
  try {
    const savedValue = localStorage.getItem("localShares");

    if (!savedValue) return [];

    const parsedValue = JSON.parse(savedValue);

    if (!Array.isArray(parsedValue)) return [];

    return parsedValue.filter((item): item is LocalShare => {
      return (
        typeof item?.id === "string" &&
        typeof item?.name === "string" &&
        typeof item?.title === "string" &&
        typeof item?.content === "string" &&
        typeof item?.createdAt === "string"
      );
    });
  } catch {
    localStorage.removeItem("localShares");
    return [];
  }
}

function getOrCreateVisitorKey() {
  const savedKey = localStorage.getItem("readVisitorKey");

  if (savedKey) {
    return savedKey;
  }

  const newKey =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `visitor-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  localStorage.setItem("readVisitorKey", newKey);

  return newKey;
}

export default function SermonsPage() {
  const [searchKeyword, setSearchKeyword] = useState("");
  const [activeType, setActiveType] = useState("all");
  const [shares, setShares] = useState<DisplayShare[]>([]);
  const [favoriteShareIds, setFavoriteShareIds] = useState<string[]>([]);
  const [favoriteSermonIds, setFavoriteSermonIds] = useState<string[]>([]);
  const [readContentIds, setReadContentIds] = useState<string[]>([]);
  const [favoriteMessage, setFavoriteMessage] = useState("");
  const [officialContents, setOfficialContents] = useState<PublicContent[]>([]);
  const [sidePanel, setSidePanel] = useState<SidePanel>("shares");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedFavoriteSermonIds = JSON.parse(
      localStorage.getItem("favoriteSermonIds") ?? "[]"
    ) as string[];

    const savedReadContentIds = JSON.parse(
      localStorage.getItem("readContentIds") ?? "[]"
    ) as string[];

    setFavoriteSermonIds(savedFavoriteSermonIds);
    setReadContentIds(savedReadContentIds);
  }, []);

  useEffect(() => {
    async function loadContents() {
      try {
        const response = await fetch("/api/contents");
        const data = (await response.json()) as { contents?: PublicContent[] };

        setOfficialContents(data.contents ?? []);
      } catch {
        setOfficialContents([]);
      } finally {
        setIsLoading(false);
      }
    }

    loadContents();
  }, []);

  useEffect(() => {
    async function loadShares() {
      try {
        const visitorKey = getOrCreateVisitorKey();

        const response = await fetch(`/api/shares?visitorKey=${visitorKey}`);
        const data = (await response.json()) as {
          shares?: DisplayShare[];
        };

        const nextShares = (data.shares ?? []).map((share) => ({
          ...share,
          href: `/sermons/share/${share.id}`,
        }));

        setShares(nextShares);
      } catch {
        setShares([]);
      }
    }

    loadShares();
  }, []);

  useEffect(() => {
    if (!favoriteMessage) return;

    const timer = window.setTimeout(() => {
      setFavoriteMessage("");
    }, 3000);

    return () => window.clearTimeout(timer);
  }, [favoriteMessage]);

  const visibleSermons = useMemo(() => {
    return officialContents.filter((sermon) => {
      const isExpired = isContentExpired({ date: sermon.rawDate });
      const isFavorite = favoriteSermonIds.includes(sermon.id);

      return !isExpired || isFavorite;
    });
  }, [favoriteSermonIds, officialContents]);

  const typeFilters = useMemo(() => {
    const types = Array.from(
      new Set(visibleSermons.map((sermon) => sermon.contentType).filter(Boolean))
    );

    return [
      { value: "all", label: "全部" },
      ...types.map((type) => ({
        value: type,
        label: getContentTypeLabel(type),
      })),
    ];
  }, [visibleSermons]);

  const filteredSermons = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase();

    return visibleSermons
      .filter((sermon) => {
        if (activeType !== "all" && sermon.contentType !== activeType) {
          return false;
        }

        if (!keyword) return true;

        const searchText = [
          sermon.title,
          sermon.description,
          sermon.speaker,
          sermon.scripture,
          sermon.series ?? "",
          sermon.duration,
          sermon.contentType ?? "",
          sermon.contentTypeLabel,
          getContentTypeLabel(sermon.contentType),
          ...getContentTypeAliases(sermon.contentType),
          ...(sermon.tags ?? []),
          ...(sermon.searchKeywords ?? []),
        ]
          .join(" ")
          .toLowerCase();

        return searchText.includes(keyword);
      })
      .sort(
        (a, b) =>
          new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime()
      );
  }, [activeType, searchKeyword, visibleSermons]);

  const allShares = shares.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const favoriteShares = allShares.filter((share) => share.isFavorite);

  const totalFavoriteCount = favoriteShares.length + favoriteSermonIds.length;

  const favoriteSermons = officialContents.filter((sermon) =>
    favoriteSermonIds.includes(sermon.id)
  );

  function toggleFavoriteSermon(sermonId: string) {
    const isFavorite = favoriteSermonIds.includes(sermonId);

    if (!isFavorite && totalFavoriteCount >= MAX_TOTAL_FAVORITES) {
      setFavoriteMessage("收藏数量已达到 30 个上限。");
      return;
    }

    const nextIds = isFavorite
      ? favoriteSermonIds.filter((id) => id !== sermonId)
      : [...favoriteSermonIds, sermonId];

    setFavoriteSermonIds(nextIds);
    localStorage.setItem("favoriteSermonIds", JSON.stringify(nextIds));

    setFavoriteMessage(
      isFavorite
        ? "已取消收藏。"
        : `已收藏，当前共收藏 ${nextIds.length + favoriteShareIds.length
        } 个内容。`
    );
  }

  async function toggleReadContent(sermonId: string) {
    const isRead = readContentIds.includes(sermonId);
    const visitorKey = getOrCreateVisitorKey();

    try {
      const response = await fetch(`/api/contents/${sermonId}/read`, {
        method: isRead ? "DELETE" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          visitorKey,
        }),
      });

      const data = (await response.json()) as {
        ok?: boolean;
        error?: string;
        readCount?: number;
      };

      if (!response.ok) {
        setFavoriteMessage(
          data.error ??
          (isRead
            ? "取消已读失败，请稍后再试。"
            : "标记已读失败，请稍后再试。")
        );
        return;
      }

      const nextIds = isRead
        ? readContentIds.filter((id) => id !== sermonId)
        : Array.from(new Set([...readContentIds, sermonId]));

      setReadContentIds(nextIds);
      localStorage.setItem("readContentIds", JSON.stringify(nextIds));

      setFavoriteMessage(isRead ? "已切换为未读。" : "已标记为已读。");
    } catch {
      setFavoriteMessage(
        isRead ? "取消已读失败，请稍后再试。" : "标记已读失败，请稍后再试。"
      );
    }
  }

  async function toggleFavoriteShare(shareId: string) {
    const targetShare = shares.find((share) => share.id === shareId);

    if (!targetShare) return;

    const isFavorite = targetShare.isFavorite;

    if (!isFavorite && totalFavoriteCount >= MAX_TOTAL_FAVORITES) {
      setFavoriteMessage("收藏数量已达到 30 个上限。");
      return;
    }

    const visitorKey = getOrCreateVisitorKey();

    try {
      const response = await fetch(`/api/shares/${shareId}/favorite`, {
        method: isFavorite ? "DELETE" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          visitorKey,
        }),
      });

      const data = (await response.json()) as {
        ok?: boolean;
        error?: string;
      };

      if (!response.ok) {
        setFavoriteMessage(
          data.error ?? (isFavorite ? "取消收藏失败。" : "收藏分享失败。")
        );
        return;
      }

      setShares((currentShares) =>
        currentShares.map((share) =>
          share.id === shareId
            ? {
              ...share,
              isFavorite: !isFavorite,
            }
            : share
        )
      );

      setFavoriteMessage(isFavorite ? "已取消收藏。" : "已收藏分享。");
    } catch {
      setFavoriteMessage(isFavorite ? "取消收藏失败。" : "收藏分享失败。");
    }
  }

  return (
    <MemberGate returnTo="/sermons">
      <PageContainer>
        <PageHeader
          title="真理集录"
          subtitle="整理录音、文章、文件、音乐音频、图片与链接，帮助大家持续学习和回顾。"
          action={
            <Link
              href="/sermons/share"
              className="inline-flex w-full justify-center rounded-full bg-stone-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-stone-700 sm:w-auto"
            >
              发布分享
            </Link>
          }
        />
        <MemberStatusBar returnTo="/sermons" />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8">
          <main className="min-w-0 space-y-5 sm:space-y-6">
            <section className="rounded-3xl border border-stone-200 bg-white p-4 shadow-sm sm:p-6">
              <label className="mb-2 block text-sm font-medium text-stone-700">
                搜索正式内容
              </label>

              <input
                suppressHydrationWarning
                type="text"
                value={searchKeyword}
                onChange={(event) => setSearchKeyword(event.target.value)}
                placeholder="搜索标题、讲员、经文、链接、音频、图片、文件等"
                className="w-full rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none transition focus:border-stone-600"
              />

              <div className="-mx-1 mt-4 flex gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
                {typeFilters.map((filter) => (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() => setActiveType(filter.value)}
                    className={`shrink-0 rounded-full border px-3 py-1.5 text-xs transition ${activeType === filter.value
                      ? "border-stone-900 bg-stone-900 text-white"
                      : "border-stone-200 bg-white text-stone-600 hover:border-stone-400"
                      }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </section>

            {isLoading ? (
              <div className="rounded-3xl border border-stone-200 bg-white p-5 text-sm text-stone-500 shadow-sm sm:p-6">
                正在加载内容……
              </div>
            ) : filteredSermons.length === 0 ? (
              <div className="rounded-3xl border border-amber-100 bg-amber-50 p-5 text-center shadow-sm sm:p-8">
                <h2 className="text-lg font-semibold text-stone-900 sm:text-xl">
                  抱歉，没有找到匹配的内容
                </h2>

                <p className="mt-3 text-sm leading-7 text-stone-600">
                  可以尝试更换关键词，例如标题、讲员、经文、系列、链接、音频、图片、文件等。
                </p>

                <button
                  type="button"
                  onClick={() => {
                    setSearchKeyword("");
                    setActiveType("all");
                  }}
                  className="mt-5 rounded-full bg-stone-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-stone-700"
                >
                  清空搜索
                </button>
              </div>
            ) : (
              <section className="space-y-4">
                {filteredSermons.map((sermon) => {
                  const isFavorite = favoriteSermonIds.includes(sermon.id);
                  const isRead = readContentIds.includes(sermon.id);

                  return (
                    <article
                      key={sermon.id}
                      className="rounded-3xl border border-stone-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-6"
                    >
                      <Link href={`/sermons/${sermon.id}`} className="block">
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-stone-100 px-3 py-1 text-xs text-stone-600">
                            {sermon.contentTypeLabel ||
                              getContentTypeLabel(sermon.contentType)}
                          </span>

                          <span className="text-xs text-stone-400">
                            {sermon.date}
                          </span>

                          {sermon.duration && (
                            <span className="text-xs text-stone-400">
                              {sermon.duration}
                            </span>
                          )}
                        </div>

                        <h2 className="break-words text-lg font-semibold leading-8 text-stone-900 sm:text-xl">
                          {sermon.title}
                        </h2>

                        <p className="mt-3 line-clamp-3 text-sm leading-7 text-stone-600 sm:line-clamp-2">
                          {sermon.description}
                        </p>

                        {sermon.tags.length > 0 && (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {sermon.tags.map((tag) => (
                              <span
                                key={tag}
                                className="rounded-full bg-amber-50 px-3 py-1 text-xs text-amber-700"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </Link>

                      <div className="mt-5 flex flex-col gap-4 border-t border-stone-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="text-xs leading-6 text-stone-400">
                          {[sermon.speaker, sermon.scripture]
                            .filter(Boolean)
                            .join(" · ") || "学习内容"}
                        </div>

                        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                          <button
                            type="button"
                            onClick={() => toggleFavoriteSermon(sermon.id)}
                            className={`rounded-full px-3 py-2 text-xs transition ${isFavorite
                              ? "bg-amber-100 text-amber-800"
                              : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                              }`}
                          >
                            {isFavorite ? "已收藏" : "收藏"}
                          </button>

                          <button
                            type="button"
                            onClick={() => toggleReadContent(sermon.id)}
                            className={`rounded-full px-3 py-2 text-xs transition ${isRead
                              ? "bg-green-100 text-green-800 hover:bg-green-200"
                              : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                              }`}
                          >
                            {isRead ? "已读" : "标记已读"}
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </section>
            )}
          </main>

          <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
            <section className="rounded-3xl border border-stone-200 bg-white p-4 shadow-sm sm:p-6">
              <h2 className="text-lg font-semibold text-stone-900">
                弟兄姊妹分享
              </h2>

              <p className="mt-2 text-sm leading-7 text-stone-500">
                分享保存 7 天；被收藏的分享不会自动清理。正式内容和分享收藏总数最多 30 个。
              </p>

              <Link
                href="/sermons/share"
                className="mt-5 inline-flex w-full justify-center rounded-full bg-stone-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-stone-700 sm:w-auto"
              >
                写一条分享
              </Link>
            </section>

            <section className="rounded-3xl border border-stone-200 bg-white p-4 shadow-sm sm:p-6">
              <div className="mb-4 flex rounded-full bg-stone-100 p-1">
                <button
                  type="button"
                  onClick={() => setSidePanel("shares")}
                  className={`flex-1 rounded-full px-3 py-2 text-xs transition ${sidePanel === "shares"
                    ? "bg-white text-stone-900 shadow-sm"
                    : "text-stone-500"
                    }`}
                >
                  最近分享
                </button>

                <button
                  type="button"
                  onClick={() => setSidePanel("favorites")}
                  className={`flex-1 rounded-full px-3 py-2 text-xs transition ${sidePanel === "favorites"
                    ? "bg-white text-stone-900 shadow-sm"
                    : "text-stone-500"
                    }`}
                >
                  我的收藏
                </button>
              </div>

              <div className="mb-4 rounded-2xl bg-stone-50 p-4 text-sm text-stone-600">
                收藏总数：{totalFavoriteCount} / {MAX_TOTAL_FAVORITES}
              </div>

              {favoriteMessage && (
                <div className="mb-4 rounded-2xl bg-amber-50 p-3 text-sm leading-6 text-amber-800">
                  {favoriteMessage}
                </div>
              )}

              {sidePanel === "shares" ? (
                <div className="space-y-3">
                  {allShares.length === 0 ? (
                    <p className="text-sm text-stone-500">暂无公开分享。</p>
                  ) : (
                    allShares.slice(0, 8).map((share) => {
                      const isFavorite = share.isFavorite;

                      return (
                        <article
                          key={share.id}
                          className="rounded-2xl border border-stone-100 bg-stone-50 p-4"
                        >
                          <Link href={share.href} className="block">
                            <p className="line-clamp-2 font-medium leading-6 text-stone-900">
                              {share.title}
                            </p>

                            <p className="mt-2 line-clamp-3 text-sm leading-6 text-stone-600">
                              {share.content}
                            </p>

                            <p className="mt-3 text-xs text-stone-400">
                              {share.name} · {formatDate(share.createdAt)}
                            </p>
                          </Link>

                          <button
                            type="button"
                            onClick={() => toggleFavoriteShare(share.id)}
                            className={`mt-3 rounded-full px-3 py-1.5 text-xs transition ${isFavorite
                              ? "bg-amber-100 text-amber-800"
                              : "bg-white text-stone-600 hover:bg-stone-100"
                              }`}
                          >
                            {isFavorite ? "已收藏" : "收藏分享"}
                          </button>
                        </article>
                      );
                    })
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {favoriteSermons.length === 0 && favoriteShares.length === 0 ? (
                    <p className="text-sm leading-7 text-stone-500">
                      你还没有收藏内容。可以收藏正式内容，也可以收藏弟兄姊妹的分享。
                    </p>
                  ) : (
                    <>
                      {favoriteSermons.map((sermon) => (
                        <Link
                          key={sermon.id}
                          href={`/sermons/${sermon.id}`}
                          className="block rounded-2xl border border-stone-100 bg-stone-50 p-4 transition hover:bg-stone-100"
                        >
                          <p className="line-clamp-2 font-medium leading-6 text-stone-900">
                            {sermon.title}
                          </p>

                          <p className="mt-2 text-xs text-stone-400">
                            正式内容 · {sermon.date}
                          </p>
                        </Link>
                      ))}

                      {favoriteShares.map((share) => (
                        <Link
                          key={share.id}
                          href={share.href}
                          className="block rounded-2xl border border-stone-100 bg-stone-50 p-4 transition hover:bg-stone-100"
                        >
                          <p className="line-clamp-2 font-medium leading-6 text-stone-900">
                            {share.title}
                          </p>

                          <p className="mt-2 text-xs text-stone-400">
                            分享 · {share.name}
                          </p>
                        </Link>
                      ))}
                    </>
                  )}
                </div>
              )}
            </section>
          </aside>
        </div>
      </PageContainer>
    </MemberGate>
  );
}