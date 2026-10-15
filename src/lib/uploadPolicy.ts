// What the admin may upload as a learning resource (no Node.js APIs, so the form
// can use it too). The upload route puts the list into the Vercel Blob client
// token, and Blob enforces it and the size limit when the file is uploaded.
// HTML, SVG, scripts and executables are not accepted.

export const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;

export const ALLOWED_UPLOAD_CONTENT_TYPES = [
  "audio/*",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
];

// For the file picker; the content type check above is what is enforced.
export const UPLOAD_ACCEPT = [
  "audio/*",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".pdf",
  ".doc",
  ".docx",
  ".ppt",
  ".pptx",
  ".txt",
].join(",");

export const UPLOAD_TYPES_LABEL = "音频、图片（JPG、PNG、WebP、GIF）、PDF、Word、PPT 或 TXT 文件";

export function isAllowedUploadType(contentType: string): boolean {
  const type = contentType.trim().toLowerCase();
  if (!type) return false;
  return ALLOWED_UPLOAD_CONTENT_TYPES.some((allowed) =>
    allowed.endsWith("/*") ? type.startsWith(allowed.slice(0, -1)) : type === allowed
  );
}
