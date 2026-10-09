"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const adminNav = [
  { href: "/admin", label: "后台总览", icon: "●" },
  { href: "/admin/sermons", label: "内容管理", icon: "◎" },
  { href: "/admin/taxonomy", label: "系列管理", icon: "◇" },
];

export function AdminSidebar() {
  const pathname = usePathname();

  function isActive(href: string) {
    return href === "/admin"
      ? pathname === "/admin"
      : pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <>
      {/* Below lg the sidebar becomes a row of tabs above the page. */}
      <nav
        aria-label="管理后台"
        className="grid grid-cols-3 gap-1 rounded-2xl border border-stone-200 bg-white p-1 shadow-sm lg:hidden"
      >
        {adminNav.map((item) => {
          const active = isActive(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-11 items-center justify-center rounded-xl px-2 text-center text-sm transition ${active
                  ? "bg-amber-100 font-medium text-amber-800"
                  : "text-stone-500 hover:bg-stone-100 hover:text-stone-800"
                }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <aside className="hidden w-56 shrink-0 lg:block">
        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <p className="mb-4 text-sm font-semibold text-stone-900">管理后台</p>

          <nav aria-label="管理后台" className="space-y-1">
            {adminNav.map((item) => {
              const active = isActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition ${active
                      ? "bg-amber-100 text-amber-800"
                      : "text-stone-500 hover:bg-stone-100 hover:text-stone-800"
                    }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>
    </>
  );
}
