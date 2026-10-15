// Share input rules. The API enforces them; the form uses the same counter for its
// live "x/800" display. No Node.js APIs and relative imports only.
//
// Lengths count user-perceived characters (Unicode grapheme clusters): an emoji
// sequence such as 👨‍👩‍👧, 👍🏽 or 🇨🇦, or a letter with combining marks such as é,
// counts as one. Punctuation, spaces and line breaks count as well.

export const SHARE_NAME_MAX = 50;
export const SHARE_TITLE_MAX = 100;
export const SHARE_CONTENT_MAX = 800;
// Hard limit for the whole JSON body of POST /api/shares (all fields together).
// 800 characters of even the longest emoji sequences fit well below it.
export const SHARE_BODY_MAX_BYTES = 64 * 1024;
// Bodies of the Share delete and favorite routes only carry a visitor key.
export const SHARE_SMALL_BODY_MAX_BYTES = 2 * 1024;
export const VISITOR_KEY_MAX = 120;

export const SHARE_CONTENT_LIMIT_MESSAGE = "分享内容最多 800 字（标点、空格和表情都计入）。";

const segmenter =
  typeof Intl !== "undefined" && typeof Intl.Segmenter === "function"
    ? new Intl.Segmenter("zh", { granularity: "grapheme" })
    : null;

// Number of user-perceived characters, counting no further than `stopAfter`.
export function countCharacters(text: string, stopAfter = Number.POSITIVE_INFINITY): number {
  if (!segmenter) return Math.min(Array.from(text).length, stopAfter);
  let count = 0;
  for (const segment of segmenter.segment(text)) {
    void segment;
    count += 1;
    if (count >= stopAfter) break;
  }
  return count;
}

export function exceedsCharacters(text: string, max: number): boolean {
  // Every character is at least one UTF-16 unit, so short strings cannot exceed it.
  if (text.length <= max) return false;
  return countCharacters(text, max + 1) > max;
}

// Control characters (C0/C1); content may keep line breaks and tabs.
const CONTROL = /\p{Cc}/u;
const CONTROL_EXCEPT_LINE_BREAK_AND_TAB = /[^\P{Cc}\n\t]/u;
// Content must contain at least one letter, number or emoji (flags included), not
// only punctuation and spaces.
const MEANINGFUL = /[\p{L}\p{N}\p{Extended_Pictographic}\p{Regional_Indicator}]/u;

export type ShareInput = { visitorKey: string; name: string; title: string; content: string };
export type ShareInputResult = { ok: true; value: ShareInput } | { ok: false; error: string };

export function normalizeShareVisitorKey(value: unknown): string {
  return typeof value === "string" ? value.trim().slice(0, VISITOR_KEY_MAX) : "";
}

const text = (value: unknown) => (typeof value === "string" ? value : "");

export function validateShareInput(body: Record<string, unknown>): ShareInputResult {
  const visitorKey = normalizeShareVisitorKey(body.visitorKey);
  const name = text(body.name).trim();
  const title = text(body.title).trim();
  const content = text(body.content).replace(/\r\n?/g, "\n").trim();
  const fail = (error: string): ShareInputResult => ({ ok: false, error });

  if (!visitorKey) return fail("缺少浏览器标识，无法发布分享。");
  if (!name) return fail("请填写姓名。");
  if (!title) return fail("请填写分享主题。");
  if (!content) return fail("请填写分享内容。");
  if (CONTROL.test(name) || CONTROL.test(title) || CONTROL_EXCEPT_LINE_BREAK_AND_TAB.test(content)) {
    return fail("内容包含无法显示的控制字符。");
  }
  if (exceedsCharacters(name, SHARE_NAME_MAX)) return fail(`姓名最多 ${SHARE_NAME_MAX} 个字。`);
  if (exceedsCharacters(title, SHARE_TITLE_MAX)) return fail(`分享主题最多 ${SHARE_TITLE_MAX} 个字。`);
  if (!MEANINGFUL.test(content)) return fail("分享内容需要包含文字。");
  if (exceedsCharacters(content, SHARE_CONTENT_MAX)) return fail(SHARE_CONTENT_LIMIT_MESSAGE);

  return { ok: true, value: { visitorKey, name, title, content } };
}
