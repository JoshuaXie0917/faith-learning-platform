import { VISITOR_KEY_COOKIE } from "@/lib/contentRetention";

const STORAGE_KEY = "readVisitorKey";
const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60;

// Browser-only. Returns the anonymous visitor key and mirrors it into a cookie, so
// server-rendered pages can apply favorite-based visibility for this visitor.
export function getOrCreateVisitorKey() {
  let key = localStorage.getItem(STORAGE_KEY);

  if (!key) {
    key =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `visitor-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(STORAGE_KEY, key);
  }

  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${VISITOR_KEY_COOKIE}=${encodeURIComponent(key)}; Path=/; Max-Age=${ONE_YEAR_SECONDS}; SameSite=Lax${secure}`;

  return key;
}
