"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageContainer } from "@/components/PageContainer";
import { PageHeader } from "@/components/PageHeader";

type MemberUser = {
    id: string;
    name: string;
    role: string;
    createdAt: string;
    lastSeenAt: string;
};

const MAX_NAME_LENGTH = 9;

function getCharacterCount(value: string) {
    return Array.from(value).length;
}

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

export default function MemberLoginPage() {
    const router = useRouter();

    const [returnTo, setReturnTo] = useState("/dashboard");

    const [name, setName] = useState("");
    const [accessCode, setAccessCode] = useState("");
    const [currentUser, setCurrentUser] = useState<MemberUser | null>(null);
    const [message, setMessage] = useState("正在检查当前成员身份……");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const nameLength = getCharacterCount(name);
    const isNameTooLong = nameLength > MAX_NAME_LENGTH;

    useEffect(() => {
        const target = new URLSearchParams(window.location.search).get("returnTo");

        if (target && target.startsWith("/") && !target.startsWith("//")) {
            setReturnTo(target);
        }

        async function loadMember() {
            try {
                const visitorKey = getOrCreateVisitorKey();

                const response = await fetch(`/api/members?visitorKey=${visitorKey}`);
                const data = (await response.json()) as {
                    user?: MemberUser | null;
                    error?: string;
                };

                if (data.user) {
                    setCurrentUser(data.user);
                    setName(data.user.name);
                    localStorage.setItem("memberUserId", data.user.id);
                    localStorage.setItem("memberName", data.user.name);
                    setMessage("你已经登录，可以直接进入学习平台。");
                } else {
                    setMessage("请输入你的姓名进入学习平台。");
                }
            } catch {
                setMessage("读取成员身份失败，请稍后再试。");
            }
        }

        loadMember();
    }, []);

    function handleLogoutMember() {
        localStorage.removeItem("memberUserId");
        localStorage.removeItem("memberName");
        localStorage.removeItem("readVisitorKey");

        setCurrentUser(null);
        setName("");
        setAccessCode("");
        setMessage("你已退出当前成员身份，请重新输入姓名和进入密码。");
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (isSubmitting) return;

        const trimmedName = name.trim();

        if (!trimmedName) {
            setMessage("请填写姓名。");
            return;
        }

        if (!currentUser && !accessCode.trim()) {
            setMessage("请填写进入密码。");
            return;
        }

        if (getCharacterCount(trimmedName) > MAX_NAME_LENGTH) {
            setMessage("姓名必须小于 10 个字符。");
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
                    accessCode: accessCode.trim(),
                }),
            });

            const data = (await response.json()) as {
                ok?: boolean;
                user?: MemberUser;
                error?: string;
            };

            if (!response.ok || !data.user) {
                setMessage(data.error ?? "进入失败，请稍后再试。");
                return;
            }

            localStorage.setItem("memberUserId", data.user.id);
            localStorage.setItem("memberName", data.user.name);

            router.push(returnTo);
            router.refresh();
        } catch {
            setMessage("进入失败，请稍后再试。");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <PageContainer>
            <PageHeader
                title="成员入口"
                subtitle="普通成员不需要密码，只需要输入一个不重复的姓名。系统会把你的成员身份保存到数据库。"
                action={
                    <Link
                        href="/"
                        className="inline-flex w-full justify-center rounded-full border border-stone-200 bg-white px-5 py-2.5 text-sm font-medium text-stone-600 transition hover:border-stone-300 hover:text-stone-900 sm:w-auto"
                    >
                        返回首页
                    </Link>
                }
            />

            <section className="mx-auto max-w-xl rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-8">
                {currentUser && (
                    <div className="mb-6 rounded-2xl border border-green-100 bg-green-50 p-4 text-sm leading-7 text-green-800">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <span>当前成员：{currentUser.name}</span>

                            <button
                                type="button"
                                onClick={handleLogoutMember}
                                className="rounded-full border border-green-200 bg-white px-4 py-2 text-xs font-medium text-green-800 transition hover:border-green-300 hover:bg-green-100"
                            >
                                退出当前成员
                            </button>
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <div className="mb-2 flex items-center justify-between gap-4">
                            <label className="block text-sm font-medium text-stone-700">
                                你的姓名
                            </label>

                            <span
                                className={`text-xs ${isNameTooLong ? "text-red-600" : "text-stone-400"
                                    }`}
                            >
                                {nameLength}/{MAX_NAME_LENGTH}
                            </span>
                        </div>

                        <input
                            suppressHydrationWarning
                            type="text"
                            value={name}
                            onChange={(event) => {
                                setName(event.target.value);
                                setMessage("");
                            }}
                            placeholder="请输入姓名"
                            className={`w-full rounded-2xl border px-4 py-3 text-sm outline-none transition focus:border-stone-600 ${isNameTooLong ? "border-red-300" : "border-stone-300"
                                }`}
                        />

                        <p className="mt-2 text-xs leading-6 text-stone-400">
                            姓名不能重复，且必须小于 10 个字符。
                        </p>
                        <div className="mt-5">
                            <label className="mb-2 block text-sm font-medium text-stone-700">
                                进入密码
                            </label>

                            <input
                                suppressHydrationWarning
                                type="password"
                                value={accessCode}
                                onChange={(event) => {
                                    setAccessCode(event.target.value);
                                    setMessage("");
                                }}
                                placeholder="请输入进入密码"
                                className="w-full rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none transition focus:border-stone-600"
                            />

                            <p className="mt-2 text-xs leading-6 text-stone-400">
                                成员进入密码由管理员统一提供。
                            </p>
                        </div>
                    </div>

                    {message && (
                        <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
                            {message}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={isSubmitting || isNameTooLong}
                        className="w-full rounded-full bg-stone-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:bg-stone-400"
                    >
                        {isSubmitting ? "正在进入..." : "进入学习中心"}
                    </button>
                </form>

                <div className="mt-6 border-t border-stone-100 pt-5 text-sm leading-7 text-stone-500">
                    已经进入过的成员可以去{" "}
                    <Link href="/profile" className="font-medium text-stone-900 underline">
                        我的主页
                    </Link>{" "}
                    修改姓名。
                </div>
            </section>
        </PageContainer>
    );
}