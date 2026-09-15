"use client";

import type { ChangeEvent } from "react";
import { useRef, useState } from "react";

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
]);

type SeriesImageUploadFieldProps = {
    initialImageUrl?: string;
};

type SeriesImagePresignResponse = {
    presignedUrl?: string;
    blobUrl?: string;
    error?: string;
};

function formatSize(size: number) {
    return `${(size / 1024 / 1024).toFixed(1)}MB`;
}

function DefaultSeriesCover() {
    return (
        <div className="flex h-full w-full items-center justify-center bg-stone-100">
            <div className="w-2/3 space-y-3 rounded-xl border border-stone-200 bg-white/80 p-5 shadow-sm">
                <div className="h-3 w-2/3 rounded-full bg-stone-300" />

                {[0, 1, 2].map((item) => (
                    <div key={item} className="flex items-center gap-3">
                        <span className="h-2.5 w-2.5 rounded-full bg-amber-200" />
                        <span className="h-2 flex-1 rounded-full bg-stone-200" />
                    </div>
                ))}

                <div className="flex items-center gap-3">
                    <span className="h-2.5 w-2.5 rounded-full bg-stone-300" />
                    <span className="h-2 w-3/4 rounded-full bg-stone-200" />
                </div>
            </div>
        </div>
    );
}

export function SeriesImageUploadField({
    initialImageUrl = "",
}: SeriesImageUploadFieldProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [imageUrl, setImageUrl] = useState(initialImageUrl);
    const [isUploading, setIsUploading] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    function openFilePicker() {
        if (!isUploading) {
            fileInputRef.current?.click();
        }
    }

    async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];

        setMessage("");
        setError("");

        if (!file) {
            return;
        }

        if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
            setError("只支持 JPG、PNG 或 WebP 图片。");
            event.target.value = "";
            return;
        }

        if (file.size > MAX_IMAGE_SIZE) {
            setError(
                `图片不能超过 10MB。当前图片大小是 ${formatSize(file.size)}。`
            );
            event.target.value = "";
            return;
        }

        setIsUploading(true);

        try {
            const presignResponse = await fetch("/api/blob/series-image-presign", {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify({
                    contentType: file.type,
                    size: file.size,
                }),
            });

            const presignData = (await presignResponse.json()) as SeriesImagePresignResponse;

            if (!presignResponse.ok || !presignData.presignedUrl || !presignData.blobUrl) {
                throw new Error(presignData.error || "图片上传授权失败，请稍后再试。");
            }

            const uploadResponse = await fetch(presignData.presignedUrl, {
                method: "PUT",
                headers: {
                    "content-type": file.type,
                    "x-content-type": file.type,
                    "x-vercel-blob-access": "public",
                },
                body: file,
            });

            if (!uploadResponse.ok) {
                throw new Error("图片上传失败，请稍后再试。");
            }

            setImageUrl(presignData.blobUrl);
            setMessage("封面已上传，保存系列后生效。");
        } catch (uploadError) {
            console.error("Series image upload failed:", uploadError);

            setError(
                uploadError instanceof Error
                    ? uploadError.message
                    : "图片上传失败，请稍后再试。"
            );
        } finally {
            setIsUploading(false);
            event.target.value = "";
        }
    }

    return (
        <div className="space-y-2">
            <input type="hidden" name="imageUrl" value={imageUrl} />

            <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-stone-200 bg-stone-100">
                {imageUrl ? (
                    <img
                        src={imageUrl}
                        alt="系列封面"
                        className="h-full w-full object-cover"
                    />
                ) : (
                    <DefaultSeriesCover />
                )}

                <button
                    type="button"
                    onClick={openFilePicker}
                    disabled={isUploading}
                    aria-label={imageUrl ? "更换系列封面" : "上传系列封面"}
                    title={imageUrl ? "更换系列封面" : "上传系列封面"}
                    className="absolute bottom-2.5 right-2.5 flex h-8 w-8 items-center justify-center rounded-full border border-white/80 bg-white text-lg font-semibold leading-none text-stone-800 shadow-sm transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {isUploading ? (
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-stone-300 border-t-stone-900" />
                    ) : (
                        "+"
                    )}
                </button>
            </div>

            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="sr-only"
                aria-label="选择系列封面图片"
            />

            {message && (
                <p className="text-sm text-green-700">
                    {message}
                </p>
            )}

            {error && (
                <p className="text-sm text-red-700">
                    {error}
                </p>
            )}
        </div>
    );
}
