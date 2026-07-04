"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { PageContainer } from "@/components/PageContainer";
import { MemberGate } from "@/components/MemberGate";

type ShareDetail = {
    id: string;
    name: string;
    title: string;
    content: string;
    createdDate: string;
    expiresDate: string;
    isOwner: boolean;
    isFavorite: boolean;
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

export default function ShareDetailPage() {
    const params = useParams();
    const router = useRouter();

    const shareId =
        typeof params.id === "string"
            ? params.id
            : Array.isArray(params.id)
                ? params.id[0]
                : "";

    const [share, setShare] = useState<ShareDetail | null>(null);
    const [message, setMessage] = useState("正在加载分享……");
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        async function loadShare() {
            if (!shareId) {
                setMessage("分享地址不正确。");
                return;
            }

            try {
                const visitorKey = getOrCreateVisitorKey();

                const response = await fetch(
                    `/api/shares/${shareId}?visitorKey=${visitorKey}`
                );

                const data = (await response.json()) as {
                    share?: ShareDetail;
                    error?: string;
                };

                if (!response.ok || !data.share) {
                    setShare(null);
                    setMessage(data.error ?? "分享不存在或已经不可见。");
                    return;
                }

                setShare(data.share);
                setMessage("");
            } catch {
                setShare(null);
                setMessage("读取分享失败，请稍后再试。");
            }
        }

        loadShare();
    }, [shareId]);

    async function handleDeleteShare() {
        if (!share || isDeleting) return;

        const confirmed = window.confirm(
            "确定要删除这条分享吗？删除后其他人将看不到。"
        );

        if (!confirmed) return;

        setIsDeleting(true);
        setMessage("");

        try {
            const visitorKey = getOrCreateVisitorKey();

            const response = await fetch(`/api/shares/${share.id}`, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    visitorKey,
                }),
            });

            const data = (await response.json()) as {
                ok?: boolean;
                error?: string;
            };

            if (!response.ok) {
                setMessage(data.error ?? "删除分享失败。");
                return;
            }

            router.push("/sermons");
            router.refresh();
        } catch {
            setMessage("删除分享失败，请稍后再试。");
        } finally {
            setIsDeleting(false);
        }
    }

    return (
        <MemberGate returnTo={shareId ? `/sermons/share/${shareId}` : "/sermons"}>
            <PageContainer>
                <PageHeader
                    title="学习分享"
                    subtitle="弟兄姊妹发布的学习心得、提醒、问题或感动。"
                    action={
                        <Link
                            href="/sermons"
                            className="inline-flex w-full justify-center rounded-full border border-stone-200 bg-white px-5 py-2.5 text-sm font-medium text-stone-600 transition hover:border-stone-300 hover:text-stone-900 sm:w-auto"
                        >
                            返回真理集录
                        </Link>
                    }
                />

                {message && (
                    <div className="mx-auto max-w-3xl rounded-3xl border border-amber-100 bg-amber-50 p-6 text-sm leading-7 text-stone-600">
                        {message}
                    </div>
                )}

                {share && (
                    <article className="mx-auto max-w-3xl rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-8">
                        <div className="mb-5 flex flex-wrap items-center gap-2 text-xs text-stone-400">
                            <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700">
                                分享
                            </span>

                            <span>{share.name}</span>
                            <span>·</span>
                            <span>{share.createdDate}</span>

                            {share.isOwner && (
                                <span className="rounded-full bg-green-50 px-3 py-1 text-green-700">
                                    我发布的
                                </span>
                            )}

                            {share.isFavorite && (
                                <span className="rounded-full bg-stone-100 px-3 py-1 text-stone-600">
                                    已收藏
                                </span>
                            )}
                        </div>

                        <h1 className="break-words text-2xl font-semibold leading-9 text-stone-900 sm:text-3xl">
                            {share.title}
                        </h1>

                        <div className="mt-6 whitespace-pre-wrap break-words text-sm leading-8 text-stone-700 sm:text-base">
                            {share.content}
                        </div>

                        <div className="mt-8 rounded-2xl bg-stone-50 p-4 text-sm leading-7 text-stone-500">
                            公开展示至：{share.expiresDate}。如果这是你自己写的分享，过期后你仍然可以看到。
                        </div>

                        {share.isOwner && (
                            <div className="mt-6 border-t border-stone-100 pt-6">
                                <button
                                    type="button"
                                    onClick={handleDeleteShare}
                                    disabled={isDeleting}
                                    className="w-full rounded-full border border-red-200 bg-red-50 px-5 py-3 text-sm font-medium text-red-700 transition hover:border-red-300 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                                >
                                    {isDeleting ? "正在删除..." : "删除我的分享"}
                                </button>

                                <p className="mt-3 text-xs leading-6 text-stone-400">
                                    只有发布这条分享的同一个浏览器身份可以删除它。
                                </p>
                            </div>
                        )}
                    </article>
                )}
            </PageContainer>
        </MemberGate>
    );
}