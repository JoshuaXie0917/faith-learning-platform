export type ContentType =
  | "recording"
  | "article"
  | "file"
  | "music"
  | "image"
  | "link";

export const contentTypeOptions: {
  value: ContentType;
  label: string;
  aliases: string[];
}[] = [
  {
    value: "recording",
    label: "录音",
    aliases: ["录音", "讲道录音", "音频", "mp3", "audio"],
  },
  {
    value: "article",
    label: "文章",
    aliases: ["文章", "文字", "阅读", "文稿", "article"],
  },
  {
    value: "file",
    label: "文件",
    aliases: ["文件", "资料", "附件", "pdf", "文档", "报告", "file"],
  },
  {
    value: "music",
    label: "音乐音频",
    aliases: ["音乐", "诗歌", "敬拜", "歌曲", "music", "song"],
  },
  {
    value: "image",
    label: "图片",
    aliases: ["图片", "图像", "照片", "海报", "image", "photo"],
  },
  {
    value: "link",
    label: "链接",
    aliases: ["链接", "网址", "外部链接", "url", "link"],
  },
];

export function getContentTypeLabel(type?: ContentType) {
  return (
    contentTypeOptions.find((item) => item.value === type)?.label ?? "学习内容"
  );
}

export function getContentTypeAliases(type?: ContentType) {
  return contentTypeOptions.find((item) => item.value === type)?.aliases ?? [];
}