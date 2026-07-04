"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  const [isAdmin, setIsAdmin] = useState(false);
  const [adminName, setAdminName] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const adminSession = localStorage.getItem("adminSession");
    const savedAdminName = localStorage.getItem("adminName");

    setIsAdmin(adminSession === "true");
    setAdminName(savedAdminName ?? "");
    setIsMenuOpen(false);
  }, [pathname]);

  function isActive(href: string) {
    if (href === "/") {
      return pathname === "/";
    }

    return pathname.startsWith(href);
  }

  function handleLogout() {
    localStorage.removeItem("adminSession");
    localStorage.removeItem("adminName");

    setIsAdmin(false);
    setAdminName("");
    setIsMenuOpen(false);

    router.push("/dashboard");
  }

  const mainLinks = [
    { href: "/dashboard", label: "学习中心" },
    { href: "/sermons", label: "真理集录" },
  ];

  const adminLinks = [
    { href: "/admin", label: "管理后台" },
    { href: "/admin/sermons", label: "内容管理" },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-stone-200 bg-[#faf7f2]/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link
          href="/"
          onClick={() => setIsMenuOpen(false)}
          className="flex items-center gap-2 font-semibold text-stone-900"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-200 text-sm font-bold text-stone-900">
            花
          </span>
          <span className="text-lg">四月花</span>
        </Link>

        <nav className="hidden items-center gap-2 md:flex">
          {mainLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-full px-4 py-2 text-sm transition ${
                isActive(link.href)
                  ? "bg-stone-900 text-white"
                  : "text-stone-600 hover:bg-white hover:text-stone-900"
              }`}
            >
              {link.label}
            </Link>
          ))}

          {isAdmin &&
            adminLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-4 py-2 text-sm transition ${
                  isActive(link.href)
                    ? "bg-amber-700 text-white"
                    : "text-stone-600 hover:bg-white hover:text-stone-900"
                }`}
              >
                {link.label}
              </Link>
            ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {isAdmin ? (
            <>
              <span className="max-w-[180px] truncate rounded-full bg-amber-50 px-4 py-2 text-sm text-amber-800">
                管理员：{adminName || "管理员"}
              </span>

              <button
                type="button"
                onClick={handleLogout}
                className="rounded-full border border-stone-200 bg-white px-4 py-2 text-sm text-stone-600 transition hover:border-stone-300 hover:text-stone-900"
              >
                退出管理
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-full border border-stone-200 bg-white px-4 py-2 text-sm text-stone-600 transition hover:border-stone-300 hover:text-stone-900"
            >
              管理员登录
            </Link>
          )}
        </div>

        <button
          type="button"
          onClick={() => setIsMenuOpen((value) => !value)}
          className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-700 shadow-sm md:hidden"
          aria-label={isMenuOpen ? "关闭导航菜单" : "打开导航菜单"}
          aria-expanded={isMenuOpen}
        >
          <span className="flex flex-col gap-1.5">
            <span
              className={`block h-0.5 w-5 rounded-full bg-stone-700 transition ${
                isMenuOpen ? "translate-y-2 rotate-45" : ""
              }`}
            />
            <span
              className={`block h-0.5 w-5 rounded-full bg-stone-700 transition ${
                isMenuOpen ? "opacity-0" : ""
              }`}
            />
            <span
              className={`block h-0.5 w-5 rounded-full bg-stone-700 transition ${
                isMenuOpen ? "-translate-y-2 -rotate-45" : ""
              }`}
            />
          </span>
        </button>
      </div>

      {isMenuOpen && (
        <div className="border-t border-stone-200 bg-[#faf7f2] px-4 py-4 shadow-sm md:hidden">
          <div className="mx-auto max-w-6xl space-y-3">
            {mainLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMenuOpen(false)}
                className={`block rounded-2xl px-4 py-3 text-base transition ${
                  isActive(link.href)
                    ? "bg-stone-900 text-white"
                    : "bg-white text-stone-700"
                }`}
              >
                {link.label}
              </Link>
            ))}

            {isAdmin ? (
              <div className="space-y-3 border-t border-stone-200 pt-3">
                <p className="px-1 text-sm text-amber-700">
                  管理员模式：{adminName || "管理员"}
                </p>

                {adminLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsMenuOpen(false)}
                    className={`block rounded-2xl px-4 py-3 text-base transition ${
                      isActive(link.href)
                        ? "bg-amber-700 text-white"
                        : "bg-white text-stone-700"
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}

                <button
                  type="button"
                  onClick={handleLogout}
                  className="block w-full rounded-2xl bg-white px-4 py-3 text-left text-base text-stone-700"
                >
                  退出管理
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                onClick={() => setIsMenuOpen(false)}
                className="block rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base text-stone-700"
              >
                管理员登录
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}