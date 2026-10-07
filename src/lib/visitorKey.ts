import { cookies } from "next/headers";
import { normalizeVisitorKey, VISITOR_KEY_COOKIE } from "@/lib/contentRetention";

// The browser's visitor key, mirrored into a cookie by getOrCreateVisitorKey() so
// server-rendered pages can show overdue Content to visitors who favorited it.
export async function getRequestVisitorKey() {
  const cookieStore = await cookies();
  return normalizeVisitorKey(cookieStore.get(VISITOR_KEY_COOKIE)?.value);
}
