"use client";

import { upload } from "@vercel/blob/client";
import type { PutBlobResult } from "@vercel/blob";
import { useEffect, useRef, useState } from "react";
import {
    isAllowedUploadType,
    MAX_UPLOAD_BYTES,
    UPLOAD_ACCEPT,
    UPLOAD_TYPES_LABEL,
} from "@/lib/uploadPolicy";
import { userFacingMessage } from "@/lib/userMessage";

type AudioBlobUploadFieldProps = {
    // Kept for callers; the file control is now a button, so the field style is not used.
    inputClass?: string;
    initialResourceUrl?: string;
    // Lets the surrounding form disable saving while a file is still uploading.
    onUploadingChange?: (isUploading: boolean) => void;
};

function formatSize(size: number) {
    return `${(size / 1024 / 1024).toFixed(1)}MB`;
}

function getSafeExtension(fileName: string) {
    const extension = fileName.includes(".")
        ? fileName.slice(fileName.lastIndexOf(".")).toLowerCase()
        : "";

    return /^[.][a-zA-Z0-9]+$/.test(extension) ? extension : "";
}

export function AudioBlobUploadField({
    initialResourceUrl = "",
    onUploadingChange,
}: AudioBlobUploadFieldProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [resourceUrl, setResourceUrl] = useState(initialResourceUrl);
    const [uploadedFileName, setUploadedFileName] = useState("");
    const [selectedFileName, setSelectedFileName] = useState("");
    const [isUploading, setIsUploading] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        onUploadingChange?.(isUploading);
    }, [isUploading, onUploadingChange]);

    async function handleUploadFile() {
        const file = fileInputRef.current?.files?.[0];

        setMessage("");
        setError("");

        if (!file) {
            setError("请先选择一个文件。");
            return;
        }

        if (!isAllowedUploadType(file.type)) {
            setError(`只支持上传${UPLOAD_TYPES_LABEL}。`);
            return;
        }

        if (file.size > MAX_UPLOAD_BYTES) {
            setError(
                `文件不能超过 100MB。当前文件大小是 ${formatSize(file.size)}。请压缩或拆分后再上传。`
            );
            return;
        }

        setIsUploading(true);

        try {
            const safeExtension = getSafeExtension(file.name);
            const pathname = `resources/${crypto.randomUUID()}${safeExtension}`;

            const uploadBody = file.slice(0, file.size);

            const blob: PutBlobResult = await upload(pathname, uploadBody, {
                access: "public",
                handleUploadUrl: "/api/blob/upload",
                contentType: file.type,
            });

            setResourceUrl(blob.url);
            setUploadedFileName(file.name);
            setMessage("文件已上传成功，保存表单后会关联到当前内容。");
        } catch (uploadError) {
            console.error("Blob upload failed:", uploadError);

            // Library and network errors are in English; show the fixed Chinese message instead.
            setError(userFacingMessage(uploadError, "文件上传失败，请稍后再试。"));
        } finally {
            setIsUploading(false);
        }
    }

    return (
        <div className="space-y-4 rounded-3xl border border-stone-200 bg-stone-50 p-4 sm:p-5">
            <input type="hidden" name="resourceUrl" value={resourceUrl} />

            <div>
                <p id="content-file-label" className="mb-2 block text-sm font-medium text-stone-700">
                    上传文件
                </p>

                {/* The browser's own file control shows "Choose File" in the browser's language, so it is
                    hidden and opened from a Chinese button instead. */}
                <input
                    id="content-file"
                    ref={fileInputRef}
                    type="file"
                    accept={UPLOAD_ACCEPT}
                    tabIndex={-1}
                    aria-hidden="true"
                    className="sr-only"
                    onChange={(event) => {
                        setSelectedFileName(event.target.files?.[0]?.name ?? "");
                        setMessage("");
                        setError("");
                    }}
                />

                <div className="flex flex-wrap items-center gap-3">
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        aria-labelledby="content-file-label content-file-choose"
                        aria-describedby="content-file-name content-file-help"
                        className="rounded-full border border-stone-300 bg-white px-5 py-2.5 max-lg:py-3 text-sm font-medium text-stone-700 transition hover:border-stone-500 hover:text-stone-900 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        <span id="content-file-choose">选择文件</span>
                    </button>
                    <span id="content-file-name" className="min-w-0 break-all text-sm text-stone-600">
                        {selectedFileName || "未选择文件"}
                    </span>
                </div>

                <p id="content-file-help" className="mt-2 text-xs leading-6 text-stone-500">
                    可以上传{UPLOAD_TYPES_LABEL}。单个文件最大 100MB。
                </p>

                <button
                    type="button"
                    onClick={handleUploadFile}
                    disabled={isUploading}
                    className="mt-3 rounded-full bg-stone-900 px-5 py-2.5 max-lg:py-3 text-sm font-medium text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:bg-stone-400"
                >
                    {isUploading ? "正在上传..." : "上传文件"}
                </button>
                {resourceUrl && !uploadedFileName && (
                    <div className="mt-4 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-600">
                        <p className="font-medium text-stone-700">当前已有文件</p>

                        <a
                            href={resourceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1 block break-all text-xs leading-6 text-stone-500 underline"
                        >
                            {resourceUrl}
                        </a>

                        <p className="mt-2 text-xs leading-6 text-stone-500">
                            如果不重新上传文件，保存时会继续保留当前文件。
                        </p>
                    </div>
                )}
            </div>

            {uploadedFileName && (
                <div className="rounded-2xl border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-700">
                    文件已上传成功：{uploadedFileName}
                </div>
            )}

            {/* Always present, so screen readers announce upload results as they appear. */}
            <div role="status" aria-live="polite">
                {message && (
                    <p className="rounded-2xl bg-green-50 px-4 py-3 text-sm text-green-700">
                        {message}
                    </p>
                )}
            </div>

            {error && (
                <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                </p>
            )}
        </div>
    );
}