"use client";

import { useEffect } from "react";
import { isVisitorRenderedPath, syncVisitorKeyCookie } from "@/lib/visitorKeyClient";

const RELOAD_GUARD = "visitorKeyCookieReloaded";

// Mounted once in the root layout, so every entry path copies an existing visitor
// key into the cookie. If the cookie was missing and this page was rendered on the
// server for the visitor (for example a direct link to an overdue favorited Content
// item), the page is reloaded once so the server can render it with the cookie.
export function VisitorKeySync() {
  useEffect(() => {
    if (!syncVisitorKeyCookie()) return;
    if (!isVisitorRenderedPath(window.location.pathname)) return;

    try {
      if (sessionStorage.getItem(RELOAD_GUARD)) return;
      sessionStorage.setItem(RELOAD_GUARD, "1");
    } catch {
      return;
    }

    window.location.reload();
  }, []);

  return null;
}
