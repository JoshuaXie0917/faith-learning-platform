"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type MemberUser = {
  id: string;
  name: string;
  role: string;
  createdAt: string;
  lastSeenAt: string;
};

type MemberStatusBarProps = {
  returnTo: string;
};

export function MemberStatusBar({ returnTo }: MemberStatusBarProps) {
  const router = useRouter();

  const [member, setMember] = useState<MemberUser | null>(null);

  useEffect(() => {
    async function loadMember() {
      try {
        const visitorKey = localStorage.getItem("readVisitorKey");

        if (!visitorKey) {
          setMember(null);
          return;
        }

        const response = await fetch(`/api/members?visitorKey=${visitorKey}`);
        const data = (await response.json()) as {
          user?: MemberUser | null;
        };

        if (response.ok && data.user) {
          setMember(data.user);
          localStorage.setItem("memberUserId", data.user.id);
          localStorage.setItem("memberName", data.user.name);
        }
      } catch {
        setMember(null);
      }
    }

    loadMember();
  }, []);

  function handleLogout() {
    localStorage.removeItem("memberUserId");
    localStorage.removeItem("memberName");
    localStorage.removeItem("readVisitorKey");

    router.replace(`/member?returnTo=${encodeURIComponent(returnTo)}`);
  }

  if (!member) {
    return null;
  }

  return (
    <section className="mb-6 rounded-3xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs tracking-wider text-stone-400">当前成员</p>

          <p className="mt-1 truncate text-base font-semibold text-stone-900">
            {member.name}
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Link
            href="/profile"
            className="inline-flex justify-center rounded-full border border-stone-200 bg-stone-50 px-4 py-2 text-sm font-medium text-stone-700 transition hover:border-stone-300 hover:bg-white"
          >
            我的主页
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            className="rounded-full border border-red-100 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition hover:border-red-200 hover:bg-red-100"
          >
            退出
          </button>
        </div>
      </div>
    </section>
  );
}