"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useTransition } from "react";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
  // Next.js 16.2+: re-fetches and re-renders the failed segment.
  unstable_retry?: () => void;
};

// Shown when a page cannot be loaded (for example a database or network failure),
// instead of the framework's generic English error screen.
export default function ErrorPage({ error, reset, unstable_retry }: ErrorPageProps) {
  const router = useRouter();
  const [isRetrying, startTransition] = useTransition();

  useEffect(() => {
    // The digest identifies the failure in the server log without exposing details.
    console.error("页面加载失败", error.digest ?? "");
  }, [error]);

  function retry() {
    startTransition(() => {
      if (unstable_retry) {
        unstable_retry();
        return;
      }
      router.refresh();
      reset();
    });
  }

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 py-16 text-center">
      <h1 className="font-serif text-2xl tracking-tight text-stone-900 sm:text-3xl">页面暂时无法打开</h1>
      <p role="alert" className="mt-4 text-sm leading-7 text-stone-600 sm:text-base">
        读取内容时出现问题，可能是网络或服务暂时不可用。请稍后重试。
      </p>
      <div className="mt-8 grid w-full gap-3 sm:flex sm:w-auto sm:justify-center">
        <button
          type="button"
          onClick={retry}
          disabled={isRetrying}
          className="inline-flex min-h-11 items-center justify-center rounded-full bg-stone-900 px-5 text-sm font-medium text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:bg-stone-500"
        >
          {isRetrying ? "正在重试…" : "重试"}
        </button>
        <Link
          href="/"
          className="inline-flex min-h-11 items-center justify-center rounded-full border border-stone-300 bg-white px-5 text-sm font-medium text-stone-700 transition hover:border-stone-500 hover:text-stone-900"
        >
          返回首页
        </Link>
      </div>
    </main>
  );
}
