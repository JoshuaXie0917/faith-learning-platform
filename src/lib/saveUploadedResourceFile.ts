import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

const MAX_FILE_SIZE = 50 * 1024 * 1024;

const allowedMimePrefixes = ["audio/", "image/"];

const allowedMimeTypes = [
  "application/pdf",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
];

function getSafeExtension(file: File) {
  const extension = path.extname(file.name).toLowerCase();

  if (extension && /^[a-z0-9.]+$/.test(extension)) {
    return extension;
  }

  if (file.type.startsWith("audio/")) return ".mp3";
  if (file.type.startsWith("image/")) return ".png";
  if (file.type === "application/pdf") return ".pdf";
  if (file.type === "text/plain") return ".txt";

  return "";
}

export async function saveUploadedResourceFile(
  fileValue: FormDataEntryValue | null
) {
  if (!(fileValue instanceof File) || fileValue.size === 0) {
    return null;
  }

  if (fileValue.size > MAX_FILE_SIZE) {
    throw new Error("文件不能超过 50MB。");
  }

  const isAllowed =
    allowedMimePrefixes.some((prefix) => fileValue.type.startsWith(prefix)) ||
    allowedMimeTypes.includes(fileValue.type);

  if (!isAllowed) {
    throw new Error("暂时只支持音频、图片、PDF、Word、PPT 和文本文件。");
  }

  const uploadsDir = path.join(process.cwd(), "public", "uploads");

  await mkdir(uploadsDir, { recursive: true });

  const extension = getSafeExtension(fileValue);
  const fileName = `${Date.now()}-${randomUUID()}${extension}`;
  const filePath = path.join(uploadsDir, fileName);

  const buffer = Buffer.from(await fileValue.arrayBuffer());

  await writeFile(filePath, buffer);

  return `/uploads/${fileName}`;
}