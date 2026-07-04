"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const adminNav = [
  { href: "/admin", label: "后台总览", icon: "●" },
  { href: "/admin/sermons", label: "内容管理", icon: "◎" },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-56 shrink-0 lg:block">
      <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
        <p className="mb-4 text-sm font-semibold text-stone-900">管理后台</p>

        <nav className="space-y-1">
          {adminNav.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition ${
                  isActive
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
  );
}