// The anonymous visitor key works like a password for a visitor's favorites and
// own Shares, so reads send it in this header instead of the URL, which keeps it
// out of request logs. No Node.js or browser-only APIs: used by pages and routes.

export const VISITOR_KEY_HEADER = "X-Visitor-Key";

const HEADER_SAFE = /^[\x21-\x7e]{1,120}$/;

// Browser: headers for a fetch() that reads data for this visitor.
export function visitorKeyHeaders(visitorKey: string): Record<string, string> {
  return HEADER_SAFE.test(visitorKey) ? { [VISITOR_KEY_HEADER]: visitorKey } : {};
}

// Server: the header first. The visitorKey query parameter is still accepted for
// pages that were opened before the header was introduced.
export function requestVisitorKey(request: Request): string {
  const header = request.headers.get(VISITOR_KEY_HEADER);
  if (header !== null && header.trim()) return header;
  return new URL(request.url).searchParams.get("visitorKey") ?? "";
}
