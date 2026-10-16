// Content editor form rules shared by the admin pages (server actions) and the
// client form. No database access and no Prisma import, so the client bundle can
// use the constants; src/lib/contentSave.ts does the writes.

export const CONTENT_TYPE_OPTIONS = [
  { value: "recording", label: "录音" },
  { value: "article", label: "文章" },
  { value: "file", label: "文件" },
  { value: "music", label: "音乐音频" },
  { value: "image", label: "图片" },
  { value: "link", label: "链接" },
] as const;

// Series select value that keeps an older Content's free-text series name (one with
// no linked Series) instead of clearing it.
export const KEEP_LEGACY_SERIES = "__keep-legacy-series__";

export const CONTENT_MESSAGES = {
  titleRequired: "请填写内容标题。",
  bodyRequired: "请填写主要内容。",
  typeInvalid: "请选择有效的内容类型。",
  dateInvalid: "日期格式不正确，请重新选择日期。",
  speakerDisabled: (name: string) => `讲员“${name}”已停用，不能用于保存内容。请换一个讲员名称，或留空。`,
  seriesInvalid: "所选系列已不存在或已停用，请重新选择系列。",
  contentMissing: "这条内容不存在或已被删除，无法保存。",
  saveFailed: "保存失败，请稍后再试。已填写的内容仍保留在表单中。",
  seriesTitleRequired: "请填写系列名称。",
  seriesDuplicate: (title: string) => `已有同名系列“${title}”，请使用其他名称。`,
  seriesDuplicateDisabled: (title: string) => `已有同名系列“${title}”（目前已停用），请使用其他名称。`,
} as const;

export type ContentFormValues = {
  title: string;
  contentType: string;
  date: string;
  speaker: string;
  seriesId: string;
  resourceUrl: string;
  contentBody: string;
  tags: string;
};

export type ContentFormState = {
  error: string | null;
  values: ContentFormValues | null;
  // Changes on every refused save, so the form can move focus to the message again.
  attempt: number;
};

export const INITIAL_CONTENT_FORM_STATE: ContentFormState = { error: null, values: null, attempt: 0 };

export type ValidContent = {
  title: string;
  contentType: string;
  date: string;
  speaker: string;
  seriesId: string;
  resourceUrl: string | null;
  contentBody: string;
  description: string;
  tagsText: string;
};

export function normalizeKey(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export function todayInHalifax(now: Date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Halifax",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function field(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export function readContentForm(formData: FormData): ContentFormValues {
  return {
    title: field(formData, "title"),
    contentType: field(formData, "contentType"),
    date: field(formData, "date"),
    speaker: field(formData, "speaker"),
    seriesId: field(formData, "seriesId"),
    resourceUrl: field(formData, "resourceUrl"),
    contentBody: field(formData, "contentBody"),
    tags: field(formData, "tags"),
  };
}

function isCalendarDate(value: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d;
}

export function toJsonArrayText(text: string) {
  const items = text
    .split(/[,，、\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
  return JSON.stringify(items);
}

// Summary shown in lists: the first 120 characters of the main text (code points,
// so an emoji is never cut in half).
export function summarize(contentBody: string) {
  const chars = Array.from(contentBody);
  return chars.length > 120 ? `${chars.slice(0, 120).join("")}...` : contentBody;
}

export function searchKeywords(title: string | null, speaker: string | null, series: string | null) {
  return [title ?? "", speaker ?? "", series ?? ""].map((item) => item.trim()).filter(Boolean);
}

export function searchKeywordsText(title: string | null, speaker: string | null, series: string | null) {
  return JSON.stringify(searchKeywords(title, speaker, series));
}

export function validateContentForm(
  values: ContentFormValues,
  today: string
): { ok: true; value: ValidContent } | { ok: false; error: string } {
  if (!values.title) return { ok: false, error: CONTENT_MESSAGES.titleRequired };
  if (!CONTENT_TYPE_OPTIONS.some((option) => option.value === values.contentType)) {
    return { ok: false, error: CONTENT_MESSAGES.typeInvalid };
  }
  const date = values.date || today;
  if (!isCalendarDate(date)) return { ok: false, error: CONTENT_MESSAGES.dateInvalid };
  if (!values.contentBody) return { ok: false, error: CONTENT_MESSAGES.bodyRequired };

  return {
    ok: true,
    value: {
      title: values.title,
      contentType: values.contentType,
      date,
      speaker: values.speaker,
      seriesId: values.seriesId,
      resourceUrl: values.resourceUrl || null,
      contentBody: values.contentBody,
      description: summarize(values.contentBody),
      tagsText: toJsonArrayText(values.tags),
    },
  };
}
