// Bounded JSON request bodies for the public Share routes. Relative imports only,
// so it can be compiled and tested on its own.

export type JsonObjectResult =
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; status: 400 | 413; error: string };

export const BODY_TOO_LARGE_ERROR = "提交的内容过大。";
export const BODY_MALFORMED_ERROR = "请求格式不正确。";

const tooLarge = (): JsonObjectResult => ({ ok: false, status: 413, error: BODY_TOO_LARGE_ERROR });
const malformed = (): JsonObjectResult => ({ ok: false, status: 400, error: BODY_MALFORMED_ERROR });

// Reads a JSON object of at most maxBytes. A declared Content-Length above the limit
// is refused without reading; otherwise the stream is cut off as soon as it passes
// the limit, so an oversized body is never buffered in full or parsed.
export async function readJsonObject(request: Request, maxBytes: number): Promise<JsonObjectResult> {
  const declared = request.headers.get("content-length");
  if (declared !== null) {
    if (!/^\d+$/.test(declared.trim())) return malformed();
    if (Number(declared) > maxBytes) return tooLarge();
  }
  if (!request.body) return malformed();

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => undefined);
        return tooLarge();
      }
      chunks.push(value);
    }
  } catch {
    return malformed();
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    return malformed();
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return malformed();
  return { ok: true, value: parsed as Record<string, unknown> };
}
