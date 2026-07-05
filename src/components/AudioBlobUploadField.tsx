"use client";

import { upload } from "@vercel/blob/client";
import type { PutBlobResult } from "@vercel/blob";
import { useRef, useState } from "react";

const MAX_FILE_SIZE = 100 * 1024 * 1024;

type AudioBlobUploadFieldProps = {
  inputClass: string;
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

export function AudioBlobUploadField({ inputClass }: AudioBlobUploadFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [resourceUrl, setResourceUrl] = useState("");
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleUploadFile() {
    const file = fileInputRef.current?.files?.[0];

    setMessage("");
    setError("");

    if (!file) {
      setError("请先选择一个文件。");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError(
        `文件不能超过 100MB。当前文件大小是 ${formatSize(file.size)}。请压缩或拆分后再上传。`
      );
      return;
    }

    setIsUploading(true);

    try {
      const safeExtension = getSafeExtension(file.name);
      const pathname = `resources/${crypto.randomUUID()}${safeExtension}`;
      const contentType = file.type || "application/octet-stream";

      // 关键：不要把原始 File 直接传给 Vercel Blob。
      // 中文文件名可能会导致浏览器 fetch header 报 Invalid value。
      // 这里转成 Blob，只保留文件内容和 contentType，不带原始中文文件名。
      const uploadBody = file.slice(0, file.size, contentType);

      const blob: PutBlobResult = await upload(pathname, uploadBody, {
        access: "public",
        handleUploadUrl: "/api/blob/upload",
        contentType,
      });

      setResourceUrl(blob.url);
      setUploadedFileName(file.name);
      setMessage("文件已上传成功，发布内容时会自动保存。");
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "文件上传失败，请稍后再试。"
      );
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="space-y-4 rounded-3xl border border-stone-200 bg-stone-50 p-4 sm:p-5">
      <input type="hidden" name="resourceUrl" value={resourceUrl} />

      <div>
        <label className="mb-2 block text-sm font-medium text-stone-700">
          上传文件
        </label>

        <input ref={fileInputRef} type="file" className={inputClass} />

        <p className="mt-2 text-xs leading-6 text-stone-400">
          可以上传音频、图片、PDF、Word、PPT 或其他学习资料。单个文件最大 100MB。
        </p>

        <button
          type="button"
          onClick={handleUploadFile}
          disabled={isUploading}
          className="mt-3 rounded-full bg-stone-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:bg-stone-400"
        >
          {isUploading ? "正在上传..." : "上传文件"}
        </button>
      </div>

      {uploadedFileName && (
        <div className="rounded-2xl border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-700">
          文件已上传成功：{uploadedFileName}
        </div>
      )}

      {message && (
        <p className="rounded-2xl bg-green-50 px-4 py-3 text-sm text-green-700">
          {message}
        </p>
      )}

      {error && (
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}