"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Contact and social details are not shown until real ones are available.
const footerLinks = [
  { href: "/dashboard", label: "学习中心" },
  { href: "/sermons", label: "真理集录" },
  { href: "/sermons/series", label: "系列" },
  { href: "/about", label: "信仰立场" },
];

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

        <nav aria-label="页脚导航" className="md:col-span-2">
          <h3 className="text-sm font-semibold tracking-wider text-white">
            浏览
          </h3>

          <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4 md:grid-cols-2 lg:grid-cols-4">
            {footerLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="inline-flex min-h-11 items-center text-stone-300 underline-offset-4 transition hover:text-white hover:underline"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="border-t border-stone-800">
        <div className="mx-auto max-w-6xl px-6 py-5 text-center text-xs text-stone-400">
          © 2026 四月花
        </div>
      </div>
    </footer>
  );
}