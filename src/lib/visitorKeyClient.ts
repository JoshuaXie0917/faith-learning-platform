import { VISITOR_KEY_COOKIE } from "./contentRetention";

// Browser-only helpers for the anonymous visitor key. The key lives in local
// storage; a copy in a first-party cookie lets server-rendered pages show overdue
// Content to visitors who favorited it. Relative imports only, so this can be tested.

const STORAGE_KEY = "readVisitorKey";
const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60;

function readVisitorCookie(): string | null {
  for (const part of document.cookie.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === VISITOR_KEY_COOKIE) {
      try {
        return decodeURIComponent(rest.join("="));
      } catch {
        return null;
      }
    }
  }
  return null;
}

function writeVisitorCookie(key: string) {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${VISITOR_KEY_COOKIE}=${encodeURIComponent(key)}; Path=/; Max-Age=${ONE_YEAR_SECONDS}; SameSite=Lax${secure}`;
}

// Returns the visitor key, creating it if needed, and refreshes the cookie copy.
export function getOrCreateVisitorKey() {
  let key = localStorage.getItem(STORAGE_KEY);

  if (!key) {
    key =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `visitor-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(STORAGE_KEY, key);
  }

  writeVisitorCookie(key);

  return key;
}

// Copies an existing key into the cookie without creating one. Returns true only
// when the cookie was missing or different and now holds the key, meaning a page
// rendered on the server may have been rendered without it.
export function syncVisitorKeyCookie(): boolean {
  let key: string | null = null;
  try {
    key = localStorage.getItem(STORAGE_KEY);
  } catch {
    return false;
  }
  if (!key || readVisitorCookie() === key) return false;

  writeVisitorCookie(key);
  return readVisitorCookie() === key;
}

// Server-rendered pages whose Content depends on the visitor cookie (Content detail,
// series list and series detail). The other /sermons pages and the dashboard load
// their Content in the browser after setting the cookie themselves.
export function isVisitorRenderedPath(pathname: string) {
  return (
    pathname.startsWith("/sermons/") &&
    pathname !== "/sermons/share" &&
    pathname !== "/sermons/shares" &&
    !pathname.startsWith("/sermons/share/")
  );
}
