"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PageContainer } from "@/components/PageContainer";
import { PageHeader } from "@/components/PageHeader";

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

function getFavoriteSermonCount() {
  try {
    const savedValue = localStorage.getItem("favoriteSermonIds");

    if (!savedValue) return 0;

    const parsedValue = JSON.parse(savedValue);

    return Array.isArray(parsedValue)
      ? parsedValue.filter((item) => typeof item === "string").length
      : 0;
  } catch {
    return 0;
  }
}

export default function SharesPage() {
  const [shares, setShares] = useState<DisplayShare[]>([]);
  const [favoriteSermonCount, setFavoriteSermonCount] = useState(0);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [updatingShareId, setUpdatingShareId] = useState<string | null>(null);

  useEffect(() => {
    setFavoriteSermonCount(getFavoriteSermonCount());

    async function loadShares() {
      try {
        const visitorKey = getOrCreateVisitorKey();
        const response = await fetch(`/api/shares?visitorKey=${visitorKey}`);
        const data = (await response.json()) as {
          shares?: DisplayShare[];
          error?: string;
        };

        if (!response.ok) {
          setShares([]);
          setMessage(data.error ?? "读取分享失败，请稍后再试。");
          return;
        }

        setShares(data.shares ?? []);
      } catch {
        setShares([]);
        setMessage("读取分享失败，请稍后再试。");
      } finally {
        setIsLoading(false);
      }
    }

    loadShares();
  }, []);

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
        currentShares.map((share) =>
          share.id === shareId
            ? {
                ...share,
                isFavorite: !targetShare.isFavorite,
              }
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
        title="兄弟姊妹的分享"
        subtitle="阅读大家的学习心得、提醒、问题与感动。普通分享公开展示 7 天；你发布或收藏的分享会继续对你可见。"
        action={
          <>
            <Link
              href="/sermons"
              className="inline-flex w-full justify-center rounded-full border border-stone-200 bg-white px-5 py-2.5 text-sm font-medium text-stone-600 transition hover:border-stone-300 hover:text-stone-900 sm:w-auto"
            >
              返回真理集录
            </Link>
            <Link
              href="/sermons/share"
              className="inline-flex w-full justify-center rounded-full bg-stone-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-stone-700 sm:w-auto"
            >
              新增分享
            </Link>
          </>
        }
      />

      <section className="mx-auto max-w-4xl">
        <div className="mb-5 flex flex-col gap-3 rounded-3xl border border-stone-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <p className="text-sm leading-7 text-stone-500">
            共 {orderedShares.length} 条可见分享
          </p>
          <p className="text-sm text-stone-500">
            收藏总数：{totalFavoriteCount} / {MAX_TOTAL_FAVORITES}
          </p>
        </div>

        {message && (
          <p
            role="status"
            className="mb-5 rounded-2xl bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800"
          >
            {message}
          </p>
        )}

        {isLoading ? (
          <div className="rounded-3xl border border-stone-200 bg-white p-6 text-sm text-stone-500 shadow-sm">
            正在加载分享……
          </div>
        ) : orderedShares.length === 0 ? (
          <div className="rounded-3xl border border-amber-100 bg-amber-50 p-6 text-center shadow-sm sm:p-8">
            <h2 className="text-lg font-semibold text-stone-900">
              暂无可见分享
            </h2>
            <p className="mt-2 text-sm leading-7 text-stone-600">
              欢迎写下你的学习心得、提醒、问题或感动。
            </p>
            <Link
              href="/sermons/share"
              className="mt-5 inline-flex w-full justify-center rounded-full bg-stone-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-stone-700 sm:w-auto"
            >
              新增分享
            </Link>
          </div>
        ) : (
          <div className="space-y-5">
            {orderedShares.map((share) => (
              <article
                key={share.id}
                className="min-w-0 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-7"
              >
                <div className="flex flex-wrap items-center gap-2 text-xs text-stone-400">
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
                  className="mt-4 block"
                >
                  <h2 className="break-words text-xl font-semibold leading-8 text-stone-900 transition hover:text-amber-800 sm:text-2xl">
                    {share.title}
                  </h2>
                </Link>

                <div className="mt-4 whitespace-pre-wrap break-words text-sm leading-8 text-stone-700 sm:text-base">
                  {share.content}
                </div>

                <div className="mt-6 flex flex-col gap-4 border-t border-stone-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs leading-6 text-stone-400">
                    公开展示至：{share.expiresDate}
                  </p>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Link
                      href={`/sermons/share/${share.id}`}
                      className="inline-flex w-full justify-center rounded-full border border-stone-200 bg-white px-4 py-2 text-sm text-stone-600 transition hover:border-stone-300 hover:text-stone-900 sm:w-auto"
                    >
                      查看详情
                    </Link>
                    <button
                      type="button"
                      onClick={() => toggleFavoriteShare(share.id)}
                      disabled={updatingShareId === share.id}
                      className={`w-full rounded-full px-4 py-2 text-sm transition disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto ${
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
