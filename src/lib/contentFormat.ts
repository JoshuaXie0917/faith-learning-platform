export const contentTypeLabels: Record<string, string> = {
  recording: "录音",
  article: "文章",
  file: "文件",
  music: "音乐音频",
  image: "图片",
  link: "链接",
};

export const statusLabels: Record<string, string> = {
  published: "已发布",
  draft: "草稿",
  archived: "已下架",
};

export function getContentTypeLabel(type: string) {
  return contentTypeLabels[type] ?? "学习内容";
}

export function getStatusLabel(status: string) {
  return statusLabels[status] ?? status;
}

export function parseJsonTextArray(value: string | null | undefined) {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);

    if (Array.isArray(parsed)) {
      return parsed.filter((item) => typeof item === "string");
    }

    return [];
  } catch {
    return value
      .split(/[,，、\n]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
}

export function formatContentDate(date: Date | string | null | undefined) {
  if (!date) return "—";

  return new Date(date).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}