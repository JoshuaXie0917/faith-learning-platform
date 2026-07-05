"use client";

import { upload } from "@vercel/blob/client";
import type { PutBlobResult } from "@vercel/blob";
import { useRef, useState } from "react";

const MAX_AUDIO_SIZE = 100 * 1024 * 1024;

const allowedExtensions = [".mp3", ".m4a", ".wav", ".ogg", ".aac"];

type AudioBlobUploadFieldProps = {
  inputClass: string;
};

function getSafeFileName(fileName: string) {
  const extension = fileName.includes(".")
    ? fileName.slice(fileName.lastIndexOf(".")).toLowerCase()
    : "";

  const baseName = fileName
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

  return `${baseName || "audio"}${extension}`;
}

function hasAllowedExtension(fileName: string) {
  const lowerName = fileName.toLowerCase();

  return allowedExtensions.some((extension) => lowerName.endsWith(extension));
}

function formatSize(size: number) {
  return `${(size / 1024 / 1024).toFixed(1)}MB`;
}

export function AudioBlobUploadField({ inputClass }: AudioBlobUploadFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [resourceUrl, setResourceUrl] = useState("");
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleUploadAudio() {
    const file = fileInputRef.current?.files?.[0];

    setMessage("");
    setError("");

    if (!file) {
      setError("请先选择一个音频文件。");
      return;
    }

    if (!hasAllowedExtension(file.name)) {
      setError("只支持 mp3、m4a、wav、ogg 或 aac 音频文件。");
      return;
    }

    if (file.size > MAX_AUDIO_SIZE) {
      setError(
        `音频文件不能超过 100MB。当前文件大小是 ${formatSize(file.size)}。请压缩或拆分后再上传。`
      );
      return;
    }

    setIsUploading(true);

    try {
      const safeFileName = getSafeFileName(file.name);
      const pathname = `audio/${Date.now()}-${safeFileName}`;

      const blob: PutBlobResult = await upload(pathname, file, {
        access: "public",
        handleUploadUrl: "/api/blob/upload",
      });

      setResourceUrl(blob.url);
      setUploadedFileName(file.name);
      setMessage("文件已上传成功，发布内容时会自动保存。");
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "音频上传失败，请稍后再试。"
      );
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="space-y-5">
      <input type="hidden" name="resourceUrl" value={resourceUrl} />

      {resourceUrl && (
        <div className="rounded-2xl border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-700">
          文件已上传成功：{uploadedFileName || "音频文件"}
        </div>
      )}

      <div>
        <label className="mb-2 block text-sm font-medium text-stone-700">
          上传音频文件
        </label>

        <input
          ref={fileInputRef}
          type="file"
          accept=".mp3,.m4a,.wav,.ogg,.aac,audio/*"
          className={inputClass}
        />

        <p className="mt-2 text-xs leading-6 text-stone-400">
          支持 mp3、m4a、wav、ogg、aac。单个文件最大 100MB；超过限制请压缩或拆分后上传。
        </p>

        <button
          type="button"
          onClick={handleUploadAudio}
          disabled={isUploading}
          className="mt-3 rounded-full bg-stone-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:bg-stone-400"
        >
          {isUploading ? "正在上传..." : "上传文件"}
        </button>

        {message && (
          <p className="mt-3 rounded-2xl bg-green-50 px-4 py-3 text-sm text-green-700">
            {message}
          </p>
        )}

        {error && (
          <p className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}