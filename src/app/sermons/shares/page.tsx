"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PageContainer } from "@/components/PageContainer";
import { PageHeader } from "@/components/PageHeader";
import {
  loadAndMigrateContentFavorites,
  readLegacyContentFavoriteIds,
} from "@/lib/contentFavoritesClient";
import { visitorKeyHeaders } from "@/lib/visitorKeyHeader";

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
};

const MAX_TOTAL_FAVORITES = 30;

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

export default function SharesPage() {
  const [shares, setShares] = useState<DisplayShare[]>([]);
  const [favoriteSermonCount, setFavoriteSermonCount] = useState(0);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [sharesAttempt, setSharesAttempt] = useState(0);
  const [updatingShareId, setUpdatingShareId] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;
    const visitorKey = getOrCreateVisitorKey();

    setFavoriteSermonCount(readLegacyContentFavoriteIds().length);

    async function loadFavoriteContents() {
      try {
        const result = await loadAndMigrateContentFavorites(visitorKey);

        if (!isCancelled) {
          setFavoriteSermonCount(result.favoriteContentIds.length);

          if (result.limitReached) {
            setMessage("收藏数量已达到 30 个上限，未同步的本地收藏已保留。");
          }
        }
      } catch {
        // Keep the browser favorite count until migration can be retried.
      }
    }

    loadFavoriteContents();

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    let isCancelled = false;
    const visitorKey = getOrCreateVisitorKey();

    async function loadShares() {
      setIsLoading(true);
      setLoadError("");

      try {
        const response = await fetch("/api/shares", { headers: visitorKeyHeaders(visitorKey), cache: "no-store" });
        const data = (await response.json().catch(() => null)) as {
          shares?: DisplayShare[];
          error?: string;
        } | null;

        if (!response.ok || !data || !Array.isArray(data.shares)) {
          if (!isCancelled) setLoadError(data?.error ?? "读取分享失败，请稍后再试。");
          return;
        }

        if (!isCancelled) setShares(data.shares);
      } catch {
        if (!isCancelled) setLoadError("读取分享失败，请检查网络后重新加载。");
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    }

    loadShares();

    return () => {
      isCancelled = true;
    };
  }, [sharesAttempt]);

  const orderedShares = useMemo(
    () =>
      [...shares].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [shares]
  );

  const favoriteShareCount = shares.filter(
    (share) => share.isFavorite
  ).length;
  const totalFavoriteCount = favoriteSermonCount + favoriteShareCount;

  async function toggleFavoriteShare(shareId: string) {
    const targetShare = shares.find((share) => share.id === shareId);

    if (!targetShare || updatingShareId) return;

    if (!targetShare.isFavorite && totalFavoriteCount >= MAX_TOTAL_FAVORITES) {
      setMessage("收藏数量已达到 30 个上限。");
      return;
    }

    setUpdatingShareId(shareId);
    setMessage("");

    try {
      const visitorKey = getOrCreateVisitorKey();
      const response = await fetch(`/api/shares/${shareId}/favorite`, {
        method: targetShare.isFavorite ? "DELETE" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          visitorKey,
        }),
      });
      const data = (await response.json()) as {
        error?: string;
      };

      if (!response.ok) {
        setMessage(
          data.error ??
            (targetShare.isFavorite ? "取消收藏失败。" : "收藏分享失败。")
        );
        return;
      }

      setShares((currentShares) =>
        currentShares
          .filter(
            (share) =>
              share.id !== shareId ||
              !targetShare.isFavorite ||
              new Date(share.expiresAt).getTime() > Date.now()
          )
          .map((share) =>
            share.id === shareId
              ? { ...share, isFavorite: !targetShare.isFavorite }
              : share
          )
      );
      setMessage(targetShare.isFavorite ? "已取消收藏。" : "已收藏分享。");
    } catch {
      setMessage(
        targetShare.isFavorite ? "取消收藏失败。" : "收藏分享失败。"
      );
    } finally {
      setUpdatingShareId(null);
    }
  }

  return (
    <PageContainer>
      <PageHeader
        title="弟兄姊妹的分享"
        subtitle="阅读大家的学习心得、提醒、问题与感动。未收藏的分享在 7 天后将被清理；收藏者可继续查看已收藏的分享。"
        action={
          <>
            <Link
              href="/sermons"
              className="inline-flex w-full justify-center rounded-full border border-stone-200 bg-white px-5 py-2.5 max-lg:py-3 text-sm font-medium text-stone-600 transition hover:border-stone-300 hover:text-stone-900 sm:w-auto"
            >
              返回真理集录
            </Link>
            <Link
              href="/sermons/share"
              className="inline-flex w-full justify-center rounded-full bg-stone-900 px-5 py-2.5 max-lg:py-3 text-sm font-medium text-white transition hover:bg-stone-700 sm:w-auto"
            >
              新增分享
            </Link>
          </>
        }
      />

      <section className="mx-auto max-w-4xl">
        <div className="mb-5 flex flex-col gap-3 rounded-3xl border border-stone-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <p className="text-sm leading-7 text-stone-500">
            共 {isLoading || loadError ? "—" : orderedShares.length} 条可见分享
          </p>
          <p className="text-sm text-stone-500">
            收藏总数：{totalFavoriteCount} / {MAX_TOTAL_FAVORITES}
          </p>
        </div>

        {/* Always present, so screen readers announce favorite results. */}
        <p
          role="status"
          aria-live="polite"
          className={message ? "mb-5 rounded-2xl bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800" : "sr-only"}
        >
          {message}
        </p>

        {isLoading ? (
          <div role="status" className="rounded-3xl border border-stone-200 bg-white p-6 text-sm text-stone-500 shadow-sm">
            正在加载分享……
          </div>
        ) : loadError ? (
          <div role="alert" className="rounded-3xl border border-red-200 bg-red-50 p-6 text-center shadow-sm sm:p-8">
            <p className="text-lg font-semibold text-red-800">分享暂时无法读取</p>
            <p className="mt-2 text-sm leading-7 text-red-700">{loadError}</p>
            <button
              type="button"
              onClick={() => setSharesAttempt((attempt) => attempt + 1)}
              className="mt-5 rounded-full bg-stone-900 px-5 py-2.5 max-lg:py-3 text-sm font-medium text-white transition hover:bg-stone-700"
            >
              重新加载
            </button>
          </div>
        ) : orderedShares.length === 0 ? (
          <div className="rounded-3xl border border-amber-100 bg-amber-50 p-6 text-center shadow-sm sm:p-8">
            <h2 className="text-lg font-semibold text-stone-900">
              暂无可见分享
            </h2>
            <p className="mt-2 text-sm leading-7 text-stone-600">
              欢迎使用页面上方的“新增分享”，写下你的学习心得、提醒、问题或感动。
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {orderedShares.map((share) => (
              <article
                key={share.id}
                className="min-w-0 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-7"
              >
                <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500">
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700">
                    分享
                  </span>
                  <span className="break-words">{share.name}</span>
                  <span aria-hidden="true">·</span>
                  <span>{share.createdDate}</span>
                  {share.isOwner && (
                    <span className="rounded-full bg-green-50 px-3 py-1 text-green-700">
                      我发布的
                    </span>
                  )}
                  {share.isFavorite && (
                    <span className="rounded-full bg-stone-100 px-3 py-1 text-stone-600">
                      已收藏
                    </span>
                  )}
                </div>

                <Link
                  href={`/sermons/share/${share.id}`}
                  className="mt-4 block max-lg:mt-2.5 max-lg:py-1.5"
                >
                  <h2 className="break-words text-xl font-semibold leading-8 text-stone-900 transition hover:text-amber-800 sm:text-2xl">
                    {share.title}
                  </h2>
                </Link>

                <div className="mt-4 whitespace-pre-wrap break-words text-sm leading-8 text-stone-700 sm:text-base">
                  {share.content}
                </div>

                <div className="mt-6 flex flex-col gap-4 border-t border-stone-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs leading-6 text-stone-500">
                    公开展示至：{share.expiresDate}
                  </p>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Link
                      href={`/sermons/share/${share.id}`}
                      className="inline-flex w-full items-center justify-center rounded-full border border-stone-200 bg-white px-4 py-2 text-sm text-stone-600 transition hover:border-stone-300 hover:text-stone-900 max-lg:min-h-11 sm:w-auto"
                    >
                      查看详情
                    </Link>
                    <button
                      type="button"
                      aria-pressed={share.isFavorite}
                      onClick={() => toggleFavoriteShare(share.id)}
                      disabled={updatingShareId === share.id}
                      className={`w-full rounded-full px-4 py-2 text-sm transition disabled:cursor-not-allowed disabled:opacity-60 max-lg:min-h-11 sm:w-auto ${
                        share.isFavorite
                          ? "bg-amber-100 text-amber-800"
                          : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                      }`}
                    >
                      {updatingShareId === share.id
                        ? "处理中..."
                        : share.isFavorite
                          ? "已收藏"
                          : "收藏分享"}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </PageContainer>
  );
}
