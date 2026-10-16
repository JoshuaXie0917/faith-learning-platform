"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { PageContainer } from "@/components/PageContainer";
import {
  loadAndMigrateContentFavorites,
  readLegacyContentFavoriteIds,
} from "@/lib/contentFavoritesClient";
import { getOrCreateVisitorKey } from "@/lib/visitorKeyClient";
import { visitorKeyHeaders } from "@/lib/visitorKeyHeader";

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

type DatabaseShare = {
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
};

export default function DashboardPage() {
  const [favoriteSermonIds, setFavoriteSermonIds] = useState<string[]>([]);
  const [officialContents, setOfficialContents] = useState<PublicContent[]>([]);
  const [shares, setShares] = useState<DatabaseShare[]>([]);
  const [isLoadingContents, setIsLoadingContents] = useState(true);
  const [isLoadingShares, setIsLoadingShares] = useState(true);
  const [contentsFailed, setContentsFailed] = useState(false);
  const [sharesFailed, setSharesFailed] = useState(false);
  const [contentsAttempt, setContentsAttempt] = useState(0);
  const [sharesAttempt, setSharesAttempt] = useState(0);

  useEffect(() => {
    let isCancelled = false;

    setFavoriteSermonIds(readLegacyContentFavoriteIds());

    async function loadFavoriteContents() {
      try {
        const visitorKey = getOrCreateVisitorKey();
        const result = await loadAndMigrateContentFavorites(visitorKey);

        if (!isCancelled) {
          setFavoriteSermonIds(result.favoriteContentIds);
        }
      } catch {
        // Keep the browser favorites available until migration can be retried.
      }
    }

    loadFavoriteContents();

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    let isCancelled = false;

    async function loadContents() {
      setIsLoadingContents(true);
      setContentsFailed(false);

      try {
        // Sets the visitor cookie first, so overdue favorites are included.
        getOrCreateVisitorKey();
        const response = await fetch("/api/contents", { cache: "no-store" });
        const data = (await response.json().catch(() => null)) as { contents?: PublicContent[] } | null;

        // A failed request is an error, never "no content yet".
        if (!response.ok || !data || !Array.isArray(data.contents)) throw new Error("内容读取失败");

        if (!isCancelled) setOfficialContents(data.contents);
      } catch {
        if (!isCancelled) setContentsFailed(true);
      } finally {
        if (!isCancelled) setIsLoadingContents(false);
      }
    }

    loadContents();

    return () => {
      isCancelled = true;
    };
  }, [contentsAttempt]);

  useEffect(() => {
    let isCancelled = false;

    async function loadShares() {
      setIsLoadingShares(true);
      setSharesFailed(false);

      try {
        const visitorKey = getOrCreateVisitorKey();

        const response = await fetch("/api/shares", { headers: visitorKeyHeaders(visitorKey), cache: "no-store" });
        const data = (await response.json().catch(() => null)) as {
          shares?: DatabaseShare[];
        } | null;

        if (!response.ok || !data || !Array.isArray(data.shares)) throw new Error("分享读取失败");

        if (!isCancelled) setShares(data.shares);
      } catch {
        if (!isCancelled) setSharesFailed(true);
      } finally {
        if (!isCancelled) setIsLoadingShares(false);
      }
    }

    loadShares();

    return () => {
      isCancelled = true;
    };
  }, [sharesAttempt]);

  // Shown in the stat tiles while loading or after a failure, instead of a misleading 0.
  const contentCount = isLoadingContents ? "…" : contentsFailed ? "—" : officialContents.length;
  const shareCount = isLoadingShares ? "…" : sharesFailed ? "—" : shares.length;

  const latestContents = officialContents.slice(0, 5);
  const latestShares = shares.slice(0, 5);

  return (
    <PageContainer>
      <PageHeader
        title="欢迎来到学习中心"
        subtitle="这里整理最新学习内容、弟兄姊妹分享和个人收藏，帮助大家持续学习与回顾。"
      />

      <section className="mb-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {[
          { label: "可学习内容", value: contentCount },
          { label: "公开分享", value: shareCount },
          { label: "我的收藏", value: favoriteSermonIds.length },
          { label: "平台状态", value: "开放浏览" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5"
          >
            <p className="mb-2 text-xs tracking-wider text-stone-500">
              {stat.label}
            </p>

            <div className="break-words text-lg font-semibold text-stone-900 sm:text-xl">
              {stat.value}
            </div>
          </div>
        ))}
      </section>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-stone-900 sm:text-xl">
                最新内容
              </h2>

              <p className="mt-1 text-sm leading-6 text-stone-500">
                最近添加到平台的学习材料、讲道和整理内容。
              </p>
            </div>

            <Link
              href="/sermons"
              className="inline-flex w-full items-center justify-center rounded-full border border-stone-200 bg-white px-4 py-2 text-sm text-stone-600 transition hover:border-stone-300 hover:text-stone-900 max-lg:min-h-11 sm:w-auto"
            >
              查看全部
            </Link>
          </div>

          <div className="space-y-4">
            {isLoadingContents ? (
              <div role="status" className="rounded-2xl border border-stone-200 bg-white p-5 text-sm text-stone-500 shadow-sm sm:p-6">
                正在加载最新内容……
              </div>
            ) : contentsFailed ? (
              <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm leading-7 text-red-700 sm:p-6">
                <p>最新内容暂时无法读取，请检查网络后重新加载。</p>
                <button
                  type="button"
                  onClick={() => setContentsAttempt((attempt) => attempt + 1)}
                  className="mt-3 rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-stone-700 max-lg:min-h-11"
                >
                  重新加载
                </button>
              </div>
            ) : latestContents.length === 0 ? (
              <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5 text-sm leading-7 text-stone-600 sm:p-6">
                目前还没有内容。管理员添加内容后，会显示在这里。
              </div>
            ) : (
              latestContents.map((content) => (
                <Link
                  key={content.id}
                  href={`/sermons/${content.id}`}
                  className="group block rounded-2xl border border-stone-200 bg-white p-4 shadow-sm transition hover:border-stone-300 hover:shadow-md sm:p-6"
                >
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <span className="rounded-full bg-stone-100 px-3 py-1 text-xs text-stone-600">
                      {content.series || content.contentTypeLabel}
                    </span>

                    <span className="text-xs text-stone-500">
                      {content.contentTypeLabel}
                    </span>
                  </div>

                  <h3 className="text-lg font-semibold leading-8 text-stone-900 transition group-hover:text-amber-800 sm:text-2xl">
                    {content.title}
                  </h3>

                  <p className="mt-3 line-clamp-2 text-sm leading-7 text-stone-600">
                    {content.description}
                  </p>

                  <div className="mt-5 flex flex-col gap-2 text-sm text-stone-500 sm:flex-row sm:items-center sm:justify-between">
                    <span>{content.date}</span>
                    <span className="text-stone-500 transition group-hover:text-stone-900">
                      进入学习 →
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>

        <aside>
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-stone-900 sm:text-xl">
              弟兄姊妹分享
            </h2>

            <p className="mt-1 text-sm leading-6 text-stone-500">
              弟兄姊妹最近公开发布的学习分享。
            </p>
          </div>

          <div className="space-y-4">
            {isLoadingShares ? (
              <div role="status" className="rounded-2xl border border-stone-200 bg-white p-5 text-sm text-stone-500 shadow-sm">
                正在加载分享……
              </div>
            ) : sharesFailed ? (
              <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm leading-7 text-red-700">
                <p>分享暂时无法读取，请稍后重新加载。</p>
                <button
                  type="button"
                  onClick={() => setSharesAttempt((attempt) => attempt + 1)}
                  className="mt-3 rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-stone-700 max-lg:min-h-11"
                >
                  重新加载
                </button>
              </div>
            ) : latestShares.length === 0 ? (
              <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5 text-sm leading-7 text-stone-600">
                暂无公开分享。你可以成为第一个发布分享的人。
              </div>
            ) : (
              latestShares.map((share) => (
                <Link
                  key={share.id}
                  href={`/sermons/share/${share.id}`}
                  className="block rounded-2xl border border-stone-200 bg-white p-4 shadow-sm transition hover:border-stone-300 hover:shadow-md sm:p-5"
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-stone-900">
                        {share.name}
                      </p>

                      <p className="mt-1 text-xs text-stone-500">
                        {share.createdDate}
                      </p>
                    </div>

                    <span className="shrink-0 rounded-full bg-amber-50 px-3 py-1 text-xs text-amber-700">
                      分享
                    </span>
                  </div>

                  <p className="line-clamp-2 text-sm font-medium leading-6 text-stone-900">
                    {share.title}
                  </p>

                  <p className="mt-2 line-clamp-3 text-sm leading-7 text-stone-600">
                    {share.content}
                  </p>

                  <p className="mt-4 text-xs text-stone-500">
                    公开至：{share.expiresDate}
                  </p>
                </Link>
              ))
            )}
          </div>
        </aside>
      </div>
    </PageContainer>
  );
}
