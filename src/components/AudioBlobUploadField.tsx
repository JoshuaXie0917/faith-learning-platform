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
  const [uploadPassword, setUploadPassword] = useState("");
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

    if (!uploadPassword.trim()) {
      setError("请填写管理员密码后再上传音频。");
      return;
    }

    setIsUploading(true);

    try {
      const safeFileName = getSafeFileName(file.name);
      const pathname = `audio/${Date.now()}-${safeFileName}`;

      const blob: PutBlobResult = await upload(pathname, file, {
        access: "public",
        handleUploadUrl: "/api/blob/upload",
        clientPayload: JSON.stringify({
          uploadPassword: uploadPassword.trim(),
        }),
      });

      setResourceUrl(blob.url);
      setMessage("音频上传成功，资源链接已自动填写。");
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
      <div>
        <label className="mb-2 block text-sm font-medium text-stone-700">
          资源链接
        </label>

        <input
          suppressHydrationWarning
          name="resourceUrl"
          type="text"
          value={resourceUrl}
          onChange={(event) => {
            setResourceUrl(event.target.value);
            setMessage("");
            setError("");
          }}
          placeholder="音频上传成功后会自动填写，也可以手动粘贴外部链接"
          className={inputClass}
        />

        <p className="mt-2 text-xs leading-6 text-stone-400">
          可以手动填写音频链接，也可以在下面上传音频文件。发布内容时，系统只保存这个资源链接。
        </p>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-stone-700">
          管理员上传密码
        </label>

        <input
          type="password"
          value={uploadPassword}
          onChange={(event) => {
            setUploadPassword(event.target.value);
            setMessage("");
            setError("");
          }}
          placeholder="上传音频前请再次输入管理员密码"
          className={inputClass}
        />
      </div>

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
          {isUploading ? "正在上传音频..." : "上传音频并生成链接"}
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