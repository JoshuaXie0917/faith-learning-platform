"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
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

export default function DashboardPage() {
  const [favoriteSermonIds, setFavoriteSermonIds] = useState<string[]>([]);
  const [officialContents, setOfficialContents] = useState<PublicContent[]>([]);
  const [shares, setShares] = useState<DatabaseShare[]>([]);
  const [isLoadingContents, setIsLoadingContents] = useState(true);
  const [isLoadingShares, setIsLoadingShares] = useState(true);

  useEffect(() => {
    const storedFavorites = localStorage.getItem("favoriteSermonIds");

    if (storedFavorites) {
      try {
        const parsedFavorites = JSON.parse(storedFavorites) as string[];

        if (Array.isArray(parsedFavorites)) {
          setFavoriteSermonIds(parsedFavorites);
        }
      } catch {
        localStorage.removeItem("favoriteSermonIds");
      }
    }
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
        setIsLoadingContents(false);
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
          shares?: DatabaseShare[];
        };

        setShares(data.shares ?? []);
      } catch {
        setShares([]);
      } finally {
        setIsLoadingShares(false);
      }
    }

    loadShares();
  }, []);

  const latestContents = officialContents.slice(0, 5);
  const latestShares = shares.slice(0, 5);

  return (
    <MemberGate returnTo="/dashboard">
      <PageContainer>
        <PageHeader
          title="欢迎来到学习中心"
          subtitle="这里整理最新学习内容、弟兄姊妹分享和个人收藏，帮助大家持续学习与回顾。"
        />
        <MemberStatusBar returnTo="/dashboard" />

        <section className="mb-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {[
            { label: "可学习内容", value: officialContents.length },
            { label: "公开分享", value: shares.length },
            { label: "我的收藏", value: favoriteSermonIds.length },
            { label: "平台状态", value: "开放浏览" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5"
            >
              <p className="mb-2 text-xs tracking-wider text-stone-400">
                {stat.label}
              </p>

              <div className="break-words text-lg font-semibold text-stone-900 sm:text-xl">
                {stat.value}
              </div>
            </div>
          ))}
        </section>

        <div className="grid gap-8 lg:grid-cols-3">
          <section className="lg:col-span-2">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-stone-900 sm:text-xl">
                  最新内容
                </h2>

                <p className="mt-1 text-sm leading-6 text-stone-500">
                  最近发布到平台的学习材料、讲道和整理内容。
                </p>
              </div>

              <Link
                href="/sermons"
                className="inline-flex w-full justify-center rounded-full border border-stone-200 bg-white px-4 py-2 text-sm text-stone-600 transition hover:border-stone-300 hover:text-stone-900 sm:w-auto"
              >
                查看全部
              </Link>
            </div>

            <div className="space-y-4">
              {isLoadingContents ? (
                <div className="rounded-2xl border border-stone-200 bg-white p-5 text-sm text-stone-500 shadow-sm sm:p-6">
                  正在加载最新内容……
                </div>
              ) : latestContents.length === 0 ? (
                <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5 text-sm leading-7 text-stone-600 sm:p-6">
                  目前还没有已发布内容。管理员发布内容后，会显示在这里。
                </div>
              ) : (
                latestContents.map((content) => (
                  <Link
                    key={content.id}
                    href={`/sermons/${content.id}`}
                    className="group block rounded-2xl border border-stone-200 bg-white p-4 shadow-sm transition hover:border-stone-300 hover:shadow-md sm:p-6"
                  >
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                      <span className="rounded-full bg-stone-100 px-3 py-1 text-xs text-stone-500">
                        {content.series || content.contentTypeLabel}
                      </span>

                      <span className="text-xs text-stone-400">
                        {content.contentTypeLabel}
                      </span>
                    </div>

                    <h3 className="text-lg font-semibold leading-8 text-stone-900 transition group-hover:text-amber-800 sm:text-2xl">
                      {content.title}
                    </h3>

                    <p className="mt-3 line-clamp-2 text-sm leading-7 text-stone-600">
                      {content.description}
                    </p>

                    <div className="mt-5 flex flex-col gap-2 text-sm text-stone-400 sm:flex-row sm:items-center sm:justify-between">
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
                这里只展示数据库中真实发布的分享。
              </p>
            </div>

            <div className="space-y-4">
              {isLoadingShares ? (
                <div className="rounded-2xl border border-stone-200 bg-white p-5 text-sm text-stone-500 shadow-sm">
                  正在加载分享……
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

                        <p className="mt-1 text-xs text-stone-400">
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

                    <p className="mt-4 text-xs text-stone-400">
                      公开至：{share.expiresDate}
                    </p>
                  </Link>
                ))
              )}
            </div>
          </aside>
        </div>
      </PageContainer>
    </MemberGate>
  );
}