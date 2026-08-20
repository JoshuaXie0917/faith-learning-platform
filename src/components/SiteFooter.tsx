"use client";

import { usePathname } from "next/navigation";

export function SiteFooter() {
  const pathname = usePathname();

  const hiddenPaths = [
    "/admin",
    "/login",
  ];

  const shouldHide = hiddenPaths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );

  if (shouldHide) {
    return null;
  }

  return (
    <footer className="mt-16 bg-stone-950 text-stone-300">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-12 md:grid-cols-3">
        <div>
          <h2 className="text-xl font-bold text-white">
            四月花
          </h2>

          <p className="mt-4 max-w-sm text-sm leading-7 text-stone-400">
            一个用于信仰学习、资料整理与彼此分享的学习平台。
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-white">
            Contact
          </h3>

          <div className="mt-4 space-y-2 text-sm text-stone-400">
            <p>邮箱：待补充</p>
            <p>联系方式：待补充</p>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-white">
            Social
          </h3>

          <div className="mt-4 space-y-2 text-sm text-stone-400">
            <p>微信：待补充</p>
            <p>公众号：待补充</p>
            <p>YouTube：待补充</p>
          </div>
        </div>
      </div>

      <div className="border-t border-stone-800">
        <div className="mx-auto max-w-6xl px-6 py-5 text-center text-xs text-stone-500">
          © 2026 四月花
        </div>
      </div>
    </footer>
  );
}