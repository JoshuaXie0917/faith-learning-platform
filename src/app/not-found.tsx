import Link from "next/link";

// Shown for unknown addresses and for content, Series or Shares that no longer exist.
export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 py-16 text-center">
      <p className="text-sm font-medium tracking-wider text-amber-700">404</p>
      <h1 className="mt-3 font-serif text-2xl tracking-tight text-stone-900 sm:text-3xl">找不到这个页面</h1>
      <p className="mt-4 text-sm leading-7 text-stone-600 sm:text-base">
        这个地址可能有误，或者内容已经被删除、不再公开。
      </p>
      <div className="mt-8 grid w-full gap-3 sm:flex sm:w-auto sm:justify-center">
        <Link
          href="/sermons"
          className="inline-flex min-h-11 items-center justify-center rounded-full bg-stone-900 px-5 text-sm font-medium text-white transition hover:bg-stone-700"
        >
          前往真理集录
        </Link>
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
