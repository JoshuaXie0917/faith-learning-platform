"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { PageContainer } from "@/components/PageContainer";
import { MemberGate } from "@/components/MemberGate";

const MAX_SHARE_LENGTH = 800;

function countTextWithoutPunctuation(text: string) {
    return Array.from(text).filter((char) => /[\p{L}\p{N}]/u.test(char)).length;
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

export default function SharePage() {
    const router = useRouter();

    const [name, setName] = useState("");
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [message, setMessage] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const contentCount = countTextWithoutPunctuation(content);
    const isOverLimit = contentCount > MAX_SHARE_LENGTH;

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (isSubmitting) return;

        const trimmedName = name.trim();
        const trimmedTitle = title.trim();
        const trimmedContent = content.trim();

        if (!trimmedName) {
            setMessage("请填写姓名。");
            return;
        }

        if (!trimmedTitle) {
            setMessage("请填写分享主题。");
            return;
        }

        if (!trimmedContent) {
            setMessage("请填写分享内容。");
            return;
        }

        if (isOverLimit) {
            setMessage("分享内容最多 800 字，不包括标点符号和空格。");
            return;
        }

        setIsSubmitting(true);
        setMessage("");

        try {
            const visitorKey = getOrCreateVisitorKey();

            const response = await fetch("/api/shares", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    visitorKey,
                    name: trimmedName,
                    title: trimmedTitle,
                    content: trimmedContent,
                }),
            });

            const data = (await response.json()) as {
                ok?: boolean;
                shareId?: string;
                error?: string;
            };

            if (!response.ok) {
                setMessage(data.error ?? "发布分享失败，请稍后再试。");
                return;
            }

            router.push("/sermons");
            router.refresh();
        } catch {
            setMessage("发布分享失败，请稍后再试。");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <MemberGate returnTo="/sermons/share">
            <PageContainer>
                <PageHeader
                    title="发布分享"
                    subtitle="写下你的学习心得、提醒、问题或感动。分享会保存 7 天；你自己写的分享过期后仍然可以看到。"
                    action={
                        <Link
                            href="/sermons"
                            className="inline-flex w-full justify-center rounded-full border border-stone-200 bg-white px-5 py-2.5 text-sm font-medium text-stone-600 transition hover:border-stone-300 hover:text-stone-900 sm:w-auto"
                        >
                            返回真理集录
                        </Link>
                    }
                />

                <form
                    onSubmit={handleSubmit}
                    className="mx-auto max-w-3xl space-y-6 rounded-3xl border border-stone-200 bg-white p-4 shadow-sm sm:p-6"
                >
                    <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm leading-7 text-amber-800">
                        分享会写入数据库，不再只是保存在本地浏览器。普通公开展示 7 天；自己写的分享会继续对自己可见。
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-medium text-stone-700">
                            姓名 <span className="text-red-500">*</span>
                        </label>

                        <input
                            suppressHydrationWarning
                            type="text"
                            value={name}
                            onChange={(event) => {
                                setName(event.target.value);
                                setMessage("");
                            }}
                            placeholder="请输入姓名"
                            className="w-full rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none transition focus:border-stone-600"
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-medium text-stone-700">
                            分享主题 <span className="text-red-500">*</span>
                        </label>

                        <input
                            suppressHydrationWarning
                            type="text"
                            value={title}
                            onChange={(event) => {
                                setTitle(event.target.value);
                                setMessage("");
                            }}
                            placeholder="例如：关于等候的一点提醒"
                            className="w-full rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none transition focus:border-stone-600"
                        />
                    </div>

                    <div>
                        <div className="mb-2 flex items-center justify-between gap-4">
                            <label className="block text-sm font-medium text-stone-700">
                                分享内容 <span className="text-red-500">*</span>
                            </label>

                            <span
                                className={`text-xs ${isOverLimit ? "text-red-600" : "text-stone-400"
                                    }`}
                            >
                                {contentCount}/{MAX_SHARE_LENGTH}
                            </span>
                        </div>

                        <textarea
                            suppressHydrationWarning
                            rows={8}
                            value={content}
                            onChange={(event) => {
                                setContent(event.target.value);
                                setMessage("");
                            }}
                            placeholder="写下你的学习心得、提醒、问题或感动……"
                            className={`w-full resize-none rounded-2xl border px-4 py-3 text-sm outline-none transition focus:border-stone-600 ${isOverLimit ? "border-red-300" : "border-stone-300"
                                }`}
                        />

                        <p className="mt-2 text-xs leading-6 text-stone-400">
                            最多 800 字，不包括标点符号和空格。
                        </p>
                    </div>

                    {message && (
                        <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
                            {message}
                        </p>
                    )}

                    <div className="flex flex-col gap-4 border-t border-stone-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm leading-6 text-stone-400">
                            发布后会出现在真理集录的最近分享区域。
                        </p>

                        <button
                            type="submit"
                            disabled={isOverLimit || isSubmitting}
                            className="w-full rounded-full bg-stone-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:bg-stone-400 sm:w-auto"
                        >
                            {isSubmitting ? "正在发布..." : "发布分享"}
                        </button>
                    </div>
                </form>
            </PageContainer>
        </MemberGate>
    );
}