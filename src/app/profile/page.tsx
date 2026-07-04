"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { PageContainer } from "@/components/PageContainer";
import { PageHeader } from "@/components/PageHeader";
import { MemberGate } from "@/components/MemberGate";

type MemberUser = {
    id: string;
    name: string;
    role: string;
    createdAt: string;
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

export default function ProfilePage() {
    const [user, setUser] = useState<MemberUser | null>(null);
    const [name, setName] = useState("");
    const [message, setMessage] = useState("正在读取你的主页……");
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        async function loadMember() {
            try {
                const visitorKey = getOrCreateVisitorKey();

                const response = await fetch(`/api/members?visitorKey=${visitorKey}`);
                const data = (await response.json()) as {
                    user?: MemberUser | null;
                };

                if (!data.user) {
                    setUser(null);
                    setName("");
                    setMessage("你还没有创建成员身份，请先进入成员入口。");
                    return;
                }

                setUser(data.user);
                setName(data.user.name);
                localStorage.setItem("memberUserId", data.user.id);
                localStorage.setItem("memberName", data.user.name);
                setMessage("");
            } catch {
                setMessage("读取主页失败，请稍后再试。");
            }
        }

        loadMember();
    }, []);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (isSubmitting) return;

        const trimmedName = name.trim();

        if (!trimmedName) {
            setMessage("姓名不能为空。");
            return;
        }

        setIsSubmitting(true);
        setMessage("");

        try {
            const visitorKey = getOrCreateVisitorKey();

            const response = await fetch("/api/members", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    visitorKey,
                    name: trimmedName,
                }),
            });

            const data = (await response.json()) as {
                ok?: boolean;
                user?: MemberUser;
                error?: string;
            };

            if (!response.ok || !data.user) {
                setMessage(data.error ?? "修改姓名失败，请稍后再试。");
                return;
            }

            setUser(data.user);
            setName(data.user.name);
            localStorage.setItem("memberUserId", data.user.id);
            localStorage.setItem("memberName", data.user.name);

            setMessage("姓名已更新。");
        } catch {
            setMessage("修改姓名失败，请稍后再试。");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <MemberGate returnTo="/profile">
            <PageContainer>
                <PageHeader
                    title="我的主页"
                    subtitle="这里暂时只保留一个功能：修改你的姓名。"
                    action={
                        <div className="flex flex-col gap-2 sm:flex-row">
                            <Link
                                href="/dashboard"
                                className="inline-flex w-full justify-center rounded-full border border-stone-200 bg-white px-5 py-2.5 text-sm font-medium text-stone-600 transition hover:border-stone-300 hover:text-stone-900 sm:w-auto"
                            >
                                学习中心
                            </Link>

                            <Link
                                href="/sermons"
                                className="inline-flex w-full justify-center rounded-full border border-stone-200 bg-white px-5 py-2.5 text-sm font-medium text-stone-600 transition hover:border-stone-300 hover:text-stone-900 sm:w-auto"
                            >
                                真理集录
                            </Link>
                        </div>
                    }
                />

                <section className="mx-auto max-w-xl rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-8">
                    {!user && (
                        <div className="mb-6 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm leading-7 text-amber-800">
                            {message}
                            <div className="mt-3">
                                <Link
                                    href="/member"
                                    className="font-medium text-stone-900 underline"
                                >
                                    去成员入口
                                </Link>
                            </div>
                        </div>
                    )}

                    {user && (
                        <>
                            <div className="mb-6 rounded-2xl border border-stone-100 bg-stone-50 p-4 text-sm leading-7 text-stone-600">
                                当前姓名：
                                <span className="font-medium text-stone-900">{user.name}</span>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-stone-700">
                                        修改姓名
                                    </label>

                                    <input
                                        suppressHydrationWarning
                                        type="text"
                                        value={name}
                                        onChange={(event) => {
                                            setName(event.target.value);
                                            setMessage("");
                                        }}
                                        placeholder="请输入新的姓名"
                                        className="w-full rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none transition focus:border-stone-600"
                                    />
                                </div>

                                {message && (
                                    <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
                                        {message}
                                    </p>
                                )}

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full rounded-full bg-stone-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:bg-stone-400"
                                >
                                    {isSubmitting ? "正在保存..." : "保存姓名"}
                                </button>
                            </form>
                        </>
                    )}
                </section>
            </PageContainer>
        </MemberGate>
    );
}