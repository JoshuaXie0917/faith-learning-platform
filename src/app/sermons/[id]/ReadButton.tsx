"use client";

import { useEffect, useState } from "react";

type ReadButtonProps = {
  contentId: string;
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

function readContentIdsFromStorage() {
  try {
    const savedValue = localStorage.getItem("readContentIds");

    if (!savedValue) return [];

    const parsedValue = JSON.parse(savedValue);

    if (!Array.isArray(parsedValue)) return [];

    return parsedValue.filter((item) => typeof item === "string");
  } catch {
    localStorage.removeItem("readContentIds");
    return [];
  }
}

export function ReadButton({ contentId }: ReadButtonProps) {
  const [isRead, setIsRead] = useState(false);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const savedReadIds = readContentIdsFromStorage();
    setIsRead(savedReadIds.includes(contentId));
  }, [contentId]);

  async function handleRead() {
    if (isSubmitting) return;

    setIsSubmitting(true);
    setMessage("");

    const visitorKey = getOrCreateVisitorKey();

    try {
      const response = await fetch(`/api/contents/${contentId}/read`, {
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
      };

      if (!response.ok) {
        setMessage(
          data.error ??
            (isRead
              ? "取消已读失败，请稍后再试。"
              : "标记已读失败，请稍后再试。")
        );
        return;
      }

      const savedReadIds = readContentIdsFromStorage();

      const nextReadIds = isRead
        ? savedReadIds.filter((id) => id !== contentId)
        : Array.from(new Set([...savedReadIds, contentId]));

      localStorage.setItem("readContentIds", JSON.stringify(nextReadIds));

      setIsRead(!isRead);
      setMessage(isRead ? "已切换为未读。" : "已标记为已读。");
    } catch {
      setMessage(
        isRead ? "取消已读失败，请稍后再试。" : "标记已读失败，请稍后再试。"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="font-medium text-stone-900">
            读完这篇内容了吗？
          </p>

          <p className="mt-1 text-sm leading-6 text-stone-500">
            点击按钮可以在已读和未读之间切换。后台只统计数量，不显示你的姓名。
          </p>
        </div>

        <button
          type="button"
          disabled={isSubmitting}
          onClick={handleRead}
          className={`inline-flex w-full justify-center rounded-full px-5 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto ${
            isRead
              ? "bg-green-100 text-green-800 hover:bg-green-200"
              : "bg-stone-900 text-white hover:bg-stone-700"
          }`}
        >
          {isSubmitting ? "处理中..." : isRead ? "已读，点击改为未读" : "标记已读"}
        </button>
      </div>

      {message && (
        <p className="mt-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
          {message}
        </p>
      )}
    </div>
  );
}