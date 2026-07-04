"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();

  const [adminName, setAdminName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = adminName.trim();

    if (!trimmedName) {
      setError("请输入管理员姓名。");
      return;
    }

    if (!password.trim()) {
      setError("请输入管理员密码。");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: trimmedName,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "管理员登录失败。");
        return;
      }

      if (data.user?.role !== "admin" && data.user?.role !== "editor") {
        setError("当前账号没有管理员权限。");
        return;
      }

      localStorage.removeItem("currentUser");
      localStorage.setItem("adminSession", "true");
      localStorage.setItem("adminName", data.user?.name ?? trimmedName);

      router.push("/admin");
    } catch {
      setError("登录请求失败，请稍后再试。");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#faf5ef] text-stone-800">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <Link href="/" className="text-xl font-semibold tracking-wide">
          四月花
        </Link>

        <Link
          href="/dashboard"
          className="text-sm text-stone-600 transition hover:text-stone-900"
        >
          返回学习中心
        </Link>
      </header>

      <section className="mx-auto flex max-w-md flex-col px-6 pt-16">
        <div className="rounded-3xl border border-stone-200 bg-white/85 p-8 shadow-sm">
          <p className="mb-4 text-sm text-amber-800">管理员入口</p>

          <h1 className="mb-3 text-3xl font-semibold text-stone-900">
            管理员登录
          </h1>

          <p className="mb-8 text-sm leading-7 text-stone-600">
            普通成员不需要进入后台。只有管理员需要通过密码登录管理页面。
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="adminName"
                className="mb-2 block text-sm font-medium text-stone-700"
              >
                管理员姓名
              </label>

              <input
                id="adminName"
                type="text"
                value={adminName}
                onChange={(event) => {
                  setAdminName(event.target.value);
                  setError("");
                }}
                placeholder="请输入管理员姓名"
                className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-stone-600"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-stone-700"
              >
                管理员密码
              </label>

              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setError("");
                }}
                placeholder="请输入管理员密码"
                className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-stone-600"
              />
            </div>

            {error && (
              <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-full bg-stone-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:bg-stone-400"
            >
              {isSubmitting ? "正在登录..." : "进入管理后台"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}